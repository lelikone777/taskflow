from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
import redis.asyncio as aioredis
from core import constants
from core.config import settings
from database.db import connection
from fastapi import HTTPException, status
from models.users import Token, User
from passlib.hash import argon2
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession


async def hash_password(password: bytes) -> str:
    """Функция хэширования пароля."""
    return argon2.hash(password)


async def create_token(payload: dict) -> str:
    """Функция генерации JWT токена."""
    return jwt.encode(
        payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )


async def create_confirmation_token(user: User) -> str:
    """Функция создания токена подтверждения регистрации."""
    return await create_token(
        {
            "user_id": user.id,
            "type": "confirm",
            "exp": datetime.now(UTC)
            + timedelta(hours=settings.CONFIRM_TOKEN_LIFETIME_HOURS),
        }
    )


@connection
async def create_token_pair(user_id: int, session: AsyncSession) -> dict:
    """Функция создания и записи в базу токенов доступа и обновления."""
    token = Token(
        access_token=await create_token(
            {
                "user_id": user_id,
                "type": "access",
                "exp": datetime.now(UTC)
                + timedelta(minutes=settings.ACCESS_TOKEN_LIFETIME_MINUTS),
            }
        ),
        refresh_token=await create_token(
            {
                "user_id": user_id,
                "type": "refresh",
                "exp": datetime.now(UTC)
                + timedelta(hours=settings.REFRESH_TOKEN_LIFETIME_HOURS),
            }
        ),
        user_id=user_id,
        is_active=True,
    )
    session.add(token)
    await session.commit()
    await session.refresh(token)
    return {
        "access_token": token.access_token,
        "refresh_token": token.refresh_token
    }


async def verify_token(token: str, token_type: str) -> dict[str, Any]:
    try:
        payload: dict = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail={
                "type": "Ошибка авторизации",
                "field": "Authorization",
                "msg": "Token expired",
            },
        ) from None
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=401,
            detail={
                "type": "Ошибка авторизации",
                "field": "Authorization",
                "msg": "Invalid token",
            },
        ) from None
    if payload["type"] != token_type:
        raise HTTPException(
            status_code=401,
            detail={
                "type": "Ошибка авторизации",
                "field": "Authorization",
                "msg": "Invalid token type",
            },
        ) from None
    return payload


async def create_password_recovery_token(user: User) -> str:
    """Генерация токена для сброса пароля со сроком действия 15 минут."""
    expire = datetime.now(UTC) + timedelta(minutes=15)

    payload = {"user_id": user.id, "exp": expire, "type": "password_recovery"}

    return await create_token(payload)


@connection
async def get_token_object_by_refresh_token(
    token: str, session: AsyncSession
) -> Token:
    """Возвращает объект Token из базы по значению токена обновления."""
    query = (
        select(Token)
        .where(Token.refresh_token == token)
        .order_by(Token.id.desc())
    )
    token_object = await session.execute(query)
    return token_object.scalars().first()


@connection
async def get_token_object_by_access_token(
    token: str, session: AsyncSession
) -> Token:
    """Возвращает объект Token из базы по значению токена доступа."""
    query = (
        select(Token)
        .where(Token.access_token == token)
        .order_by(Token.id.desc())
    )
    token_object = await session.execute(query)
    return token_object.scalars().first()


@connection
async def deactivate_token(token_id: int, session: AsyncSession) -> None:
    """Деактивирует объект Token."""
    update_query = update(
        Token
    ).where(
        Token.id == token_id
    ).values(
        is_active=False
    )

    await session.execute(update_query)
    await session.commit()


class AuthService:
    def __init__(self) -> None:
        # Инициализируем асинхронный клиент Redis
        self.redis = aioredis.from_url(
            settings.redis_settings.redis_url, decode_responses=True
        )

    async def verify_password(
        self, plain_password: str, hashed_password: str
    ) -> bool:
        """Функция проверки соответствия паролей."""
        try:
            return argon2.verify(plain_password, hashed_password)
        except Exception:
            return False

    @connection
    async def update_user_block_status(
        self, user_id: int, is_blocked: bool, session: AsyncSession
    ) -> None:
        """Обновить статус блокировки пользователя."""
        user = await session.get(User, user_id)
        if user:
            user.is_blocked = is_blocked
            await session.commit()

    async def handle_login_attempt(
        self, user: User, plain_password: str
    ) -> None:
        """Проверить корректность попытки входа.

        Проверяет статусы активности и блокировки, верифицирует
        пароль, управляет счетчиком попыток в Redis и обновляет
        состояние `is_blocked` в базе данных.
        """
        attempts_key = f"login_attempts:{user.email}"
        lock_key = f"locked_user:{user.email}"

        # 1. Проверяем базовую активность
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "type": "Доступ запрещен.",
                    "field": "",
                    "msg": "Аккаунт не активирован или удален.",
                },
            )

        # 2. Проверяем, заблокирован ли аккаунт за брутфорс
        if user.is_blocked:
            ttl = await self.redis.ttl(lock_key)
            minutes_left = max(1, ttl // 60) if ttl > 0 else 1
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "type": "Аккаунт заблокирован.",
                    "field": "",
                    "msg": (
                        f"Превышено число попыток. Попробуйте через "
                        f"{minutes_left} мин."
                    ),
                },
            )

        # 3. Верифицируем пароль внутри метода
        is_password_correct = await self.verify_password(
            plain_password, user.password
        )

        # 4. Если пароль верный — сбрасываем счетчик в Redis и выходим
        if is_password_correct:
            await self.redis.delete(attempts_key)
            return

        # 5. Если пароль неверный — инкрементируем попытки
        attempts = await self.redis.incr(attempts_key)
        if attempts == 1:
            await self.redis.expire(
                attempts_key, settings.USER_LOCK_TIMEOUT
            )

        # 6. Если попыток >= 5 — триггерим блокировку
        if attempts >= settings.LOGIN_MAX_ATTEMPTS:
            # Устанавливаем часовой маркер для TTL в Redis
            await self.redis.set(
                lock_key, "1", ex=settings.USER_LOCK_TIMEOUT
            )

            # Меняем поле is_blocked в Postgres
            await self.update_user_block_status(
                user_id=user.id, is_blocked=True
            )
            await self.redis.delete(attempts_key)

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "type": "Аккаунт заблокирован.",
                    "field": "",
                    "msg": (
                        "Вы ввели неверный пароль 5 раз. "
                        "Аккаунт заблокирован на 1 час."
                    ),
                },
            )

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "type": "Ошибка авторизации.",
                "field": "",
                "msg": constants.INCORRECT_CREDENTAILS_MESSAGE,
            },
        )


auth_service = AuthService()
