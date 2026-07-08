from typing import Any

from core.dependency import (
    TaskListPathDependency,
    TaskPathDependency,
)
from fastapi import APIRouter, HTTPException, status
from fastapi.exceptions import RequestValidationError
from models.enums import TaskStatus
from models.taskflow import Task, TaskList
from pydantic import ValidationError
from routers.attachments import task_attachments_router
from routers.reminders import reminders_router
from routers.subtask import subtask_router
from routers.tags import task_tags_router
from schemas.tasks import (
    ReminderPeriodic,
    TaskCreate,
    TaskDetail,
    TaskInfoUpdate,
    TaskMove,
    TaskPeriodUpdate,
    TaskStatusUpdate,
)
from services.base import service
from services.reminders import delete_reminder_objects
from services.tasks import done_all_subtasks, get_task_detail

task_router = APIRouter(prefix="/{tasklist_id}/task")


@task_router.post("/", status_code=status.HTTP_201_CREATED, summary="Создать задачу")
async def create_task(objects: TaskListPathDependency, task_model: TaskCreate) -> None:

    task_model.user_timezone = objects.project.user.timezone

    task_dict: dict[str, Any] = task_model.model_dump()
    task_dict["tasklist_id"] = objects.tasklist.id
    await service.add(Task, values=task_dict)


@task_router.get("/{task_id}", response_model=TaskDetail, summary="Детали задачи")
async def get_task(
    objects: TaskPathDependency,
) -> TaskDetail:

    return await get_task_detail(objects.task)


@task_router.patch(
    "/{task_id}", response_model=TaskDetail, summary="Обновить информацию о задаче"
)
async def update_task(
    objects: TaskPathDependency,
    task_update: TaskInfoUpdate,
) -> TaskDetail:

    try:
        task_update.task = objects.task
    except ValidationError as e:
        raise RequestValidationError(e.errors()) from e

    update_data: dict[str, Any] = task_update.model_dump(exclude_unset=True)
    update_data["id"] = objects.task.id
    updated_task: Task = await service.update(Task, update_data)

    return await get_task_detail(updated_task)


@task_router.patch(
    "/{task_id}/period",
    status_code=status.HTTP_200_OK,
    summary="Изменить сроки начала и завершения задачи",
)
async def update_task_period(
    objects: TaskPathDependency,
    task_period: TaskPeriodUpdate,
) -> None:

    try:
        task_period.user_timezone = objects.project.user.timezone
        task_period.task = objects.task
        task_period.project = objects.project
    except ValidationError as e:
        raise RequestValidationError(e.errors()) from e

    valid_data: dict[str, Any] = task_period.model_dump(exclude_unset=True)
    valid_data["id"] = objects.task.id
    valid_data["reminder_datetime"] = None
    valid_data["reminder_periodic"] = ReminderPeriodic.NONE
    await service.update(Task, valid_data)
    await delete_reminder_objects(objects.task.id)


@task_router.patch(
    "/{task_id}/status",
    status_code=status.HTTP_200_OK,
    summary="Изменить статус задачи",
)
async def update_task_status(
    objects: TaskPathDependency,
    task_status: TaskStatusUpdate,
) -> None:

    try:
        task_status.task = objects.task
    except ValidationError as e:
        raise RequestValidationError(e.errors()) from e

    if task_status.status == TaskStatus.DONE:
        await done_all_subtasks(objects.task.id)
        await delete_reminder_objects(objects.task.id)

    valid_data: dict[str, Any] = task_status.model_dump(exclude_unset=True)
    valid_data["id"] = objects.task.id
    await service.update(Task, valid_data)


@task_router.patch(
    "/{task_id}/move",
    status_code=status.HTTP_200_OK,
    summary="Переместить задачу в другой список",
)
async def move_task(
    objects: TaskPathDependency,
    move_data: TaskMove,
) -> None:

    new_tasklist = await service.get(model=TaskList, id=move_data.tasklist_id)
    if not new_tasklist or new_tasklist.project.id != objects.project.id:
        raise HTTPException(
            status_code=404,
            detail={
                "type": "Ошибка валидации",
                "field": "file",
                "msg": (
                    "Список задач для перемещения не найден или находится "
                    "в другом проекте."
                ),
            }
        )
    update_data = move_data.model_dump()
    update_data["id"] = objects.task.id
    await service.update(Task, update_data)


@task_router.delete("/{task_id}", status_code=204, summary="Удалить задачу")
async def delete_task(
    objects: TaskPathDependency,
) -> None:

    await service.delete(model=Task, id=objects.task.id)


task_router.include_router(subtask_router)
task_router.include_router(task_tags_router)
task_router.include_router(task_attachments_router)
task_router.include_router(reminders_router)
