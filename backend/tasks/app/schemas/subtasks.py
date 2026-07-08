from models.enums import SubtaskStatus
from pydantic import BaseModel, ConfigDict, Field


class SubtaskCreate(BaseModel):
    """Схема валидации входящих данных при создании подзадачи."""

    name: str = Field(title="Название задачи", min_length=3, max_length=100)
    status: SubtaskStatus = Field(
        default=SubtaskStatus.IN_PROGRESS, description="Статус подзадачи"
    )


class SubtaskDetail(SubtaskCreate):
    """Схема представления данных подзадачи."""

    id: int = Field(description="Идентификатор подзадачи")
    model_config = ConfigDict(from_attributes=True)


class SubtaskUpdate(SubtaskCreate):
    """Схема валидации обновления подзадачи."""

    name: str = Field(default=None, description="Наименование подзадачи")
    status: SubtaskStatus = Field(default=None, description="Статус подзадачи")
