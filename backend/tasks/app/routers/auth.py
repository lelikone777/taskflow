from typing import Annotated
from urllib.parse import unquote

from beat.tasks import send_confirmation_email_task, send_password_reset_email_task
from core import constants
from core.dependency import AuthDependency
from fastapi import APIRouter, Form, Header, HTTPException, Path, status
from models.users import User
from schemas.core import Message
from schemas.users import (
    OAuthLinkResponse,
    PasswordRequest,
    RecoveryRequest,
    RegisterRequest,
    TokensPair,
    UniversalOAuthRequest,
)
from services.auth import (
    auth_service,
    create_confirmation_token,
    create_password_recovery_token,
    create_token_pair,
    deactivate_token,
    get_token_object_by_access_token,
    get_token_object_by_refresh_token,
    hash_password,
    verify_token,
)
from services.base import service
from services.oauth import get_provider_auth_url, process_oauth_login
from services.users import get_user_by_email

auth_router = APIRouter(prefix="/auth")


@auth_router.get(
    "/{provider}/start",
    response_model=OAuthLinkResponse,
    status_code=status.HTTP_200_OK,
    summary="Получить ссылку для редиректа на страницу авторизации сервиса",
)
async def oauth_start(
    provider: str = Path(
        ..., description="Название провайдера (google, gitlab)"
    ),
) -> OAuthLinkResponse:

    auth_url = get_provider_auth_url(provider_name=provider)
    return OAuthLinkResponse(url=auth_url)


@auth_router.post(
    "/{provider}/callback",
    response_model=TokensPair,
    status_code=status.HTTP_200_OK,
    summary="Универсальная авторизация через OAuth2 (google, gitlab)",
)
async def oauth_login(
    auth_data: UniversalOAuthRequest,
    provider: str = Path(
        ..., description="Название провайдера (google, gitlab)"
    ),
) -> TokensPair:

    decoded_code = unquote(auth_data.code)
    result_tokens = await process_oauth_login(
        provider_name=provider, code=decoded_code
    )

    return TokensPair(**result_tokens)


@auth_router.post(
    "/registration",
    response_model=Message,
    summary="Зарегистрировать пользователя"
)
async def register(registration_data: RegisterRequest) -> Message:

    # Проверить сущестование, иначе, создать пользователя
    user: User = await get_user_by_email(registration_data.email)
    if user:
        if user.is_active:
            raise HTTPException(
                status_code=400,
                detail={
                    "type": "Ошибка регистрации.",
                    "field": "",
                    "msg": constants.USER_ALREADY_EXIST,
                },
            )
    else:
        user_data: dict = {
            "email": registration_data.email,
            "password": await hash_password(registration_data.password),
        }
        user: User = await service.add(model=User, values=user_data)

    # Создать и отправить токен подтверждения
    confirm_token: str = await create_confirmation_token(user)
    send_confirmation_email_task.delay(registration_data.email, confirm_token)

    return {"message": constants.SUCCESS_REGISTRATION}


@auth_router.post(
    "/registration/confirm",
    response_model=Message,
    summary="Подтвердить регистрацию пользователя",
)
async def confirm_registration(token: Annotated[str, Header()]) -> Message:

    # Проверить сузествование и статус пользователя
    payload: dict = await verify_token(token, "confirm")
    user: User = await service.get(model=User, id=payload["user_id"])

    # Вернуть ошибку регистрации, если условия не выполнены
    if not user or user.is_active:
        raise HTTPException(
            status_code=401,
            detail={
                "type": "Ошибка регистрации.",
                "field": "",
                "msg": constants.REGISTRATION_ERROR,
            },
        )

    # Обновить данные пользователя
    update_data: dict = {"id": payload["user_id"], "is_active": True}
    await service.update(model=User, values=update_data)

    return {"message": constants.SUCCESS_REGISTRATION_CONFIRM}


@auth_router.post(
    "/login",
    response_model=TokensPair,
    summary="Аутентификация пользователя",
)
async def login(
    email: Annotated[str, Form()], password: Annotated[str, Form()]
) -> TokensPair:

    user = await get_user_by_email(email)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "type": "Ошибка авторизации.",
                "field": "",
                "msg": "Неверный логин или пароль.",
            },
        )

    await auth_service.handle_login_attempt(user, password)

    tokens: TokensPair = await create_token_pair(user.id)
    return tokens


@auth_router.post(
    "/recovery",
    response_model=Message,
    summary="Востановить пароль"
)
async def recovery_password(recovery_data: RecoveryRequest) -> Message:

    # Проверить существование и статус пользователя,
    # отправить токен восстановления пароля на почту пользователя
    user: User = await get_user_by_email(recovery_data.email)
    if user and user.is_active:
        recovery_token: str = await create_password_recovery_token(user)
        send_password_reset_email_task.delay(
            recovery_data.email, recovery_token
        )

        return {"message": constants.RECOVERY_EMAIL_SENT}
    else:
        raise HTTPException(
            status_code=400,
            detail={
                "type": "Ошибка доступа.",
                "field": "email",
                "msg": constants.UNREGISTERED_USER,
            },
        )


@auth_router.post(
    "/recovery/confirm",
    response_model=TokensPair,
    summary="Подтвердить восстановление пароля",
)
async def confirm_recovery_password(
    token: Annotated[str, Header()],
) -> TokensPair:

    # По токену проверить существование и статус пользователя
    payload: dict = await verify_token(token, "password_recovery")
    user: User = await service.get(model=User, id=payload["user_id"])

    if not user or not user.is_active:
        raise HTTPException(
            status_code=404,
            detail={
                "type": "Ошибка авторизации.",
                "field": "",
                "msg": constants.INCORRECT_CREDENTAILS_MESSAGE,
            },
        )

    # Создать новую пару токенов доступа и обновления
    tokens: TokensPair = await create_token_pair(user.id)

    return tokens


@auth_router.post(
    "/passchange",
    response_model=Message,
    summary="Сменить пароль"
)
async def reset_password(
    password_data: PasswordRequest, user: AuthDependency
) -> Message:

    # Изменить пароль в данных пользователя
    update_data: dict = {
        "id": user.id,
        "password": await hash_password(password_data.password),
    }
    await service.update(model=User, values=update_data)

    return {"message": constants.SUCCESS_PASSWORD_RESET}


@auth_router.post(
    "/refresh",
    summary="Обновить токен доступа"
)
async def update_tokens(refresh_token: Annotated[str, Header()]) -> dict:

    # Проверить наличие токена и его статус в базе, дективировать его,
    # выдать новую пару токенов доступа и обновления
    if await verify_token(refresh_token, "refresh"):
        token_object = await get_token_object_by_refresh_token(refresh_token)
        if token_object and token_object.is_active:
            await deactivate_token(token_object.id)
            return await create_token_pair(token_object.user_id)

    # Вернуть ошибку доступа, если условия не выполнены
    raise HTTPException(
        status_code=400,
        detail={
            "type": "Ошибка доступа.",
            "field": "",
            "msg": constants.ACCESS_ERROR,
        },
    )


@auth_router.post(
    "/logout",
    response_model=Message,
    summary="Звершить сессию аутентификации"
)
async def logout(
    user: AuthDependency,
    authorization: str = Header(...),
) -> Message:

    # Получить из базы и дективировать токен
    token_str = authorization.replace("Bearer ", "").strip()
    token_obj = await get_token_object_by_access_token(token_str)
    if token_obj:
        await deactivate_token(token_obj.id)

    return {"message": constants.SUCCESS_LOGOUT}
