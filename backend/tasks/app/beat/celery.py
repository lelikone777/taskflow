from celery import Celery
from celery.schedules import crontab
from core.config import settings

# celery worker
celery_app = Celery(
    "TaskFlow",
    broker=settings.redis_settings.redis_url,
    backend=settings.redis_settings.redis_url,
    include=["beat.tasks"],
)


# celery beat
celery_app.conf.beat_schedule = {
    "schedule_reminders": {
        "task": "beat.tasks.send_reminder_task",
        "schedule": crontab(),
    },
    "task_start_reminders": {
        "task": "beat.tasks.send_start_task_reminder",
        "schedule": crontab(),
    },
    "deadline_coming": {
        "task": "beat.tasks.send_deadline_coming_reminder",
        "schedule": crontab(minute="*/1"),
    },
    "overdue_task": {
        "task": "beat.tasks.send_overdue_task_reminder",
        "schedule": crontab(minute="*/1"),
    },
    "cleanup_inactive_tokens": {
        "task": "beat.tasks.cleanup_inactive_tokens_task",
        "schedule": crontab(minute="*/5"),
    },
    "auto_unlock_users": {
        "task": "beat.tasks.unlock_expired_users",
        "schedule": crontab(minute="*/1"),
    },
}
