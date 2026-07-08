from typing import Any

from core.dependency import (
    ProjectPathDependency,
    TaskListPathDependency,
)
from fastapi import APIRouter, status
from models.enums import TaskListStatus
from models.taskflow import TaskList
from routers.tasks import task_router
from schemas.tasklist import (
    TaskListCreate,
    TaskListSortRequest,
    TaskListUpdate,
)
from services.base import service
from services.tasklist import done_all_tasks, reorder_tasklist

tasklist_router: APIRouter = APIRouter(prefix="/{project_id}/tasklist")


@tasklist_router.post(
    "/", status_code=status.HTTP_201_CREATED, summary="Создать список задач"
)
async def add_tasklist(
    objects: ProjectPathDependency,
    tasklist_data: TaskListCreate,
) -> None:

    tasklist: dict[str, Any] = tasklist_data.model_dump(exclude_unset=True)
    tasklist["project_id"] = objects.project.id
    queue_numbers: list[int] = [
        task_list.seq_number for task_list in objects.project.tasklists
    ]
    tasklist["seq_number"] = max(queue_numbers) + 1 if queue_numbers else 1
    await service.add(TaskList, tasklist)


@tasklist_router.patch("/{tasklist_id}", summary="Изменить данные списка задач")
async def update_tasklist(
    objects: TaskListPathDependency,
    tasks_list_data: TaskListUpdate,
) -> None:

    update_data: dict[str, Any] = tasks_list_data.model_dump(exclude_unset=True)
    update_data["id"] = objects.tasklist.id
    await service.update(TaskList, update_data)

    if tasks_list_data.status == TaskListStatus.DONE:
        await done_all_tasks(objects.tasklist.id)


@tasklist_router.delete(
    "/{tasklist_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Удалить список задач",
)
async def delete_tasklist(
    objects: TaskListPathDependency,
) -> None:
    await service.delete(TaskList, objects.tasklist.id)


@tasklist_router.patch(
    "/sort/", status_code=status.HTTP_200_OK, summary="Изменить порядок списка задач"
)
async def sort_tasklists(
    objects: ProjectPathDependency,
    sort_data: TaskListSortRequest,
) -> None:
    await reorder_tasklist(
        objects.project,
        sort_data.tasklist_id,
        sort_data.new_previous_tasklist_id or 0,
    )


tasklist_router.include_router(task_router)
