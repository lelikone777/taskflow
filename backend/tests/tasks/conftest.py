import os
import sys
from pathlib import Path
from unittest.mock import patch

import asyncpg
import pytest_asyncio
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

ROOT_DIR = Path(__file__).resolve().parents[2]
TASKS_APP_DIR = ROOT_DIR / "tasks" / "app"

if str(TASKS_APP_DIR) not in sys.path:
    sys.path.insert(0, str(TASKS_APP_DIR))

from database.db import Base  # noqa: E402

DB_USER = os.getenv("TASKS_DB_USER")
DB_PASS = os.getenv("TASKS_DB_PASSWORD")
DB_HOST = os.getenv("TASKS_DB_HOST")
DB_PORT = os.getenv("TASKS_DB_PORT")
DB_NAME = os.getenv("TASKS_DB")

ASYNC_URL = f"postgresql+asyncpg://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"


@pytest_asyncio.fixture(scope="function", autouse=True)
async def manage_db():
    conn = await asyncpg.connect(
        user=DB_USER,
        password=DB_PASS,
        database="postgres",
        host=DB_HOST,
        port=DB_PORT,
    )

    await conn.execute(f"""
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = '{DB_NAME}'
    """)

    exists = await conn.fetchval(
        "SELECT 1 FROM pg_database WHERE datname = $1",
        DB_NAME,
    )

    if exists:
        await conn.execute(f'DROP DATABASE "{DB_NAME}"')

    await conn.execute(f'CREATE DATABASE "{DB_NAME}"')
    await conn.close()

    yield

    conn = await asyncpg.connect(
        user=DB_USER,
        password=DB_PASS,
        database="postgres",
        host=DB_HOST,
        port=DB_PORT,
    )
    await conn.execute(f"""
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = '{DB_NAME}'
    """)
    await conn.execute(f'DROP DATABASE IF EXISTS "{DB_NAME}"')
    await conn.close()


@pytest_asyncio.fixture(scope="function")
async def db_engine(manage_db):
    engine = create_async_engine(ASYNC_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture(autouse=True)
async def mock_session_maker(db_engine):
    test_session_maker = async_sessionmaker(
        bind=db_engine,
        expire_on_commit=False,
    )
    with patch("database.db.async_session_maker", test_session_maker):
        yield test_session_maker
