from datetime import datetime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import pytz
import redis
from beat.celery import celery_app
from celery import Task as CeleryTask
from core.config import settings
from core.utils import create_email_content, send_mail
from models.enums import ReminderChannel, ReminderStatus, TaskStatus
from models.taskflow import Reminder, Task
from models.users import Token, User
from sqlalchemy import create_engine, delete, select
from sqlalchemy.orm import sessionmaker
from starlette.templating import Jinja2Templates


@celery_app.task(bind=True, max_retries=5, default_retry_delay=30)
def send_confirmation_email_task(
    self: CeleryTask, to_email: str, token: str
) -> None:
    """
    Отправить токен подтверждения регистрации.

    Сформировать сообщенние со ссылкой для потверждение регистрациии
     в сервисе и отправить его  по электронной почте. Worker задача.

    Args:
        to_email (): Адрес электронной почты получателя.
        token (str, optional): Токен пордтверждения регистрации.
    """

    confirmation_url = (
        f"{settings.HOST_URL}" f":{settings.HOST_PORT}/" f"?token={token}"
    )

    templates = Jinja2Templates(directory=settings.templates_dir)
    template = templates.get_template(name="confirmation_email.html")
    html_content = template.render(confirmation_url=confirmation_url)

    message = MIMEMultipart()
    message["From"] = settings.email_settings.EMAIL_USERNAME
    message["To"] = to_email
    message["Subject"] = "Подтверждение регистрации в сервисе TaskFlow"
    message.attach(MIMEText(html_content, "html"))

    send_mail(message)


@celery_app.task(bind=True, max_retries=5, default_retry_delay=30)
def send_password_reset_email_task(
    self: CeleryTask, to_email: str, token: str
) -> None:
    """
    Отправить токен восстановления пароля.

    Сформировать сообщение со ссылкой для восстановления пароля и отправить
     его по электронной почте. Worker задача.

    Args:
        to_email (): Адрес электронной почты получателя.
        token (str, optional): Токен восстановления пароля.
    """
    reset_url = (
        f"{settings.HOST_URL}"
        f":{settings.HOST_PORT}/"
        f"reset-password/{token}"
    )
    templates = Jinja2Templates(directory=settings.templates_dir)

    template = templates.get_template(name="password_reset_email.html")
    html_content = template.render(reset_url=reset_url)

    message = MIMEMultipart()
    message["From"] = settings.email_settings.EMAIL_USERNAME
    message["To"] = to_email
    message["Subject"] = "Восстановление пароля в сервисе TaskFlow"
    message.attach(MIMEText(html_content, "html"))

    send_mail(message)


@celery_app.task
def cleanup_inactive_tokens_task() -> None:
    """
    Удалить неактивные токены.

    Проверять наличие в базе токенов со статусом is_active=False
     и удалять их. Beat задача.
    """
    engine = create_engine(settings.db_settings.db_url.replace("+asyncpg", ""))
    with engine.begin() as conn:
        conn.execute(delete(Token).where(Token.is_active is False))


@celery_app.task(bind=True, max_retries=5, default_retry_delay=30)
def send_reminder_task(self: CeleryTask) -> None:
    """
    Отправить созданное пользователем напоминание.

    Функция формирования сообщения c напоминанием срока выполнения задачи
     и его отправки по электронной почте. Является задачей для
     постановки в очередь выполнения Celery beat.
    """
    templates = Jinja2Templates(directory=settings.templates_dir)
    template = templates.get_template(name="send_reminder.html")

    engine = create_engine(settings.db_settings.db_url.replace("+asyncpg", ""))
    SessionLocal = sessionmaker(bind=engine)

    with SessionLocal() as session:
        now_utc = datetime.now(pytz.UTC)

        reminders = (
            session.execute(
                select(Reminder).where(
                    Reminder.status == ReminderStatus.QUEUED,
                    Reminder.send_time <= now_utc,
                )
            )
            .scalars()
            .all()
        )

        for reminder in reminders:

            user_email = reminder.task.tasklist.project.user.email
            html_content = create_email_content(reminder.task, template)

            message = MIMEMultipart()
            message["From"] = settings.email_settings.EMAIL_USERNAME
            message["To"] = user_email
            message["Subject"] = "Напоминание по задаче"
            message.attach(MIMEText(html_content, "html"))

            send_mail(message)
            reminder.status = ReminderStatus.SENT

        session.commit()


@celery_app.task(bind=True, max_retries=5, default_retry_delay=30)
def send_deadline_coming_reminder(self: CeleryTask) -> None:
    """
    Отправить уведомление о приближении срока завершения задачи.

    Функция проходит по всем задачам, у которых deadline не более чем на 24
     часа превышае текущее время, статус не DONE, и отправляет уведомление
     пользователю на почту. Создает запись в таблице reminders
     со статусом SENT.
    """
    templates = Jinja2Templates(directory=settings.templates_dir)
    template = templates.get_template(name="deadline_coming_reminder.html")

    engine = create_engine(settings.db_settings.db_url.replace("+asyncpg", ""))
    SessionLocal = sessionmaker(bind=engine)

    with SessionLocal() as session:
        reminder_time = datetime.now(pytz.UTC) + timedelta(days=1)

        overdue_tasks = (
            session.execute(
                select(Task).where(
                    Task.status == TaskStatus.IN_PROGRESS,
                    Task.deadline <= reminder_time,
                )
            )
            .scalars()
            .all()
        )

        for task in overdue_tasks:

            existing_reminder = session.execute(
                select(Reminder).where(
                    Reminder.task_id == task.id,
                    Reminder.status == ReminderStatus.SENT,
                    Reminder.send_time >= task.deadline - timedelta(days=1),
                )
            ).all()

            if not existing_reminder:

                user_email = task.tasklist.project.user.email
                html_content = create_email_content(task, template)

                message = MIMEMultipart()
                message["From"] = settings.email_settings.EMAIL_USERNAME
                message["To"] = user_email
                message["Subject"] = (
                    "Приближается срок выполнения задачи  TaslFlow"
                )
                message.attach(MIMEText(html_content, "html", "utf-8"))

                send_mail(message)
                session.add(
                    Reminder(
                        task_id=task.id,
                        send_time=datetime.now(pytz.UTC),
                        status=ReminderStatus.SENT,
                        was_read=False,
                    )
                )

        session.commit()


@celery_app.task(bind=True, max_retries=5, default_retry_delay=30)
def send_overdue_task_reminder(self: CeleryTask) -> None:
    """
    Отправить уведомление о просроченной задаче по дедлайну.

    Функция проходит по всем задачам, у которых deadline меньше текущего
     времени, статус не DONE, и отправляет уведомление пользователю на почту.
     Создает запись в таблице reminders со статусом SENT.
    """
    templates = Jinja2Templates(directory=settings.templates_dir)
    template = templates.get_template(name="overdue_deadline_reminder.html")

    engine = create_engine(settings.db_settings.db_url.replace("+asyncpg", ""))
    SessionLocal = sessionmaker(bind=engine)

    with SessionLocal() as session:
        now_utc = datetime.now(pytz.UTC)

        overdue_tasks = (
            session.execute(
                select(Task).where(
                    Task.status == TaskStatus.IN_PROGRESS,
                    Task.deadline <= now_utc
                )
            )
            .scalars()
            .all()
        )

        for task in overdue_tasks:

            existing_reminder = session.execute(
                select(Reminder).where(
                    Reminder.task_id == task.id,
                    Reminder.status == ReminderStatus.SENT,
                    Reminder.send_time >= task.deadline,
                )
            ).all()

            if not existing_reminder:

                user_email = task.tasklist.project.user.email
                html_content = create_email_content(task, template)

                message = MIMEMultipart()
                message["From"] = settings.email_settings.EMAIL_USERNAME
                message["To"] = user_email
                message["Subject"] = "Срок задачи истёк TaslFlow"
                message.attach(MIMEText(html_content, "html", "utf-8"))

                send_mail(message)
                session.add(
                    Reminder(
                        task_id=task.id,
                        send_time=datetime.now(pytz.UTC),
                        status=ReminderStatus.SENT,
                        was_read=False,
                    )
                )

        session.commit()


@celery_app.task(bind=True, max_retries=5, default_retry_delay=30)
def send_start_task_reminder(self: CeleryTask) -> None:
    """
    Отправить напоминание о наступление срока начала выполнения задачи.

    Функция формирования сообщения c напоминанием о сроке начала выполнения
     задачи и его отправки по электронной почте. Является задачей для
     постановки в очередь выполнения Celery beat.
    """
    templates = Jinja2Templates(directory=settings.templates_dir)
    template = templates.get_template(name="start_task_reminder.html")

    engine = create_engine(settings.db_settings.db_url.replace("+asyncpg", ""))
    SessionLocal = sessionmaker(bind=engine)

    with SessionLocal() as session:
        now_utc = datetime.now(pytz.UTC)

        tasks = (
            session.execute(
                select(Task).where(
                    Task.status == TaskStatus.SCHEDULE,
                    Task.start_at <= now_utc
                )
            )
            .scalars()
            .all()
        )

        for task in tasks:

            user_email = task.tasklist.project.user.email
            html_content = create_email_content(task, template)

            message = MIMEMultipart()
            message["From"] = settings.email_settings.EMAIL_USERNAME
            message["To"] = user_email
            message["Subject"] = f"Напоминание о старте задачи: {task.name}"
            message.attach(MIMEText(html_content, "html"))

            send_mail(message)
            task.status = TaskStatus.IN_PROGRESS
            session.add(
                Reminder(
                    send_time=datetime.now(pytz.UTC),
                    channel=ReminderChannel.EMAIL,
                    status=ReminderStatus.SENT,
                    was_read=False,
                    task_id=task.id,
                )
            )

        session.commit()


@celery_app.task(bind=True, max_retries=5, default_retry_delay=30)
def unlock_expired_users(self: CeleryTask) -> None:
    """Раз в минуту находит заблокированных пользователей.

    Если часовой ключ в Redis истек, меняет статус is_blocked
    на False в базе данных.
    """
    db_url = settings.db_settings.db_url.replace("+asyncpg", "")
    engine = create_engine(db_url)
    SessionLocal = sessionmaker(bind=engine)

    redis_sync = redis.Redis.from_url(
        settings.redis_settings.redis_url, decode_responses=True
    )

    with SessionLocal() as session:
        # Ищем строго тех, кто заблокирован за перебор паролей
        query = select(User).where(User.is_blocked)
        blocked_users = session.execute(query).scalars().all()

        if not blocked_users:
            return

        has_updates = False
        for user in blocked_users:
            lock_key = f"locked_user:{user.email}"

            # Если ключа в Redis больше нет — значит, час прошёл
            if not redis_sync.exists(lock_key):
                user.is_blocked = False
                has_updates = True

        if has_updates:
            session.commit()
