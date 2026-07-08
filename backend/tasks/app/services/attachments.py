from typing import BinaryIO
from uuid import uuid4

from core.config import settings
from core.minio import MinioHandler
from core.utils import validate_file, validate_file_extension
from database.db import connection
from fastapi import HTTPException, status
from models.enums import MIMEType
from models.taskflow import Attachment, Task, task_attachments
from schemas.attachments import AttachmentRead
from services.base import service
from sqlalchemy import insert, select
from sqlalchemy.ext.asyncio import AsyncSession

client = MinioHandler(
    settings.minio_settings.MINIO_URL,
    settings.minio_settings.MINIO_ROOT_USER,
    settings.minio_settings.MINIO_ROOT_PASSWORD,
    "attachments",
)


@connection
async def upload_attachment(
    file: BinaryIO, session: AsyncSession
) -> Attachment:
    """Загрузить вложение в MinIO и создать объект Attachment.

    Args:
        file (BinaryIO): Файл для загрузки
        session (AsyncSession): Экземпляр сессии для доступа к базе данных
    Returns:
        Attachment: Запись таблицы вложений из базы данных
    """
    await validate_file(
        file,
        allow_file_size=settings.ATTACHMENT_ALLOWABLE_FILE_SIZE,
        expected_types=settings.ATTACHMENT_ALLOWABLE_FILE_TYPE,
    )

    mime_type: str = await validate_file_extension(file, MIMEType)
    minio_name: str = str(uuid4())
    object_name: str = f"{minio_name}.{mime_type}"

    await client.check_bucket()

    if await client.check_bucket() and await client.upload_file(
        object_name, file.file, file.size
    ):
        attachment = Attachment(
            filename=file.filename,
            size=file.size,
            minio_name=minio_name,
            mime_type=mime_type,
        )

        session.add(attachment)
        await session.commit()
        return attachment


@connection
async def get_attachment_url(
    attachment_id: int, session: AsyncSession
) -> str | None:
    """
    Получить ссылку на скачивание вложения из MinIO по ID.

    Args:
        attachment_id (int): Идентификатор вложения
        session (AsyncSession): Экземпляр сессии для доступа к базе данных
    Returns:
        str: Ссылка на вложение в хранилище MinIO
    """
    query = select(Attachment).where(Attachment.id == attachment_id)
    result = await session.execute(query)
    attachment = result.scalar_one_or_none()
    if attachment and await client.check_bucket():
        return await client.get_url(
            f"{attachment.minio_name}.{attachment.mime_type.value}"
        )

    return None


async def create_attachments(
    files: list[BinaryIO],
) -> list[AttachmentRead]:
    """
    Создать вложения.

    Загружает список файлов в MinIO и возвращает список вложений.
    Args:
        (files: list[BinaryIO]): Списко файлов
    Returns
        list[AttachmentRead]: Список сериализованных добавленных записей
                               таблицы вложений из базы данных.

    """
    results = []

    for file in files:
        attachment = await upload_attachment(file)
        url = await get_attachment_url(attachment.id)

        results.append(
            AttachmentRead(
                id=attachment.id,
                filename=attachment.filename,
                size=attachment.size,
                url=url,
            )
        )
    return results


@connection
async def attach_attachments_to_task(
    task: Task, attachment_ids: list[int], session: AsyncSession
) -> None:
    """
    Прикрепить вложения к задаче.

    Args:
        task (Task): Задача для прикрпления вложений
        attachment_ids (list[int]): Список идентификаторов вложений
        session (AsyncSession): Экземпляр сессии для доступа к базе данных
    """
    for attachment_id in attachment_ids:
        attachment = await session.get(Attachment, attachment_id)
        if not attachment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "type": "Ошибка доступа.",
                    "field": "attachment_id",
                    "msg": f"Вложение c id={attachment_id} не найдено",
                },
            )
        relation_query = select(task_attachments).where(
            task_attachments.c.task_id == task.id,
            task_attachments.c.attachment_id == attachment_id,
        )
        relation_result = await session.execute(relation_query)
        relation = relation_result.first()

        if not relation:
            await session.execute(
                insert(task_attachments).values(
                    task_id=task.id, attachment_id=attachment_id
                )
            )

    await session.commit()


async def remove_attachment(attachment: Attachment) -> None:
    """
    Удалить вложение из хранилища.

    Args:
        attachment (Attachment): Запись таблицы вложений.
    """
    if await client.remove_file(
        f"{attachment.minio_name}.{attachment.mime_type.value}"
    ):
        await service.delete(Attachment, attachment.id)
