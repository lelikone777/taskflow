from typing import BinaryIO
from uuid import uuid4

from core.config import settings
from core.minio import MinioHandler
from core.utils import validate_file, validate_file_extension
from database.db import connection
from models.enums import AvatarMIMEType, ProjectStatus
from models.users import Avatar, Token, User
from schemas.users import UserDetail, UserProject
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

client = MinioHandler(
    settings.minio_settings.MINIO_URL,
    settings.minio_settings.MINIO_ROOT_USER,
    settings.minio_settings.MINIO_ROOT_PASSWORD,
    "avatars",
)


@connection
async def get_user_by_email(email: str, session: AsyncSession) -> User | None:
    """
    Получает из базы данных и возвращает объект пользоваателя по его email.
    """
    query = select(User).where(func.lower(User.email) == func.lower(email))
    user = await session.execute(query)
    return user.scalar_one_or_none()


@connection
async def get_user_by_token(token: str, session: AsyncSession) -> User | None:
    """
    Получает из базы данных объект токена по значению токена доступа
     и возвращает объект связанного с токеном пользователя.
    """
    query = (
        select(Token)
        .where(Token.access_token == token)
        .order_by(Token.id.desc())
    )
    result = await session.execute(query)
    token_record = result.scalars().first()

    if token_record and token_record.is_active:
        return token_record.user

    return None


async def get_user_detail(user_orm: User) -> UserDetail:
    """Получить данные профиля пользователя."""
    user = UserDetail.model_validate(user_orm)
    user.avatar_url = await get_avatar_url(user_orm.id)
    user.projects = [
        UserProject.model_validate(project)
        for project in user_orm.projects
        if project.status != ProjectStatus.ARCHIVE
    ]

    return user


@connection
async def update_avatar(user: User, file: BinaryIO, session: AsyncSession) -> None:
    """
    Обновляет или создает при отсутствии в базе данных объект
     аватара пользователя.
    """
    await validate_file(
        file,
        allow_file_size=settings.AVATAR_ALLOWABLE_FILE_SIZE,
        expected_types=settings.AVATAR_ALLOWABLE_FILE_TYPE,
    )

    mime_type: str = await validate_file_extension(file, AvatarMIMEType)
    minio_name: str = str(uuid4())
    object_name: str = f"{minio_name}.{mime_type}"

    if await client.check_bucket():
        await client.upload_file(object_name, file.file, file.size)

    update_data = {
        "filename": file.filename,
        "minio_name": minio_name,
        "mime_type": mime_type,
    }

    query = select(Avatar).where(Avatar.user_id == user.id)
    result = await session.execute(query)
    avatar = result.scalar_one_or_none()
    if avatar:
        for field, value in update_data.items():
            setattr(avatar, field, value)
    else:
        update_data["user_id"] = user.id
        avatar = Avatar(**update_data)
        session.add(avatar)
    await session.commit()


@connection
async def get_avatar_url(user_id: int, session: AsyncSession) -> str:
    """
    Получает из хранилища MinIO и возвращает ссылку на файл связанного
     с указанным пользователем аватара.
    """
    query = select(Avatar).where(Avatar.user_id == user_id)
    result = await session.execute(query)
    avatar = result.scalar_one_or_none()
    if avatar and await client.check_bucket():
        return await client.get_url(f"{avatar.minio_name}.{avatar.mime_type}")
    return None
