import re
from typing import Self

from models.enums import Timezone
from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator, field_validator


class PasswordRequest(BaseModel):
    """Схема валидации запроса на установку пароля пользователя."""

    password: str = Field(
        min_length=12,
        max_length=100,
        pattern=re.compile(
            r"^(?=.*[A-Z])"  # минимум одна заглавная буква
            r"(?=.*[a-z])"  # минимум одна строчная буква
            r"(?=.*\d)"  # минимум одна цифра
            r'(?=.*[!$%^&*()_+=\[\]{};":\|,.<>\/?])'  # спецсимволы
            r"[A-Za-z0-9!$%^&*()_+=\[\]{};\":\|,.<>/?]{12,100}$"
        ),
        title="Пароль",
        description=(
            "Должен содержать:\n"
            "- минимум 12 символов\n"
            "- хотя бы одну заглавную букву\n"
            "- хотя бы одну строчную букву\n"
            "- хотя бы одну цифру\n"
            "- хотя бы один специальный символ"
            ' !  $  %  ^  &  *  (  )  _  +  =  [  {  ]  ;  "  :  |'
            "  ,  .  <  >  ?  /\n\n"
            "Запрещены символы:  '  \"  \\  /  ;  --  #  <  >  &  @"
        ),
    )
    confirm_password: str = Field(title="Подтверждение пароля")

    @model_validator(mode="after")
    def check_passwords_match(self) -> Self:
        """
        Валидировать совпадение значений полей пароля и подтверждения пароля.
        """
        if self.password != self.confirm_password:
            raise ValueError(
                {
                    "field": "",
                    "msg": (
                        "Пароли не совпадают. "
                        "Пожалуйста, введите одинаковые пароли."
                    ),
                }
            )
        return self

    @model_validator(mode="after")
    def check_forbidden_chars(self) -> Self:
        forbidden = "\\/;'\"--#<>$&@"
        found = [c for c in self.password if c in forbidden]
        if found:
            raise ValueError({
                "field": "password",
                "msg": f"Пароль содержит запрещенные символы. Запрещены: {forbidden}"
            })
        return self


class RecoveryRequest(BaseModel):
    """Схема валидации запроса на восстановление пароля."""

    email: str = Field(title="Адрес электронной почты пользователя")

    @field_validator("email")
    def validate_email_length(v: str) -> str:
        if (
                "@" not in v
                or len(v.split("@")[0]) > 64
                or len(v.split("@")[1]) > 159
                or len(v) > 254
        ):
            raise ValueError(
                {
                    "field": "email",
                    "msg": "Ошибка валидации формата Email"
                }
            )
        return v


class RegisterRequest(PasswordRequest, RecoveryRequest):
    """Схема валидации запроса на регистрацию пользователя."""

    @model_validator(mode="after")
    def check_email_not_in_password(self) -> Self:
        if self.email.split("@")[0].lower() in self.password.lower():
            raise ValueError(
                {
                    "field": "password",
                    "msg": "Пароль не должен содержать email пользователя"
                }
            )
        return self

    @field_validator("email")
    def validate_email_format(v: str) -> str:
        """Проверить запрещенные символы в email."""
        forbidden = "'\"\\;#,<>/& "
        if any(c in v for c in forbidden) or v[0] in ".-" or ".." in v or "--" in v:
            raise ValueError({
                "field": "email",
                "msg": "Недопустимые символы в email"
            })
        return v


class OAuthLinkResponse(BaseModel):
    """Схема ответа со ссылкой на страницу авторизации провайдера."""

    url: str = Field(..., title="Ссылка для редиректа на сторону сервиса")


class UniversalOAuthRequest(BaseModel):
    """Схема запроса от фронтенда с кодом авторизации."""

    code: str = Field(
        ..., title="Код авторизации, полученный от OAuth провайдера"
    )


class TokensPair(BaseModel):
    """Схема ответа на запрос на на вход пользователя в сервис."""

    access_token: str = Field(title="Токен доступа к сервису.")
    refresh_token: str = Field(title="Токен обновления токена доступа.")


class UserUpdate(BaseModel):
    """Схема вадидации запроса на изменения данных пользователя."""

    username: str | None = Field(
        min_length=2, default=None, title="Имя пользователя."
    )
    timezone: Timezone | None = Field(default=None, title="Часовой пояс.")


class Avatar(BaseModel):
    avatar_url: str | None = Field(
        default=None, title="Ссылка на файл аватара пользователя."
    )


class UserProject(BaseModel):
    """Схема представления проекта в профиле пользователя."""

    id: int = Field(title="Идентификатор проекта")
    name: str = Field(title="Наименование проекта")
    model_config = ConfigDict(from_attributes=True)


class UserDetail(RecoveryRequest, Avatar, UserUpdate):
    """Схема представления данных профиля пользователя."""

    id: int = Field(title="Идентификатор пользователя.")
    projects: list[UserProject] = Field(
        title="Список активных проектов пользователя."
    )
    model_config = ConfigDict(from_attributes=True)
    model_config = ConfigDict(from_attributes=True)


class UserId(BaseModel):
    """Схема ответа с id текущего пользователя."""

    id: int = Field(title="Идентификатор пользователя.")
