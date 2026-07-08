# Backend

## Название проекта

TaskFlow

## 🔗 Быстрые ссылки

- [🎨 Дизайн](https://www.figma.com/design/HlDqzktwjQv6gyL5HdjP5s/TaskFlow?node-id=0-1&p=f&t=7ALAH3o74p1Kj5QR-0)
- [📚 Документация - ТЗ](https://docs.google.com/document/d/1izlsoCyDkHfx6aIstXH8drE8Wlw1pY11/edit)

## Цель проекта

Разработка полнофункционального таск-трекера с разделением на backend и frontend, направленного на практику командной
разработки, освоение актуального стека и демонстрацию навыков взаимодействия через API, работу с очередями,
авторизацией, загрузкой файлов.

## Краткое описание функциональности

Разработка личного таск-трекера, который позволит пользователю управлять личными проектами, разбивать их на задачи и
подзадачи, устанавливать дедлайны и напоминания, прикреплять файлы, экспортировать задачи и управлять ими через
Telegram-бота (в будущем).
Поддерживаются базовые функции CRUD, авторизация, фильтрация, работа с хранилищем файлов, напоминания через фоновые
задачи и WebPush/email.

## Целевая аудитория

Индивидуальные пользователи, в первую очередь разработчики, проектные менеджеры и люди, предпочитающие структурированный
подход к личной эффективности.

## Технические требования

### Бэкенд

FastAPI + Uvicorn
SQLModel → PostgreSQL
MinIO (S3-совместимое хранилище)
Celery + Redis (фоновая обработка задач и напоминания)
Poetry
Docker + Docker Compose
OAuth2/JWT — авторизация

## Техническое задание

[Ссылка на актуальное ТЗ](https://docs.google.com/document/d/1izlsoCyDkHfx6aIstXH8drE8Wlw1pY11/edit?usp=sharing&ouid=109238372050680890850&rtpof=true&sd=true)

## Состав команды

| Роль               | Имя        | Контакт         |
|--------------------|------------|-----------------|
| PM                 | Элина      | @bakaeva_elina  |
| Teamlead design    | Лидия      | @lida           |
| Designer           | Александра | @aefremova      |
| Designer           | Алексей    | @alexey_bulanov |
| Designer           | Анастасия  | @nastasia       |
| Backend Developer  | Олег       | @omiskhozhev    |
| Frontend Developer | Анна       | @annagorbacheva |
| Frontend Developer | Мария      | @mariya_g       |

## Как развернуть проект локально

### Локально (с помощью Docker Compose)

* клонируйте проект

```
git clone https://gitlab.pointpulse.ru/l1/taskflow/backend.git
```

* перейдите в ветку develop

```
git checkout develop
```

* создайте файл `.env` в корне проекта и заполните его по примеру из `.env.example`

* установите и запустите Docker, используйте официальную документацию для установки.

* запустите проект в Docker и выполните миграции

```
docker compose up --build -d
docker exec -it tasks_backend alembic upgrade head
docker exec -it flow_backend alembic upgrade head
```

* при необходимости загрузите тестовые данные в базу данных:

```
docker exec -it tasks_backend python3 test_data/load_test_data.py
```

Проект будет доступен по адресам:

- http://localhost/api/tasks — раздел проектов
- http://localhost/api/tasks/redoc — документация раздела проектов
- http://localhost/api/flow — flow режим
- http://localhost/api/flow/redoc — документация flow режима

* остановка основного проекта (`docker-compose.yml` в корне)

```
docker compose down
```

### Тесты в Docker

Шаблон: `cp .env.test.example .env.test` (Windows: `Copy-Item .env.test.example .env.test`).  
Тесты flow — `tests/flow/`, tasks — `tests/tasks/`; в команде всегда указывайте `-c pytest.flow.ini` или
`-c pytest.tasks.ini`.  
Покрытие задано в этих ini-файлах.

**Flow** (Postgres на хосте **5435**):

```
docker compose -f docker-compose.flow.test.yml --env-file .env.test up -d flow_db_test
docker compose -f docker-compose.flow.test.yml --env-file .env.test run --rm flow_tests pytest -c pytest.flow.ini tests/flow
docker compose -f docker-compose.flow.test.yml --env-file .env.test down
```

Для `tests/flow/unit` или `tests/flow/integration` замените путь в команде `run`. Том БД: `down -v`.

**Tasks** (Postgres на хосте **5436**):

```
docker compose -f docker-compose.tasks.test.yml --env-file .env.test up -d tasks_db_test
docker compose -f docker-compose.tasks.test.yml --env-file .env.test run --rm tasks_tests pytest -c pytest.tasks.ini tests/tasks
docker compose -f docker-compose.tasks.test.yml --env-file .env.test down
```

Аналогично: `tests/tasks/unit`, `tests/tasks/integration`, остановка с `down -v`.

Flow и tasks можно гонять параллельно в разных терминалах — отдельные compose-проекты и порты **5435** / **5436**.

### Запуск через терминал

Ограниченная функциональность: Redis, Celery и MinIO недоступны.
Используйте для разработки; нужна локальная установка Poetry.
Из корня репозитория backend:

```
poetry install                              # установить зависимости
poetry shell                                # активировать окружение (по желанию)
cd tasks/app                                # раздел tasks
poetry run alembic upgrade head             # миграции tasks
poetry run uvicorn main:app --reload        # сервер tasks (остановка Ctrl+C)
```

Для раздела flow отдельно: `cd flow/app`, затем `poetry run alembic upgrade head` и
`poetry run uvicorn main:app --reload`.

### Качество кода (black/ruff/mypy)

Из корня backend:

```
poetry run ruff check .                     # линтер
poetry run ruff check . --fix               # автоисправление части замечаний ruff
poetry run ruff format .                    # форматирование (ruff)
poetry run black .                          # форматирование (black)
poetry run mypy                             # типы только flow/app и tasks/app (настроено в pyproject.toml)
poetry run mypy flow/app                    # типы только flow
poetry run mypy tasks/app                   # типы только tasks
```

Демонстрация через ngrok или запись экрана
