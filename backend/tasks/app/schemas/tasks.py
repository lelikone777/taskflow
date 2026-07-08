from datetime import date, datetime, time
from typing import Self

from models.enums import (
    ReminderPeriodic,
    SubtaskStatus,
    TaskPriority,
    TaskStatus,
    Timezone,
)
from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    computed_field,
    field_serializer,
    model_validator,
)
from pydantic.json_schema import SkipJsonSchema
from pytz import timezone
from schemas.attachments import AttachmentRead
from schemas.core import UserTimezone
from schemas.subtasks import SubtaskDetail
from schemas.tags import TagDetail


class ProjectDeadline(BaseModel):
    """
    Схема сериализации текущщего проекта для добавления в схему валидации.
    """

    deadline: datetime = Field(title="Дата завершения проекта")
    model_config = ConfigDict(from_attributes=True)


class TaskCreate(UserTimezone):
    """Схема валидации данных для создания задачи."""

    name: str = Field(title="Название задачи", min_length=3, max_length=150)
    status: TaskStatus = Field(default=TaskStatus.IN_PROGRESS, title="Статус задачи")
    priority: TaskPriority | None = Field(
        default=TaskPriority.LOW, title="Приоритет задачи"
    )

    @computed_field(title="Дата создания задачи")
    def created_at(self) -> datetime:
        user_now = datetime.now(timezone(self.user_timezone))
        return user_now.astimezone(timezone(Timezone.UTC))


class TaskInfo(UserTimezone):
    """Схема представления информации для карточки задачи."""

    id: int = Field(title="Идентификатор задачи")
    tasklist_id: int = Field(title="Идентификатор списка задач")
    name: str = Field(title="Название задачи")
    status: TaskStatus = Field(title="Статус задачи")
    priority: TaskPriority = Field(title="Приоритет задачи")
    created_at: datetime = Field(title="Дата создания задачи")
    start_at: datetime | None = Field(
        default=None, title="Дата и время начала задачи", exclude=True
    )
    deadline: datetime | None = Field(
        default=None, title="Дата и время начала задачи", exclude=True
    )
    tags: list[TagDetail] | None = Field(default=[], title="Теги задачи")
    subtasks: list[SubtaskDetail] | None = Field(default=[], title="Подзадачи")
    attachments: list[AttachmentRead] | None = Field(
        default=[], title="Вложения", exclude=True
    )
    model_config = ConfigDict(from_attributes=True)

    @computed_field(
        title="Дата начала задачи",
    )
    @property
    def start_at_date(self) -> date:
        if self.start_at:
            return self.start_at.astimezone(timezone(self.user_timezone)).date()

    @computed_field(title="Час начала задачи")
    @property
    def start_at_hour(self) -> int:
        if self.start_at:
            return self.start_at.astimezone(timezone(self.user_timezone)).hour

    @computed_field(
        title="Минуты начала задачи",
    )
    @property
    def start_at_minutes(self) -> int:
        if self.start_at:
            return self.start_at.astimezone(timezone(self.user_timezone)).minute

    @computed_field(title="Дата завершения задачи")
    @property
    def deadline_date(self) -> date:
        if self.deadline:
            return self.deadline.astimezone(timezone(self.user_timezone)).date()

    @computed_field(title="Час завершения задачи")
    @property
    def deadline_hour(self) -> int:
        if self.deadline:
            return self.deadline.astimezone(timezone(self.user_timezone)).hour

    @computed_field(title="Минуты завершения задачи")
    @property
    def deadline_minutes(self) -> int:
        if self.deadline:
            return self.deadline.astimezone(timezone(self.user_timezone)).minute

    @computed_field(title="Количество всех подзадач")
    @property
    def subtasks_all(self) -> int:
        return len(self.subtasks)

    @computed_field(title="Количество завершенных подзадач")
    @property
    def subtasks_done(self) -> int:
        return len(
            [
                subtask
                for subtask in self.subtasks
                if (subtask.status == SubtaskStatus.DONE)
            ]
        )

    @computed_field(title="Наличие вложений")
    @property
    def has_attachments(self) -> bool:
        return True if self.attachments else False

    @field_serializer("created_at")
    def format_created_at(self, created_at: datetime) -> date:
        """Форматировать дату создания проекта."""
        return created_at.astimezone(timezone(self.user_timezone)).date()


class TaskDetail(TaskInfo):
    """Схема представления полной информации о задаче."""

    description: str | None = Field(default=None, title="Описание  задачи")
    attachments: list[AttachmentRead] | None = Field(default=[], title="Вложения")
    reminder_datetime: datetime | None = Field(
        default=None, title="Дата напоминания", exclude=True
    )
    reminder_periodic: ReminderPeriodic | None = Field(
        default=None, title="Переодичность напоминаний"
    )

    @computed_field(title="Дата напоминания")
    @property
    def reminder_date(self) -> date:
        if self.reminder_datetime:
            return self.reminder_datetime.astimezone(
                timezone(self.user_timezone)
            ).date()

    @computed_field(title="Час напоминания")
    @property
    def reminder_time_hour(self) -> int:
        if self.reminder_datetime:
            return self.reminder_datetime.astimezone(timezone(self.user_timezone)).hour

    @computed_field(title="Минуты напоминания")
    @property
    def reminder_time_minutes(self) -> int:
        if self.reminder_datetime:
            return self.reminder_datetime.astimezone(
                timezone(self.user_timezone)
            ).minute


class TaskBaseUpdate(UserTimezone):
    """Базовая схема для обновления задачи."""

    task: SkipJsonSchema[TaskInfo] | None = Field(
        default=None,
        title="Обновляемая задача",
        exclude=True,
    )
    model_config = ConfigDict(validate_assignment=True, arbitrary_types_allowed=True)


class TaskInfoUpdate(TaskBaseUpdate):
    """Схема для обновления информации о задаче."""

    name: str | None = Field(default=None, title="Название задачи")
    priority: TaskPriority = Field(default=None, title="Приоритет задачи")
    description: str | None = Field(default=None, title="Описание  задачи")

    @model_validator(mode="after")
    def check_status(self) -> Self:
        """Проверить статус задачи."""
        if self.task and self.task.status == TaskStatus.DONE:
            raise ValueError(
                {"field": "", "msg": "Нельзя редактировать завершенную задачу."}
            )
        return self


class TaskPeriodUpdate(TaskBaseUpdate):
    """Схема валидации обновления сроков выполнения задачи."""

    project: SkipJsonSchema[ProjectDeadline] | None = Field(
        default=None,
        title="Обновляемый проект",
        exclude=True,
    )
    start_at_date: date | None = Field(
        default=None, title="Дата начала задачи", exclude=True
    )
    start_at_hour: int | None = Field(
        ge=0, le=23, default=0, title="Час начала задачи", exclude=True
    )
    start_at_minutes: int | None = Field(
        ge=0, le=59, default=0, title="Минуты начала задачи", exclude=True
    )
    deadline_date: date | None = Field(
        default=None, title="Дата завершения задачи", exclude=True
    )
    deadline_hour: int | None = Field(
        ge=0, le=59, default=0, title="Час завершения задачи", exclude=True
    )
    deadline_minutes: int | None = Field(
        ge=0, le=59, default=0, title="Минуты завершения задачи", exclude=True
    )

    @computed_field(title="Дата и время начала задачи")
    def start_at(self) -> datetime | None:
        if self.start_at_date:
            user_tz = timezone(self.user_timezone)
            start_at = user_tz.localize(
                datetime.combine(
                    self.start_at_date, time(self.start_at_hour, self.start_at_minutes)
                )
            )
            return start_at.astimezone(timezone(Timezone.UTC))
        return self.task.start_at

    @computed_field(title="Дата и время завершения задачи")
    def deadline(self) -> datetime | None:
        if self.deadline_date:
            user_tz = timezone(self.user_timezone)
            deadline = user_tz.localize(
                datetime.combine(
                    self.deadline_date, time(self.deadline_hour, self.deadline_minutes)
                )
            )
            return deadline.astimezone(timezone(Timezone.UTC))
        return self.task.deadline

    @computed_field(title="Статус задачи")
    def status(self) -> TaskStatus:
        status = TaskStatus.IN_PROGRESS
        if self.start_at:
            if self.start_at > datetime.now(timezone(Timezone.UTC)):
                status = TaskStatus.SCHEDULE
        return status

    @model_validator(mode="after")
    def check_status(self) -> Self:
        """Проверить статус задачи."""
        if self.task and self.task.status == TaskStatus.DONE:
            raise ValueError(
                {"field": "", "msg": "Нельзя редактировать завершенную задачу."}
            )
        return self

    @model_validator(mode="after")
    def validate_period(self) -> Self:
        """
        Валидировать даты и время начала и завершения задачи.

        Валидация сроков выполняется относительно друг друга, текущего времени
         и сроков проекта.
        """
        if self.task and self.project:

            if self.deadline and self.start_at:
                if self.deadline < self.start_at:
                    raise ValueError(
                        {
                            "field": "",
                            "msg": (
                                "Срок завершения задачи не может быть ранее "
                                "срока начала ее выполнения."
                            ),
                        }
                    )
            if self.start_at_date:
                if self.start_at.astimezone(
                    timezone(self.user_timezone)
                ) < datetime.now(timezone(self.user_timezone)):
                    raise ValueError(
                        {
                            "field": "",
                            "msg": (
                                "Срок начала задачи не может быть ранее "
                                "текущего времени."
                            ),
                        }
                    )
                if self.start_at.date() > self.project.deadline.date():
                    raise ValueError(
                        {
                            "field": "",
                            "msg": (
                                "Дата начала задачи не может быть позже даты "
                                "завершения проекта."
                            ),
                        }
                    )
            if self.deadline:
                if self.deadline.astimezone(
                    timezone(self.user_timezone)
                ) < datetime.now(timezone(self.user_timezone)):
                    raise ValueError(
                        {
                            "field": "",
                            "msg": (
                                "Срок завершения задачи не может быть ранее "
                                "текущего времени."
                            ),
                        }
                    )
                if self.deadline.date() > self.project.deadline.date():
                    raise ValueError(
                        {
                            "field": "",
                            "msg": (
                                "Дата завершения задачи не может быть позже "
                                "даты завершения проекта."
                            ),
                        }
                    )
        return self


class TaskStatusUpdate(TaskBaseUpdate):
    """Схема валидации обновления статуса задачи."""

    status: TaskStatus = Field(title="Статус задачи")

    @model_validator(mode="after")
    def validate_status(self) -> Self:
        """Валидировать статус в зависимости от даты начала задачи."""
        if self.task and self.status == TaskStatus.SCHEDULE:
            if not self.task.start_at:
                raise ValueError(
                    {
                        "field": "",
                        "msg": (
                            "Установите дату и время начала выполнения "
                            "задачи для установки статуса <Запланировано>."
                        )
                    }
                )
            elif self.task.start_at < datetime.now(timezone(Timezone.UTC)):
                raise ValueError(
                    {
                        "field": "",
                        "msg": (
                            "Статус <Запланировано> нельзя установить "
                            "для задачи, для которой начало выполнения "
                            "установлено ранее текущего времени."
                        )
                    }
                )
        return self


class TaskMove(TaskBaseUpdate):
    """Схема валидации для перемещения задачи в другой список."""

    tasklist_id: int = Field(title="Идентификатор нового списка задач")
