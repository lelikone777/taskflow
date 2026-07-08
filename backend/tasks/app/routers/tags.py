from typing import Any

from core.dependency import AuthDependency, TagPathDependency, TaskPathDependency
from fastapi import APIRouter, HTTPException, Query, status
from models.taskflow import Tag
from schemas.tags import TagCreate, TagList, TagUpdate, TaskTags
from services.base import service
from services.tags import search_tags, set_task_tags
from sqlalchemy.exc import IntegrityError

tags_router = APIRouter(prefix="/tags")
task_tags_router = APIRouter(prefix="/{task_id}/tags")


@tags_router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    summary="Создать тег"
)
async def add_tag(user: AuthDependency, tags_data: TagCreate) -> None:
    tag_dict: dict[str, Any] = tags_data.model_dump(exclude_unset=True)
    tag_dict["user_id"] = user.id
    try:
        await service.add(Tag, tag_dict)
    except IntegrityError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "type": "Ошибка валидации",
                "field": "name",
                "msg": "Тег с таким названием уже существует",
            }
        ) from e


@tags_router.patch(
    "/{tag_id}",
    summary="Изменить тег"
)
async def update_tag(tag: TagPathDependency, tag_data: TagUpdate) -> None:

    update_data: dict[str, Any] = tag_data.model_dump(exclude_unset=True)
    update_data["id"] = tag.id
    await service.update(Tag, update_data)


@tags_router.get(
    "/",
    response_model=TagList,
    summary="Получить список тегов пользователя"
)
async def get_tags(
    user: AuthDependency,
    q: str = Query(default="", title="Поисковая подстрока")
) -> TagList:

    return TagList(tags=await search_tags(user_id=user.id, search_param=q))


@task_tags_router.patch(
    "/",
    status_code=status.HTTP_200_OK,
    summary="Изменить список тегов задачи"
)
async def update_task_tags(
    user: AuthDependency,
    objects: TaskPathDependency,
    updated_tag_ids: TaskTags
) -> None:

    current_tag_ids: list[int] = [tag.id for tag in objects.task.tags]
    await set_task_tags(
        user_id=user.id,
        task_id=objects.task.id,
        current_tag_ids=current_tag_ids,
        new_tag_ids=updated_tag_ids,
    )
