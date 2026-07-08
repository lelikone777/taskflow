from typing import Any

from core.dependency import AuthDependency, ProjectPathDependency
from fastapi import APIRouter, Query, status
from fastapi.exceptions import RequestValidationError
from models.taskflow import Project
from pydantic import ValidationError
from routers.attachments import attachments_router
from routers.tags import tags_router
from routers.tasklist import tasklist_router
from schemas.filters import ProjectFilter, TaskFilter
from schemas.projects import (
    ProjectCreate,
    ProjectDetail,
    ProjectsList,
    ProjectUpdate,
)
from services.base import service
from services.projects import get_project_detail, get_projects

project_router = APIRouter(prefix="/projects", tags=["Проекты"])
project_router.include_router(tags_router)
project_router.include_router(attachments_router)


@project_router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    response_model=ProjectDetail,
    summary="Создать проект",
)
async def create_project(
    user: AuthDependency, project_data: ProjectCreate
) -> ProjectDetail:

    try:
        project_data.user_timezone = user.timezone
    except ValidationError as e:
        raise RequestValidationError(e.errors()) from e

    new_project: dict[str, Any] = project_data.model_dump()
    new_project["user_id"] = user.id
    project: Project = await service.add(Project, new_project)

    return await get_project_detail(project)


@project_router.get(
    "/", response_model=ProjectsList, summary="Получить список проектов"
)
async def get_projects_list(
    user: AuthDependency,
    project_filters: ProjectFilter = Query(title="Фильтры и сортировка"),
) -> ProjectsList:

    return await get_projects(user, project_filters)


@project_router.get(
    "/{project_id}", response_model=ProjectDetail, summary="Детали проекта"
)
async def get_project(
    objects: ProjectPathDependency,
    task_filters: TaskFilter = Query(title="Фильтры и сортировка"),
) -> ProjectDetail:

    return await get_project_detail(objects.project, task_filters)


@project_router.patch(
    "/{project_id}", response_model=ProjectDetail, summary="Обновить проект"
)
async def update_project(
    objects: ProjectPathDependency,
    update_data: ProjectUpdate,
    task_filters: TaskFilter = Query(title="Фильтры и сортировка"),
) -> ProjectDetail:

    try:
        update_data.user_timezone = objects.project.user.timezone
        update_data.project = objects.project
    except ValidationError as e:
        raise RequestValidationError(e.errors()) from e

    valid_update_data: dict[str, Any] = update_data.model_dump(
        exclude_unset=True
    )
    valid_update_data["id"] = objects.project.id
    updated_project: Project = await service.update(Project, valid_update_data)

    return await get_project_detail(updated_project, task_filters)


project_router.include_router(tasklist_router)
