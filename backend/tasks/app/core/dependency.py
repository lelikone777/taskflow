from typing import Annotated

from core import constants
from fastapi import Depends, HTTPException, Path, Request, UploadFile, status
from fastapi.security import HTTPBearer
from models.taskflow import Attachment, Project, Reminder, Subtask, Tag, Task, TaskList
from models.users import User
from schemas.core import PathObjects
from services.auth import get_token_object_by_access_token, verify_token
from services.base import service
from services.users import get_user_by_token

security = HTTPBearer()

ACCESS_DENIED = {
    "type": "Ошибка доступа.",
    "field": "",
    "msg": constants.ACCESS_DENIED,
}


async def is_authenticate(token_data: Annotated[HTTPBearer, Depends(security)]) -> User:
    """
    Аутентифицировать текущего пользователя по JWT токену.

    Args:
    token_data (str): JWT токен с префиском Bearer.

    Returns:
    user (User): Пользователь соответствующий полученному токену.

    Raises:
    HTTPException: Если токен не найден в базе, не корректен, пользователь
                    не найден или не активен, его id зашифрованный в токене
                    и базе не совпадают.
    """

    token: str = token_data.credentials
    payload: dict = await verify_token(token, "access")
    token_object = await get_token_object_by_access_token(token)
    user: User = await get_user_by_token(token)
    if (
        not user
        or not user.is_active
        or user.id != payload.get("user_id")
        or not token
        or not token_object.is_active
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "type": "Ошибка авторизации.",
                "field": "",
                "msg": constants.ACCESS_ERROR,
            },
        )
    return user


AuthDependency = Annotated[User, Depends(is_authenticate)]


async def check_reminder_url(
    user: AuthDependency,
    reminder_id: int = Path(title="Идентификатор напоминания"),
) -> Reminder:

    reminder: Reminder = await service.get(Reminder, reminder_id)
    if not reminder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "type": "Ошибка доступа",
                "field": "reminder_id",
                "msg": constants.REMINDER_NOT_FOUND,
            },
        )
    if reminder.task.tasklist.project.user_id != user.id:
        raise HTTPException(status_code=403, detail=ACCESS_DENIED)

    return reminder


ReminderPathDependency = Annotated[Reminder, Depends(check_reminder_url)]


async def check_tag_url(
    user: AuthDependency,
    tag_id: int = Path(title="Идентификатор тега"),
) -> Tag:

    tag: Tag = await service.get(Tag, tag_id)
    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "type": "Ошибка доступа",
                "field": "tag_id",
                "msg": constants.TAGS_NOT_FOUND,
            },
        )
    if tag.user_id != user.id:
        raise HTTPException(status_code=403, detail=ACCESS_DENIED)

    return tag


TagPathDependency = Annotated[Tag, Depends(check_tag_url)]


async def check_attachment_url(
    user: AuthDependency,
    attachment_id: int = Path(title="Идентификатор вложения"),
) -> Tag:

    attachment: Attachment = await service.get(Attachment, attachment_id)
    if not attachment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "type": "Ошибка доступа",
                "field": "attachment_id",
                "msg": constants.ATTACHMENT_NOT_FOUND,
            },
        )

    return attachment


AttachmentPathDependency = Annotated[Attachment, Depends(check_attachment_url)]


async def check_project_url(
    user: AuthDependency,
    project_id: int = Path(title="Идентификатор проекта"),
) -> PathObjects:

    project: Project = await service.get(Project, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "type": "Ошибка доступа",
                "field": "project_id",
                "msg": constants.PROJECT_NOT_FOUND,
            },
        )
    if project.user_id != user.id:
        raise HTTPException(status_code=403, detail=ACCESS_DENIED)

    return PathObjects(project=project)


ProjectPathDependency = Annotated[PathObjects, Depends(check_project_url)]


async def check_tasklist_url(
    objects: ProjectPathDependency,
    tasklist_id: int = Path(title="Идентификатор списка задач"),
) -> PathObjects:

    tasklist: TaskList = await service.get(TaskList, tasklist_id)
    if not tasklist or tasklist.project_id != objects.project.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "type": "Ошибка доступа",
                "field": "tasklist_id",
                "msg": constants.TASKLIST_NOT_FOUND,
            },
        )
    objects.tasklist = tasklist

    return objects


TaskListPathDependency = Annotated[PathObjects, Depends(check_tasklist_url)]


async def check_task_url(
    objects: TaskListPathDependency,
    task_id: int = Path(title="Идентификатор задачи"),
) -> PathObjects:

    task: Task = await service.get(Task, task_id)
    if not task or task.tasklist_id != objects.tasklist.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "type": "Ошибка доступа",
                "field": "task_id",
                "msg": constants.TASK_NOT_FOUND,
            },
        )
    objects.task = task

    return objects


TaskPathDependency = Annotated[PathObjects, Depends(check_task_url)]


async def check_subtask_url(
    objects: TaskPathDependency,
    subtask_id: int = Path(title="Идентификатор подзадачи"),
) -> PathObjects:

    subtask: Subtask = await service.get(Subtask, subtask_id)
    if not subtask or subtask.task_id != objects.task.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "type": "Ошибка доступа",
                "field": "subtask_id",
                "msg": constants.SUBTASK_NOT_FOUND,
            },
        )
    objects.subtask = subtask

    return objects


SubtaskPathDependency = Annotated[PathObjects, Depends(check_subtask_url)]


async def single_file_validator(request: Request) -> UploadFile | None:
    """Валидировать аватар."""
    form = await request.form()
    files = form.getlist("file")

    if len(files) > 1:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "type": "Ошибка валидации",
                "field": "file",
                "msg": constants.MORE_ONE_FILE
            }
        )
    return files[0] if files else None
