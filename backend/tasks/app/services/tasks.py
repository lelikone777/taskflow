from database.db import connection
from models.enums import SubtaskStatus
from models.taskflow import Subtask, Task
from schemas.tasks import TaskDetail
from services.attachments import get_attachment_url
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession


async def get_task_detail(task_orm: Task) -> TaskDetail | None:
    """
    Получить объект задачи.

    Args:
        task_orm (Task): Объект задачи из базы данных
    Returns:
        TaskDetail: Объект схемы валидации с вычисленными дополнительными
                     полями и ссылками на загруженные файлы
    """

    task: TaskDetail = TaskDetail.model_validate(task_orm)
    task.user_timezone = task_orm.tasklist.project.user.timezone
    for attachment in task.attachments:
        attachment.url = await get_attachment_url(attachment.id)

    return task


@connection
async def done_all_subtasks(task_id: int, session: AsyncSession) -> None:
    """
    Завершить все подзадачи в задаче.

    Args:
        task_id (int): Идентификатор задачи
        session (AsyncSession): Сессия доступа к базе данных
    """

    await session.execute(
        update(Subtask)
        .where(Subtask.task_id == task_id)
        .values(status=SubtaskStatus.DONE)
    )
    await session.commit()
