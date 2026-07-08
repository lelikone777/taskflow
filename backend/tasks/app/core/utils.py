import smtplib
from email.mime.multipart import MIMEMultipart
from enum import StrEnum

import filetype
from core import constants
from core.config import settings
from fastapi import HTTPException, UploadFile, status
from fastapi.exceptions import RequestValidationError
from jinja2 import Template
from models.taskflow import Task
from pytz import timezone

NOT_ALLOWED_FILE_TYPE = {
    "type": "Ошибка валидации",
    "field": "file",
    "msg": constants.NOT_ALLOWED_FILE_TYPE,
}

NOT_ALLOWED_FILE_SIZE = {
    "type": "Ошибка валидации",
    "field": "file",
    "msg": constants.NOT_ALLOWED_FILE_SIZE,
}


async def validate_file(
    file: UploadFile, allow_file_size: int, expected_types: list[str]
) -> None:
    """Валидировать файл."""

    content = await file.read()
    if len(content) > allow_file_size:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=NOT_ALLOWED_FILE_SIZE,
        )
    # if file.size > constants.AVATAR_ALLOWABLE_FILE_SIZE:
    #     raise HTTPException(
    #         status_code=400,
    #         detail=NOT_ALLOWED_FILE_SIZE,
    #     )

    kind = filetype.guess(content[:2048])

    if kind is not None:
        file_type = kind.mime
    else:
        try:
            content[:2048].decode("utf-8")
            file_type = "text/plain"
        except UnicodeDecodeError:
            file_type = "application/octet-stream"

    if file_type not in expected_types:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=NOT_ALLOWED_FILE_TYPE,
        )

    await file.seek(0)


async def validate_file_extension(file: UploadFile, allow_extensions: StrEnum) -> str:
    """Валидировать и вернуть расширение файла."""

    if not file.filename or "." not in file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "type": "Ошибка валидации",
                "field": "file",
                "msg": constants.NOT_ALLOWED_FILE_NAME,
            }
        )

    extension: str = file.filename.rsplit(".", 1)[-1].lower()
    try:
        mime_type = allow_extensions(extension)
        return mime_type
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "type": "Ошибка валидации",
                "field": "file",
                "msg": constants.NOT_ALLOWED_FILE_EXTENTION,
            }
        ) from None


def create_email_content(task: Task, template: Template) -> str:
    """
    Создать контент для электронного письма.
    Args:
        task (Task): Задача относительного которой создается письмо.
    Returns:
        str: Форматированная строка с шаблоном письма.
    """

    user_timezone = task.tasklist.project.user.timezone

    html_content = template.render(
        task_name=task.name,
        project_name=task.tasklist.project.name,
        task_deadline=task.deadline.astimezone(timezone(user_timezone)).strftime(
            "%Y-%m-%d %H:%M"
        ),
        task_link=f"{settings.HOST_URL}"
        f"/project/{task.tasklist.project.id}"
        f"?taskId={task.id}",
    )

    return html_content


def send_mail(message: MIMEMultipart) -> None:
    """
    Отправить письмо по электронной почте.

    Args:
    message (MIMEMultipart): Сообщение для отправки.
    """
    smtp = smtplib.SMTP(
        settings.email_settings.EMAIL_HOST,
        settings.email_settings.EMAIL_PORT,
        timeout=5,
    )
    smtp.starttls()
    smtp.login(
        settings.email_settings.EMAIL_USERNAME, settings.email_settings.EMAIL_PASSWORD
    )
    try:
        smtp.send_message(message)
    except smtplib.SMTPRecipientsRefused:
        raise ValueError("Несуществующий адрес электронной почты.") from None
    except smtplib.SMTPException as e:
        raise OSError(f"Ошибка SMTP: {e}") from e
    finally:
        smtp.quit()


async def format_error_detail(exc: RequestValidationError) -> list:
    formated_errors = []
    for err in exc.errors():
        if err["type"] == "value_error" and err["ctx"].get("error"):
            error_detail = err["ctx"]["error"].args[0]
            formated_errors.append(
                {
                    "field": error_detail["field"],
                    "message": error_detail["msg"],
                }
            )
        else:
            formated_errors.append(
                {
                    "field": err["loc"][-1],
                    "message": err["msg"],
                }
            )

    return formated_errors
