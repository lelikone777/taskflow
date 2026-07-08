from database.db import connection
from fastapi import HTTPException, status
from models.enums import TaskListStatus, TaskStatus
from models.taskflow import Project, Task, TaskList
from services.reminders import delete_reminder_objects
from services.tasks import done_all_subtasks
from sqlalchemy import select, update
from sqlalchemy.engine.result import ChunkedIteratorResult
from sqlalchemy.ext.asyncio import AsyncSession


@connection
async def done_all_tasks(tasklist_id: int, session: AsyncSession) -> None:
    """
    Завершить все задачи в списке задач.

    Args:
        tasklist_id (int): Идентификатор списка задач
        session (AsyncSession): Сессия доступа к базе данных
    """
    await session.execute(
        update(Task)
        .where(Task.tasklist_id == tasklist_id)
        .values(status=TaskStatus.DONE)
    )
    await session.commit()

    # Завершить все подзадачи и удалить напоминания в задачах из списка
    tasks_ids: ChunkedIteratorResult = await session.execute(
        select(Task.id).where(Task.tasklist_id == tasklist_id)
    )
    for task_id in tasks_ids.scalars().all():
        await done_all_subtasks(task_id)
        await delete_reminder_objects(task_id)


@connection
async def reorder_tasklist(
    project: Project,
    tasklist_id: int,
    previous_tasklist_id: int | None,
    session: AsyncSession,
) -> None:
    """
    Изменить порядок списка задач среди активных списков проекта.
    """
    project = await session.merge(project)
    all_tasklists: list[TaskList] = project.tasklists

    current_tasklist = next(
        (item for item in all_tasklists if item.id == tasklist_id), None
    )

    if not current_tasklist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "type": "Ошибка доступа",
                "field": "tad_ids",
                "msg": "Перемещаемый список задач не найден.",
            },
        )

    if current_tasklist.status != TaskListStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "type": "Ошибка доступа",
                "field": "",
                "msg": (
                    "Ручная сортировка доступна только для активных " "списков задач."
                ),
            },
        )

    active_tasklists = [
        item for item in all_tasklists if item.status == TaskListStatus.ACTIVE
    ]

    current_index = next(
        (
            index
            for index, item in enumerate(active_tasklists)
            if item.id == tasklist_id
        ),
        None,
    )

    current_item = active_tasklists.pop(current_index)

    if not previous_tasklist_id:
        active_tasklists.insert(0, current_item)
    else:
        after_item = next(
            (item for item in active_tasklists if item.id == previous_tasklist_id), None
        )
        if not after_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "type": "Ошибка доступа",
                    "field": "tad_ids",
                    "msg": (
                        "Список задач, после которого нужно вставить текущий, "
                        "не найден."
                    ),
                },
            )

        insert_index = (
            next(
                index
                for index, item in enumerate(active_tasklists)
                if item.id == previous_tasklist_id
            )
            + 1
        )
        active_tasklists.insert(insert_index, current_item)

    inactive_task_lists = [
        item for item in all_tasklists if item.status != TaskListStatus.ACTIVE
    ]

    final_tasklists = active_tasklists + inactive_task_lists

    for temp_seq, task_list in enumerate(final_tasklists, start=1):
        task_list.seq_number = -temp_seq

    await session.flush()

    for seq_number, task_list in enumerate(final_tasklists, start=1):
        task_list.seq_number = seq_number

    await session.commit()
