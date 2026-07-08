from calendar import monthrange
from datetime import datetime, timedelta

from database.db import connection
from models.enums import (
    ReminderChannel,
    ReminderPeriodic,
    ReminderStatus,
)
from models.taskflow import Reminder, Task
from models.users import User
from schemas.reminders import CreateReminder, ReminderInfo, UserReminders
from sqlalchemy import delete, insert, update
from sqlalchemy.ext.asyncio import AsyncSession


async def make_reminders_datetimes(task_dict: dict) -> list[datetime]:
    """
    Создать список дат напоминаний.

    Args:
        task_dict (dict): словарь с полями задачи, содержащий:
            - reminder_datetime (datetime): дата и время первого напоминания
            - reminder_periodic(ReminderPeriodic): периодичность
            - deadline (datetime): Срок завершения задачи
    Returns:
        list[daetime]: Список дат напоминаний
    """
    dates = []

    reminder_periodic = task_dict.get("reminder_periodic")
    start = task_dict.get("reminder_datetime")
    deadline = task_dict.get("deadline")

    current = start
    match reminder_periodic:

        case ReminderPeriodic.NONE:
            dates.append(current)
            return dates

        case ReminderPeriodic.DAILY:
            while current <= deadline:
                dates.append(current)
                current += timedelta(days=1)

        case ReminderPeriodic.WEEKLY:
            while current <= deadline:
                dates.append(current)
                current += timedelta(weeks=1)

        case ReminderPeriodic.MONTHLY:
            while current <= deadline:
                dates.append(current)

                target_day = current.day

                if current.month == 12:
                    new_year = current.year + 1
                    new_month = 1
                else:
                    new_year = current.year
                    new_month = current.month + 1

                last_day = monthrange(new_year, new_month)[1]

                new_day = min(target_day, last_day)
                current = current.replace(
                    year=new_year,
                    month=new_month,
                    day=new_day,
                    hour=current.hour,
                    minute=current.minute,
                )
        case ReminderPeriodic.WEEKDAYS:
            while current <= deadline:
                if current.weekday() < 5:
                    dates.append(current)
                current += timedelta(days=1)

    return dates


@connection
async def delete_reminder_objects(task_id: int, session: AsyncSession) -> None:
    """
    Удалить объект напоминания.

    Args:
        task_id (int): Идентификатор связанной задачи
        session (AsyncSession): Экземпляр сессии для доступа к базе данных
    """
    await session.execute(
        delete(Reminder).where(
            Reminder.task_id == task_id,
            Reminder.status == ReminderStatus.QUEUED
        )
    )
    await session.commit()


@connection
async def update_task_reminders(
    reminder_model: CreateReminder, session: AsyncSession
) -> None:
    """
    Изменить настройки напоминаний и обновить объекты напоминаний задачи.

    Args:
        reminder_model (CreateReminder): Данные настройки напоминаний
        session (AsyncSession): Экземпляр сессии для доступа к базе данных
    """

    task_id = reminder_model.task.id
    task_dict = reminder_model.model_dump()
    task_dict["deadline"] = reminder_model.task.deadline

    await delete_reminder_objects(task_id)

    stmt = update(
        Task
    ).where(
        Task.id == task_id
    ).values(
        **task_dict
    ).returning(
        Task
    )

    await session.execute(stmt)

    dates = await make_reminders_datetimes(task_dict)

    if dates:
        values_list = [
            {
                "send_time": dt,
                "channel": ReminderChannel.EMAIL,
                "status": ReminderStatus.QUEUED,
                "task_id": task_id,
                "was_read": False,
            }
            for dt in dates
        ]
        await session.execute(insert(Reminder).values(values_list))

    await session.commit()


@connection
async def get_user_reminders(
    user: User, session: AsyncSession
) -> UserReminders:

    reminders = []
    for project in user.projects:
        for tasklist in project.tasklists:
            for task in tasklist.tasks:
                for reminder in task.reminders:
                    if reminder.status == ReminderStatus.SENT:
                        reminders.append(ReminderInfo.model_validate(reminder))

    for reminder in reminders:
        reminder.user_timezone = user.timezone

    sorted_reminders = sorted(
        reminders, key=lambda x: x.send_time, reverse=True
    )

    return UserReminders(reminders=sorted_reminders)
