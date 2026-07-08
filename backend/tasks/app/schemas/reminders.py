from datetime import date, datetime, time
from typing import Self

from models.enums import ReminderPeriodic, TaskStatus, Timezone
from pydantic import BaseModel, ConfigDict, Field, computed_field, model_validator
from pytz import timezone
from schemas.core import UserTimezone


class CurrentTask(BaseModel):
    """Схема сериализации текущей задачи."""

    id: int
    status: TaskStatus
    start_at: datetime | None
    deadline: datetime | None
    model_config = ConfigDict(from_attributes=True)


class CreateReminder(UserTimezone):
    """Схема валидации создания напоминания."""

    task: CurrentTask = Field(
        default=None,
        title="Обновляемый проект",
        exclude=True,
        description="Подгружается автоматически, не требуется в запросе.",
    )
    reminder_date: date = Field(description="Дата напоминания", exclude=True)
    reminder_time_hour: int | None = Field(
        default=8, gte=0, le=23, description="Час напоминания", exclude=True
    )
    reminder_time_minutes: int | None = Field(
        default=0, gte=0, le=59, description="Минуты напоминания", exclude=True
    )
    reminder_periodic: ReminderPeriodic | None = Field(
        default=ReminderPeriodic.NONE, description="Периодичность напоминания"
    )
    model_config = ConfigDict(
        validate_assignment=True,
        arbitrary_types_allowed=True
    )

    @computed_field(title="Дата и время напоминания")
    def reminder_datetime(self) -> datetime:
        user_tz = timezone(self.user_timezone)
        reminder_datetime = user_tz.localize(
            datetime.combine(
                self.reminder_date,
                time(self.reminder_time_hour, self.reminder_time_minutes),
            )
        )
        return reminder_datetime.astimezone(timezone(Timezone.UTC))

    @model_validator(mode="after")
    def reminder_validator(self) -> Self:
        """Проверить статус задачи."""
        if self.task and self.task.status == TaskStatus.DONE:
            raise ValueError(
                {
                    "field": "",
                    "msg": (
                        "Нельзя установить напоминание для "
                        "завершенной задачи."
                    ),
                }
            )
        return self

    @model_validator(mode="after")
    def reminder_periodic_validator(self) -> Self:
        """Валидировать устанавливаемую переодичность напоминаний."""
        if (
            self.task
            and not self.task.deadline
            and self.reminder_periodic != ReminderPeriodic.NONE
        ):
            raise ValueError(
                {
                    "field": "reminder_periodic",
                    "msg": (
                        "Установите дату завершения задачи для использования "
                        "повторов при напоминаниях."
                    ),
                }
            )
        return self

    @model_validator(mode="after")
    def reminder_date_validator(self) -> Self:
        """Валидировать устанавливаемые сроки напоминаний."""
        if self.task and self.user_timezone:

            if self.reminder_datetime < datetime.now(timezone(Timezone.UTC)):
                raise ValueError(
                    {
                        "field": "",
                        "msg": (
                            "Напоминание не может быть установлено ранее "
                            "текущего времени."
                        ),
                    }
                )
            if (
                self.task.start_at
                and self.reminder_datetime < self.task.start_at
            ):
                raise ValueError(
                    {
                        "field": "",
                        "msg": (
                            "Напоминание не может быть установлено ранее "
                            "срока начала выполнения задачи."
                        ),
                    }
                )
            if (
                self.task.deadline
                and self.reminder_datetime > self.task.deadline
            ):
                raise ValueError(
                    {
                        "field": "",
                        "msg": (
                            "Напоминание не может быть установлено позже "
                            "срока завершения задачи."
                        ),
                    }
                )
        return self


class ReminderTask(UserTimezone):
    """Схема сериализации связанной с напоминанием задачи."""

    name: str
    description: str | None
    deadline: datetime | None
    status: TaskStatus
    model_config = ConfigDict(from_attributes=True)


class ReminderUpdate(BaseModel):
    """Схема валидации изменения напоминания."""

    was_read: bool = Field(title="Отметка о прочтении")


class ReminderInfo(UserTimezone, ReminderUpdate):
    """Схема представления напоминания."""

    id: int = Field(title="Идентификатор напоминания")
    send_time: datetime = Field(
        title="Дата и время отправки напоминания",
        exclude=True
    )
    task: ReminderTask = Field(title="Задача", exclude=True)
    model_config = ConfigDict(from_attributes=True)

    @computed_field(title="Название задачи")
    @property
    def task_name(self) -> date:
        if self.task:
            return self.task.name

    @computed_field(title="Описание задачи")
    @property
    def task_description(self) -> date:
        if self.task:
            return self.task.description

    @computed_field(title="Статус задачи")
    @property
    def task_status(self) -> date:
        if self.task:
            return self.task.status

    @computed_field(title="Дата отправки напоминания")
    @property
    def sent_date(self) -> date:
        if self.send_time:
            return self.send_time.astimezone(
                timezone(self.user_timezone)
            ).date()

    @computed_field(title="Час отправки напоминания")
    @property
    def sent_time_hour(self) -> int:
        if self.send_time:
            return self.send_time.astimezone(
                timezone(self.user_timezone)
            ).hour

    @computed_field(title="Минуты отправки напоминания")
    @property
    def sent_time_minutes(self) -> int:
        if self.send_time:
            return self.send_time.astimezone(
                timezone(self.user_timezone)
            ).minute

    @computed_field(title="Состояние дедлайна задачи")
    @property
    def expired(self) -> bool:
        return (
            True
            if (self.task.deadline < datetime.now(timezone(Timezone.UTC)))
            else False
        )


class UserReminders(BaseModel):
    """Схема представления списка напоминаний."""

    reminders: list[ReminderInfo] | None = Field(
        default=[], title="Напоминания пользователя"
    )
