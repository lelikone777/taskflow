from database.db import Base
from models.enums import Timezone, UserRole
from models.taskflow import Project, Tag
from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship


class Avatar(Base):
    """Модель аватара пользователя."""

    filename: Mapped[str]
    minio_name: Mapped[str]
    mime_type: Mapped[str]
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    user: Mapped["User"] = relationship(
        "User", back_populates="avatar", uselist=False
    )


class User(Base):
    """Модель пользователя."""

    email: Mapped[str] = mapped_column(unique=True)
    password: Mapped[str] = mapped_column(String(100))
    username: Mapped[str] = mapped_column(
        String(64), unique=True, nullable=True
    )
    timezone: Mapped[Timezone] = mapped_column(default=Timezone.UTC)
    is_active: Mapped[bool] = mapped_column(default=False)
    is_blocked: Mapped[bool] = mapped_column(default=False)
    role: Mapped[UserRole] = mapped_column(
        default=UserRole.USER, server_default=UserRole.USER.name
    )
    avatar: Mapped["Avatar"] = relationship(
        "Avatar",
        back_populates="user",
    )
    tokens: Mapped[list["Token"]] = relationship(
        "Token",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    projects: Mapped[list["Project"]] = relationship(
        "Project",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin"
    )
    tags: Mapped[list["Tag"]] = relationship(
        "Tag",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin"
    )


class Token(Base):
    """Модель для хранения токенов."""

    access_token: Mapped[str]
    refresh_token: Mapped[str]
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE")
    )
    user: Mapped["User"] = relationship(
        "User", back_populates="tokens", lazy="joined"
    )
    is_active: Mapped[bool]
