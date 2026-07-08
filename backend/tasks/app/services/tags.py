from core import constants
from database.db import connection
from fastapi import HTTPException, status
from models.taskflow import Tag, task_tag
from sqlalchemy import and_, delete, insert, select
from sqlalchemy.engine.result import ChunkedIteratorResult
from sqlalchemy.ext.asyncio import AsyncSession


@connection
async def set_task_tags(
    user_id: int,
    task_id: int,
    current_tag_ids: list[int],
    new_tag_ids: list[int],
    session: AsyncSession,
) -> None:
    """
    Присвоить теги задаче.

    Args:
        user_id (int): Идентификатор пользователя
        task_id (int): Идентификатор задачи
        current_tag_ids (list[int]): Список текущих тегов задачи
        new_tag_ids (list[int]): Список новых тегов задачи
        session (AsyncSession): Сессия доступа к базе данных
    Raises:
        HTTPException: Если новый тег не является тегом пользователя
    """

    current_set: set[int] = set(current_tag_ids)
    new_set: set[int] = set(new_tag_ids.tag_ids)

    tags_to_remove: set[int] = current_set - new_set
    tags_to_add: set[int] = new_set - current_set

    result: list[int] = await session.execute(
        select(Tag.id).where(Tag.user_id == user_id)
    )
    all_tag_ids: set[int] = {row[0] for row in result.all()}

    if not new_set.issubset(all_tag_ids):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "type": "Ошибка доступа",
                "field": "tad_ids",
                "msg": constants.TAGS_NOT_FOUND,
            },
        )

    if tags_to_remove:
        await session.execute(
            delete(task_tag).where(
                and_(
                    task_tag.c.task_id == task_id, task_tag.c.tag_id.in_(tags_to_remove)
                )
            )
        )

    if tags_to_add:
        values_list: dict[str, int] = [
            {"task_id": task_id, "tag_id": tag_id} for tag_id in tags_to_add
        ]
        await session.execute(insert(task_tag).values(values_list))
    await session.commit()


@connection
async def search_tags(
    user_id: int, search_param: str, session: AsyncSession
) -> list[Tag]:
    """
    Найти теги.

    Args:
        user_id (int): Идентификатор пользователя
        search_param (str): Поисковая подстрока
        session (AsyncSession): Сессия доступа к базе данных
    Returns
        Все теги пользователя, имя которых содержит поисковую подстроку
    """

    result: ChunkedIteratorResult = await session.execute(
        select(Tag)
        .where(Tag.user_id == user_id)
        .filter(Tag.name.icontains(search_param))
    )

    return result.scalars().all()
