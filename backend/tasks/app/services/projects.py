from datetime import datetime

from database.db import connection
from models.enums import ProjectStatus, TaskPriority, TaskStatus, Timezone
from models.taskflow import Project, Tag, Task
from models.users import User
from schemas.filters import ProjectFilter, ProjectSort, TaskFilter
from schemas.projects import ProjectDetail, ProjectInfo, ProjectsList
from schemas.tasks import TaskInfo
from sqlalchemy import and_, case, or_, select
from sqlalchemy.ext.asyncio import AsyncSession


@connection
async def get_tasks(
    list_id: int, timezone: Timezone, filters: TaskFilter, session: AsyncSession
) -> list[Task]:
    """
    Получить задачи из списка задач.

    Args:
        list_id (int): Идентификатор списка задач
        timezone (Timezone): Часовой пояс пользователя
        filters (TaskFilter): Параметры поиска, фильтрации и сортировки
        session (AsyncSession): Экземпляр сессии для доступа к базе данных
    Returns:
        list[TaskInfo]: Валидированный список задач с учетом параметров поиска,
                         фильтрации и сортировки.
    """

    query_filters = [
        or_(
            Task.name.icontains(filters.q),
            Task.description.icontains(filters.q),
        ),
    ]
    if filters.tag:
        query_filters.append(Task.tags.any(Tag.name.in_(filters.tag)))

    if filters.priority:
        query_filters.append(Task.priority.in_(filters.priority))

    if filters.deadline_from:
        query_filters.append(Task.deadline >= filters.deadline_from)

    if filters.deadline_to:
        query_filters.append(Task.deadline <= filters.deadline_to)

    query = (
        select(Task)
        .where(Task.tasklist_id == list_id)
        .filter(*query_filters)
        .order_by(
            case(
                (Task.status == TaskStatus.IN_PROGRESS, 0),
                (Task.status == TaskStatus.SCHEDULE, 1),
                (Task.status == TaskStatus.DONE, 2),
            ),
            case(
                (
                    and_(
                        Task.status == TaskStatus.IN_PROGRESS,
                        Task.priority == TaskPriority.HIGH,
                    ),
                    0,
                ),
                (
                    and_(
                        Task.status == TaskStatus.IN_PROGRESS,
                        Task.priority == TaskPriority.MID,
                        Task.deadline < datetime.now(),
                    ),
                    1,
                ),
                (
                    and_(
                        Task.status == TaskStatus.IN_PROGRESS,
                        Task.priority == TaskPriority.LOW,
                        Task.deadline < datetime.now(),
                    ),
                    2,
                ),
                (
                    and_(
                        Task.status == TaskStatus.IN_PROGRESS,
                        Task.priority == TaskPriority.MID,
                    ),
                    3,
                ),
                (
                    and_(
                        Task.status == TaskStatus.IN_PROGRESS,
                        Task.priority == TaskPriority.LOW,
                    ),
                    4,
                ),
            ),
            case(
                (Task.priority == TaskPriority.HIGH, 0),
                (Task.priority == TaskPriority.MID, 1),
                (Task.priority == TaskPriority.LOW, 2),
            ),
            Task.deadline,
        )
    )
    result = await session.execute(query)

    tasks = [TaskInfo.model_validate(task) for task in result.scalars().all()]
    for task in tasks:
        task.user_timezone = timezone

    return tasks


async def get_project_detail(
    project_orm: Project, filters: TaskFilter = None
) -> ProjectDetail:
    """
    Получить детали проекта.

    Возвращает объект проекта со всеми полями и дополнительными
     агрегирующими полями (подсчет количетсва выполненных и всех задач).
     Для связанных задач проекта возвращаются только id задач, соотвутсвующих
     параметрам поиска и фильтрации.

    Args:
        project_orm (Project): Экземпляр проекта из базы дынных.
        search_param (str, optional): Подстрока для поиска задач.
        filters: (TaskFilter): Схема фильтрации и сортировки задач.

    Returns:
        ProjectDetail: Экземпляр pydantic модели с деталями проекта.
    """

    timezone = project_orm.user.timezone
    project = ProjectDetail.model_validate(project_orm)
    project.user_timezone = timezone
    for tasklist in project.tasklists:
        tasklist.tasks = await get_tasks(tasklist.id, timezone, filters)

    return project


@connection
async def get_projects(
    user: User, filters: ProjectFilter, session: AsyncSession
) -> ProjectsList:
    """
    Получить из базы данных список проектов пользователя.

    Args:
        user (User): Объект пользователя.
        user (User): Объект пользователя.
        filters: (ProjectFilter): Схема фильтрации и сортировки проектов.
        session (AsyncSession): Экземпляр сессии для доступа к базе данных.

    Returns:
        ProjectsList: Список проектов пользователя с данными по схеме.
    """

    statuses = (
        [ProjectStatus.IN_PROGRESS, ProjectStatus.ON_PAUSE, ProjectStatus.DONE]
        if not filters.status
        else filters.status
    )

    sort_params = [
        case(
            (Project.status == ProjectStatus.IN_PROGRESS, 0),
            (Project.status == ProjectStatus.ON_PAUSE, 1),
            (Project.status == ProjectStatus.DONE, 2),
        ),
    ]
    match filters.order_by:
        case None | ProjectSort.CREATED_DESC:
            sort_params = [Project.created_at.desc(), Project.id.desc()]
        case ProjectSort.CREATED_ASC:
            sort_params = [Project.created_at, Project.id]
        case ProjectSort.NAME_ASC:
            sort_params = [
                Project.name,
            ]
        case ProjectSort.NAME_DESC:
            sort_params = [
                Project.name.desc(),
            ]
        case ProjectSort.URGENT:
            sort_params.append(Project.deadline)
        case ProjectSort.NON_URGENT:
            sort_params.append(Project.deadline.desc())

    query = (
        select(Project)
        .where(Project.user_id == user.id)
        .filter(Project.name.icontains(filters.q), Project.status.in_(statuses))
        .order_by(*sort_params)
    )
    result = await session.execute(query)

    projects = [
        ProjectInfo.model_validate(project) for project in result.scalars().all()
    ]

    for project in projects:
        project.user_timezone = user.timezone

    return ProjectsList(projects=projects)
