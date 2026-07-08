from typing import Any

from core.dependency import AuthDependency, single_file_validator
from fastapi import APIRouter, Depends, Response, UploadFile, status
from models.users import User
from routers.auth import auth_router
from routers.reminders import user_reminders_router
from schemas.users import Avatar, UserDetail, UserId, UserUpdate
from services.base import service
from services.users import get_avatar_url, get_user_detail, update_avatar

user_router = APIRouter(prefix="/user", tags=["Пользователь"])


@user_router.get(
    "/avatar",
    response_model=Avatar,
    summary="Получить ссылку на файл аватара пользователя",
)
async def avatar_info(user: AuthDependency) -> Avatar:

    # Получить из хранилища MinIO ссылку на аватар пользователя
    avatar_url: str = await get_avatar_url(user.id)

    return {"avatar_url": avatar_url}


@user_router.post(
    "/avatar",
    status_code=status.HTTP_201_CREATED,
    summary="Установить аватар пользователя",
)
async def set_avatar(
    user: AuthDependency, file: UploadFile = Depends(single_file_validator)
) -> Response:
    await update_avatar(user, file)


@user_router.get(
    "/me",
    response_model=UserDetail,
    summary="Получить профиль пользователя"
)
async def get_user_profile(user: AuthDependency) -> UserDetail:

    return await get_user_detail(user)


@user_router.patch(
    "/me",
    response_model=UserDetail,
    summary="Обновить профиль пользователя"
)
async def update_user_profile(
    user_data: UserUpdate, current_user: AuthDependency
) -> UserDetail:

    update_data: dict[str, Any] = user_data.model_dump(exclude_unset=True)
    update_data["id"] = current_user.id
    updated_user: User = await service.update(model=User, values=update_data)

    return await get_user_detail(updated_user)


@user_router.get(
    "/id",
    response_model=UserId,
    summary="Получить id пользователя"
)
async def get_user_id(user: AuthDependency) -> UserId:

    return UserId(id=user.id)


user_router.include_router(auth_router)
user_router.include_router(user_reminders_router)
