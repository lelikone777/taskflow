from core.dependency import SubtaskPathDependency, TaskPathDependency
from fastapi import APIRouter, status
from models.taskflow import Subtask
from schemas.subtasks import SubtaskCreate, SubtaskUpdate
from services.base import service

subtask_router = APIRouter(prefix="/{task_id}/subtask")


@subtask_router.post(
    "/", status_code=status.HTTP_201_CREATED, summary="Создать подзадачу"
)
async def create_subtask(
    objects: TaskPathDependency, subtask_model: SubtaskCreate
) -> None:

    subtask_dict = subtask_model.model_dump()
    subtask_dict["task_id"] = objects.task.id
    await service.add(Subtask, subtask_dict)


@subtask_router.patch(
    "/{subtask_id}",
    summary="Обновить подзадачу",
)
async def update_subtask(
    objects: SubtaskPathDependency, subtask_update: SubtaskUpdate
) -> None:

    subtask_dict = {
        column.name: getattr(objects.subtask, column.name)
        for column in Subtask.__table__.columns
    }
    subtask_dict.update(subtask_update.model_dump(exclude_unset=True))
    await service.update(model=Subtask, values=subtask_dict)


@subtask_router.delete(
    "/{subtask_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Удалить подзадачу"
)
async def delete_subtask(
    objects: SubtaskPathDependency,
) -> None:

    await service.delete(Subtask, objects.subtask.id)
