from datetime import UTC
from unittest.mock import patch

import pytest
from models.enums import UserRole
from models.users import Token, User
from services.auth import (
    create_password_recovery_token,
    create_token_pair,
    deactivate_token,
    get_token_object_by_access_token,
    get_token_object_by_refresh_token,
    verify_token,
)
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
class TestAuthFunctionsIntegration:
    async def test_create_token_pair_integration(self, db_engine):
        """Интеграционный тест: реальное создание пары токенов."""
        # Создаём пользователя
        async with AsyncSession(db_engine) as session:
            user = User(
                email="pair_test@test.com",
                password="hash123",
                timezone="UTC",
                is_active=True,
                username="pair_user",
                role=UserRole.USER,
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)
            user_id = user.id

        result = await create_token_pair(user_id)

        # Проверяем реальные токены
        access_payload = await verify_token(result["access_token"], "access")
        refresh_payload = await verify_token(result["refresh_token"], "refresh")

        assert access_payload["user_id"] == user_id
        assert refresh_payload["user_id"] == user_id

        # Проверяем БД
        token_obj = await get_token_object_by_refresh_token(result["refresh_token"])
        assert token_obj is not None
        assert token_obj.access_token == result["access_token"]
        assert token_obj.refresh_token == result["refresh_token"]
        assert token_obj.is_active is True

    async def test_create_password_recovery_token_integration(self, db_engine):
        """Интеграционный тест создания токена восстановления пароля."""
        async with AsyncSession(db_engine) as session:
            user = User(
                email="recovery_test@test.com",
                password="hash123",
                timezone="UTC",
                is_active=True,
                username="recovery_user",
                role=UserRole.USER,
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)
            user_id = user.id

        user = User(id=user_id)
        token = await create_password_recovery_token(user)

        payload = await verify_token(token, "password_recovery")

        assert payload["user_id"] == user_id
        assert payload["type"] == "password_recovery"

        from datetime import datetime, timedelta

        exp_timestamp = payload["exp"]
        exp_datetime = datetime.fromtimestamp(exp_timestamp, tz=UTC)
        expected_exp = datetime.now(UTC) + timedelta(minutes=15)

        assert abs((exp_datetime - expected_exp).total_seconds()) < 2

    async def test_deactivate_token_integration(self, db_engine):
        """Интеграционный тест деактивации токена."""
        async with db_engine.connect() as conn:
            result = await conn.execute(
                text("""
                    INSERT INTO users (
                    email, password, timezone, is_active, username, role
                    )
                    VALUES (
                    :email, :password, :timezone, :is_active, :username, :role
                    )
                    RETURNING id
                """),
                {
                    "email": "deactivate_test@test.com",
                    "password": "hash123",
                    "timezone": "UTC",
                    "is_active": True,
                    "username": "deactivate_user",
                    "role": "USER",
                },
            )
            user_id = result.scalar_one()
            await conn.commit()

        result = await create_token_pair(user_id)
        token_obj = await get_token_object_by_refresh_token(result["refresh_token"])

        await deactivate_token(token_obj.id)

        updated_token = await get_token_object_by_refresh_token(result["refresh_token"])
        assert updated_token.is_active is False

    async def test_get_token_object_by_access_token_integration(self, db_engine):
        """Интеграционный тест получения токена по access_token."""
        async with db_engine.connect() as conn:
            result = await conn.execute(
                text("""
                    INSERT INTO users (
                    email, password, timezone, is_active, username, role
                    )
                    VALUES (
                    :email, :password, :timezone, :is_active, :username, :role
                    )
                    RETURNING id
                """),
                {
                    "email": "access_test@test.com",
                    "password": "hash123",
                    "timezone": "UTC",
                    "is_active": True,
                    "username": "access_user",
                    "role": "USER",
                },
            )
            user_id = result.scalar_one()
            await conn.commit()

        result = await create_token_pair(user_id)
        token_obj = await get_token_object_by_access_token(result["access_token"])

        assert token_obj is not None
        assert token_obj.access_token == result["access_token"]
        assert token_obj.user_id == user_id

    async def test_get_token_object_by_refresh_token_integration(self, db_engine):
        """Интеграционный тест получения токена по refresh_token."""
        async with db_engine.connect() as conn:
            result = await conn.execute(
                text("""
                    INSERT INTO users (
                    email, password, timezone, is_active, username, role
                    )
                    VALUES (
                    :email, :password, :timezone, :is_active, :username, :role
                    )
                    RETURNING id
                """),
                {
                    "email": "refresh_test@test.com",
                    "password": "hash123",
                    "timezone": "UTC",
                    "is_active": True,
                    "username": "refresh_user",
                    "role": "USER",
                },
            )
            user_id = result.scalar_one()
            await conn.commit()

        result = await create_token_pair(user_id)
        token_obj = await get_token_object_by_refresh_token(result["refresh_token"])

        assert token_obj is not None
        assert token_obj.refresh_token == result["refresh_token"]
        assert token_obj.user_id == user_id

    async def test_create_token_pair(self, db_engine):
        """Тест создания пары токенов."""
        async with AsyncSession(db_engine) as session:
            user = User(
                id=456,
                email="test@test.com",
                password="hash123",
                username=None,
                is_active=False,
                role=UserRole.USER,
            )
            session.add(user)
            await session.commit()

        with patch("services.auth.create_token") as mock_create_token:
            mock_create_token.side_effect = ["mock_access_token", "mock_refresh_token"]

            result = await create_token_pair(User(id=456).id)

            assert result["access_token"] == "mock_access_token"
            assert result["refresh_token"] == "mock_refresh_token"

            async with AsyncSession(db_engine) as session:
                stmt = select(Token).where(Token.user_id == 456)
                result = await session.execute(stmt)
                token = result.scalar_one()

                assert token.access_token == "mock_access_token"
                assert token.refresh_token == "mock_refresh_token"
                assert token.is_active is True
