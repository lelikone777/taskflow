from unittest.mock import patch

import jwt
import pytest
from core.config import settings
from fastapi import HTTPException
from models.users import User
from services.auth import (
    create_confirmation_token,
    create_token,
    hash_password,
    verify_password,
    verify_token,
)


@pytest.mark.asyncio
class TestAuthFunctionsUnit:
    async def test_hash_and_verify_password(self):
        """Тест хэширования и проверки пароля."""
        password = "my_secret_password"
        hashed = await hash_password(password.encode())

        assert hashed != password
        assert await verify_password(password, hashed) is True
        assert await verify_password("wrong_password", hashed) is False

    async def test_create_token(self):
        """Тест создания JWT токена."""
        payload = {"user_id": 1, "type": "access", "test": "data"}
        token = await create_token(payload)

        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0

    async def test_create_confirmation_token(self):
        """Тест создания токена подтверждения."""
        user = User(id=123)

        with patch("services.auth.create_token") as mock_create_token:
            mock_create_token.return_value = "mock_confirmation_token"

            token = await create_confirmation_token(user)

            mock_create_token.assert_called_once()
            call_args = mock_create_token.call_args[0][0]

            assert call_args["user_id"] == 123
            assert call_args["type"] == "confirm"
            assert "exp" in call_args
            assert token == "mock_confirmation_token"

    async def test_verify_token_valid(self):
        """Тест успешной верификации токена."""
        payload = {"user_id": 789, "type": "access"}

        with patch("jwt.decode") as mock_decode:
            mock_decode.return_value = payload

            result = await verify_token("valid_token", "access")

            assert result == payload
            mock_decode.assert_called_once_with(
                "valid_token", settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
            )

    async def test_verify_token_expired(self):
        """Тест обработки истекшего токена."""
        with patch("jwt.decode") as mock_decode:
            mock_decode.side_effect = jwt.ExpiredSignatureError()

            with pytest.raises(HTTPException) as exc_info:
                await verify_token("expired_token", "access")

            assert exc_info.value.status_code == 401
            assert exc_info.value.detail == "Token expired"

    async def test_verify_token_invalid(self):
        """Тест обработки невалидного токена."""
        with patch("jwt.decode") as mock_decode:
            mock_decode.side_effect = jwt.InvalidTokenError()

            with pytest.raises(HTTPException) as exc_info:
                await verify_token("invalid_token", "access")

            assert exc_info.value.status_code == 401
            assert exc_info.value.detail == "Invalid token"

    async def test_verify_token_wrong_type(self):
        """Тест проверки типа токена."""
        payload = {"user_id": 789, "type": "access"}

        with patch("jwt.decode") as mock_decode:
            mock_decode.return_value = payload

            with pytest.raises(HTTPException) as exc_info:
                await verify_token("access_token", "refresh")

            assert exc_info.value.status_code == 401
            assert exc_info.value.detail == "Invalid token type"
