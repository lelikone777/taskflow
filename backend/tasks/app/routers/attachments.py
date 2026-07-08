from core.dependency import AttachmentPathDependency, AuthDependency, TaskPathDependency
from fastapi import APIRouter, File, UploadFile, status
from schemas.attachments import AttachmentsBind, AttachmentsList
from services.attachments import (
    attach_attachments_to_task,
    create_attachments,
    remove_attachment,
)

attachments_router = APIRouter(prefix="/attachments")
task_attachments_router = APIRouter(prefix="/{task_id}/attachments")


@attachments_router.post(
    "/",
    response_model=AttachmentsList,
    status_code=status.HTTP_201_CREATED,
    summary="Загрузить вложения",
)
async def upload_attachments(
    user: AuthDependency, files: list[UploadFile] = File(...)
) -> AttachmentsList:
    attachments = await create_attachments(files)
    return AttachmentsList(attachments=attachments)


@attachments_router.delete(
    "/{attachment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Удалить загрузку вложения",
)
@task_attachments_router.delete(
    "/{attachment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Удалить загрузку вложения",
)
async def delete_attachments(
    attachment: AttachmentPathDependency,
) -> None:

    await remove_attachment(attachment)


@task_attachments_router.post(
    "/", status_code=status.HTTP_200_OK, summary="Прикрепить вложения к задаче"
)
async def bind_attachment_to_task(
    objects: TaskPathDependency,
    attachments: AttachmentsBind,
) -> None:

    await attach_attachments_to_task(
        task=objects.task,
        attachment_ids=attachments.attachment_ids,
    )
