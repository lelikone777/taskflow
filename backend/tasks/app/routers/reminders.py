from typing import Any

from core.dependency import AuthDependency, ReminderPathDependency, TaskPathDependency
from fastapi import APIRouter, status
from fastapi.exceptions import RequestValidationError
from models.taskflow import Reminder
from pydantic import ValidationError
from schemas.reminders import CreateReminder, ReminderUpdate, UserReminders
from services.base import service
from services.reminders import get_user_reminders, update_task_reminders

reminders_router = APIRouter(prefix="/{task_id}/reminders")
user_reminders_router = APIRouter(prefix="/reminders")


@reminders_router.patch(
    "/",
    summary="Создать или изменить напоминание",
    status_code=status.HTTP_201_CREATED
)
async def reminder_create(
    objects: TaskPathDependency, reminder_model: CreateReminder
) -> None:

    try:
        reminder_model.user_timezone = objects.project.user.timezone
        reminder_model.task = objects.task
    except ValidationError as e:
        raise RequestValidationError(e.errors()) from e

    await update_task_reminders(reminder_model)


@user_reminders_router.get(
    "/",
    response_model=UserReminders,
    summary="Получить все напоминания пользователя"
)
async def get_reminders(current_user: AuthDependency) -> UserReminders:

    return await get_user_reminders(current_user)


@user_reminders_router.patch(
    "/{reminder_id}",
    summary="Прочитать напоминание"
)
async def read_reminders(
    reminder: ReminderPathDependency, reminder_read: ReminderUpdate
) -> None:

    update_data: dict[str, Any] = reminder_read.model_dump(exclude_unset=True)
    update_data["id"] = reminder.id
    await service.update(Reminder, update_data)


@user_reminders_router.delete(
    "/{reminder_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Удалить напоминание",
)
async def delete_reminders(
    reminder: ReminderPathDependency,
) -> None:

    await service.delete(Reminder, reminder.id)
