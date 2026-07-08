import { api } from './client';
import { getProjectIdByListId } from './lists';
import type { TaskReminderRepeat } from '@/shared/lib/taskMeta';

export type TaskStatus = 'planned' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export type Task = {
  id: number;
  listId: number;
  projectId?: number;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  assigneeId?: number | null;
  tagIds: number[];
  createdById: number;
  isArchived: boolean;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  reminderDate?: string | null;
  reminderTimeHour?: number | null;
  reminderTimeMinutes?: number | null;
  reminderRepeat?: TaskReminderRepeat;
};

export type TaskListParams = {
  q?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  tagId?: number;
  tagNames?: string[];
  dueFrom?: string;
  dueTo?: string;
};

export type TaskCreatePayload = {
  title: string;
  description?: string;
  dueDate?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  assigneeId?: number;
  tagIds?: number[];
};

export type TaskUpdatePayload = {
  title?: string;
  description?: string;
  dueDate?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  assigneeId?: number | null;
  tagIds?: number[];
  isArchived?: boolean;
  startAt?: string | null;
  deadline?: string | null;
};

type ApiTaskStatus = string;
type ApiTaskPriority = string;

type ProjectTaskRef = number | { id: number } | TaskResponse;

type ProjectTaskListResponse = {
  id: number;
  tasks?: ProjectTaskRef[] | null;
};

type ProjectDetailResponse = {
  id: number;
  task_lists?: ProjectTaskListResponse[] | null;
  tasks_list?: ProjectTaskListResponse[] | null;
  tasklists?: ProjectTaskListResponse[] | null;
};

type ProjectResponse = {
  id: number;
};

type ProjectsListResponse = {
  projects: ProjectResponse[];
};

type TaskTagResponse = {
  id: number;
};

type TaskResponse = {
  id: number;
  task_list_id?: number;
  name: string;
  description?: string | null;
  deadline?: string | null;
  deadline_date?: string | null;
  deadlineDate?: string | null;
  priority?: ApiTaskPriority | null;
  status?: ApiTaskStatus | null;
  tags?: TaskTagResponse[] | null;
  created_at?: string | null;
  createdAt?: string | null;
  updated_at?: string | null;
  updatedAt?: string | null;
  completed_at?: string | null;
  completedAt?: string | null;
  done_at?: string | null;
  doneAt?: string | null;
  closed_at?: string | null;
  closedAt?: string | null;
  reminder_date?: string | null;
  reminder_time_hour?: number | null;
  reminder_time_minutes?: number | null;
  reminder_periodic?: string | null;
};

const taskRouteMap = new Map<number, { projectId: number; listId: number }>();
const taskCompletionMap = new Map<number, string>();
const ROUTE_RESOLVE_PROJECT_STATUSES = ['В работе', 'Приостановлен', 'Завершен', 'Архивный'] as const;

function nowIso(): string {
  return new Date().toISOString();
}

function toIsoDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return null;
  return new Date(timestamp).toISOString();
}

function toDateOnly(value?: string | null): string | null | undefined {
  if (value === null) return null;
  if (!value) return undefined;
  return value.slice(0, 10);
}

function normalizeEnumValue(value?: string | null): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function isPlannedStatus(value?: string | null): boolean {
  const normalized = normalizeEnumValue(value);
  return (
    normalized.includes('schedule') ||
    normalized.includes('planned') ||
    normalized.includes('\u0437\u0430\u043f\u043b\u0430\u043d')
  );
}

function isDoneStatus(value?: string | null): boolean {
  const normalized = normalizeEnumValue(value);
  return (
    normalized.includes('done') ||
    normalized.includes('close') ||
    normalized.includes('\u0437\u0430\u0432\u0435\u0440\u0448')
  );
}

function isInProgressStatus(value?: string | null): boolean {
  const normalized = normalizeEnumValue(value);
  return (
    normalized.includes('in_progress') ||
    normalized.includes('progress') ||
    normalized.includes('\u0440\u0430\u0431\u043e\u0442')
  );
}

function toApiStatus(value?: TaskStatus): ApiTaskStatus | undefined {
  if (!value) return undefined;
  if (value === 'planned') return 'schedule';
  if (value === 'done') return 'done';
  return 'in_progress';
}

function fromApiStatus(value?: ApiTaskStatus | null): TaskStatus {
  if (isDoneStatus(value)) return 'done';
  if (isPlannedStatus(value)) return 'planned';
  if (isInProgressStatus(value)) return 'in_progress';
  return 'in_progress';
}

function isLowPriority(value?: string | null): boolean {
  const normalized = normalizeEnumValue(value);
  return normalized.includes('low') || normalized.includes('\u043d\u0438\u0437\u043a');
}

function isMediumPriority(value?: string | null): boolean {
  const normalized = normalizeEnumValue(value);
  return (
    normalized.includes('mid') ||
    normalized.includes('medium') ||
    normalized.includes('\u0441\u0440\u0435\u0434')
  );
}

function isHighPriority(value?: string | null): boolean {
  const normalized = normalizeEnumValue(value);
  return normalized.includes('high') || normalized.includes('\u0432\u044b\u0441\u043e\u043a');
}

function toApiPriority(value?: TaskPriority): ApiTaskPriority | undefined {
  if (!value) return undefined;
  if (value === 'low') return '\u041d\u0438\u0437\u043a\u0438\u0439';
  if (value === 'medium') return '\u0421\u0440\u0435\u0434\u043d\u0438\u0439';
  if (value === 'high' || value === 'critical') return '\u0412\u044b\u0441\u043e\u043a\u0438\u0439';
  return '\u0421\u0440\u0435\u0434\u043d\u0438\u0439';
}

function fromApiPriority(value?: ApiTaskPriority | null): TaskPriority {
  if (isLowPriority(value)) return 'low';
  if (isMediumPriority(value)) return 'medium';
  if (isHighPriority(value)) return 'high';
  return 'medium';
}

const CREATED_AT_KEYS: Array<keyof TaskResponse> = ['created_at', 'createdAt'];
const UPDATED_AT_KEYS: Array<keyof TaskResponse> = ['updated_at', 'updatedAt'];
const COMPLETED_AT_KEYS: Array<keyof TaskResponse> = [
  'completed_at',
  'completedAt',
  'done_at',
  'doneAt',
  'closed_at',
  'closedAt',
];

function pickTaskDate(task: TaskResponse, keys: Array<keyof TaskResponse>): string | null {
  for (const key of keys) {
    const rawValue = task[key];
    if (typeof rawValue !== 'string') continue;
    const parsedValue = toIsoDate(rawValue);
    if (parsedValue) return parsedValue;
  }
  return null;
}

function resolveCompletedAt(task: TaskResponse, status: TaskStatus, updatedAt: string, createdAt: string): string | null {
  if (status !== 'done') {
    taskCompletionMap.delete(task.id);
    return null;
  }

  const apiCompletedAt = pickTaskDate(task, COMPLETED_AT_KEYS);
  if (apiCompletedAt) {
    taskCompletionMap.set(task.id, apiCompletedAt);
    return apiCompletedAt;
  }

  const cachedCompletedAt = taskCompletionMap.get(task.id);
  if (cachedCompletedAt) {
    return cachedCompletedAt;
  }

  const fallbackCompletedAt = updatedAt || createdAt || nowIso();
  taskCompletionMap.set(task.id, fallbackCompletedAt);
  return fallbackCompletedAt;
}

function resolveDueDate(task: TaskResponse): string | null {
  const value = task.deadline ?? task.deadline_date ?? task.deadlineDate ?? null;
  if (!value) {
    return null;
  }
  if (!value.includes('T')) {
    return value;
  }
  return toIsoDate(value) ?? value;
}

function mapTask(task: TaskResponse, projectId: number, listId: number): Task {
  const status = fromApiStatus(task.status);
  const createdAt = pickTaskDate(task, CREATED_AT_KEYS) ?? nowIso();
  const updatedAt = pickTaskDate(task, UPDATED_AT_KEYS) ?? createdAt;
  const completedAt = resolveCompletedAt(task, status, updatedAt, createdAt);

  return {
    id: task.id,
    listId: task.task_list_id ?? listId,
    projectId,
    title: task.name,
    description: task.description ?? null,
    dueDate: resolveDueDate(task),
    priority: fromApiPriority(task.priority),
    status,
    assigneeId: null,
    tagIds: (task.tags ?? []).map((tag) => tag.id),
    createdById: 0,
    isArchived: false,
    completedAt,
    createdAt,
    updatedAt,
    reminderDate: task.reminder_date ?? null,
    reminderTimeHour: typeof task.reminder_time_hour === 'number' ? task.reminder_time_hour : null,
    reminderTimeMinutes: typeof task.reminder_time_minutes === 'number' ? task.reminder_time_minutes : null,
    reminderRepeat:
      normalizeEnumValue(task.reminder_periodic).includes('ежеднев')
        ? 'daily'
        : normalizeEnumValue(task.reminder_periodic).includes('еженед')
          ? 'weekly'
          : normalizeEnumValue(task.reminder_periodic).includes('ежемесяч')
            ? 'monthly'
            : normalizeEnumValue(task.reminder_periodic).includes('пн-пт')
              ? 'workdays'
              : 'none',
  };
}

async function syncTaskTags(
  route: { projectId: number; listId: number },
  taskId: number,
  tagIds: number[],
): Promise<void> {
  await api.patch(`/projects/${route.projectId}/tasklist/${route.listId}/task/${taskId}/tags/`, {
    tag_ids: tagIds,
  });
}

async function syncTaskStatus(
  route: { projectId: number; listId: number },
  taskId: number,
  status?: TaskStatus,
  period?: { startAt?: string | null; deadline?: string | null },
): Promise<void> {
  const nextStatus = toApiStatus(status);
  if (!nextStatus) {
    return;
  }
  await api.patch(`/projects/${route.projectId}/tasklist/${route.listId}/task/${taskId}/status`, {
    status: nextStatus,
    ...(nextStatus === 'schedule' && period?.startAt ? { start_at: period.startAt } : {}),
    ...(nextStatus === 'schedule' && period?.deadline ? { deadline: period.deadline } : {}),
  });
}

async function syncTaskPeriod(
  route: { projectId: number; listId: number },
  taskId: number,
  dueDate?: string | null,
): Promise<void> {
  if (dueDate === undefined || dueDate === null) {
    return;
  }
  const deadlineDate = toDateOnly(dueDate);
  if (!deadlineDate) {
    return;
  }
  await api.patch(`/projects/${route.projectId}/tasklist/${route.listId}/task/${taskId}/period`, {
    deadline_date: deadlineDate,
    deadline_hour: 23,
    deadline_minutes: 59,
  });
}

function resolveTaskRefId(task: ProjectTaskRef): number | null {
  if (typeof task === 'number') return task;
  if (typeof task === 'object' && task !== null && 'id' in task && typeof task.id === 'number') {
    return task.id;
  }
  return null;
}

function isDetailedTask(task: ProjectTaskRef): task is TaskResponse {
  return (
    typeof task === 'object' &&
    task !== null &&
    'id' in task &&
    'name' in task
  );
}

function getProjectTaskLists(project: ProjectDetailResponse): ProjectTaskListResponse[] {
  return project.task_lists ?? project.tasks_list ?? project.tasklists ?? [];
}

async function fetchProjectsForRouteResolution(): Promise<ProjectResponse[]> {
  const { data } = await api.get<ProjectResponse[] | ProjectsListResponse>('/projects/', {
    params: { status: ROUTE_RESOLVE_PROJECT_STATUSES },
    paramsSerializer: { indexes: null },
  });

  return Array.isArray(data) ? data : data.projects;
}

async function resolveRouteByTaskId(taskId: number): Promise<{ projectId: number; listId: number }> {
  const knownRoute = taskRouteMap.get(taskId);
  if (knownRoute) {
    return knownRoute;
  }

  const projects = await fetchProjectsForRouteResolution();

  for (const project of projects) {
    const projectDetail = await api.get<ProjectDetailResponse>(`/projects/${project.id}`);
    const lists = getProjectTaskLists(projectDetail.data);
    for (const list of lists) {
      const hasTask = (list.tasks ?? []).some((task) => resolveTaskRefId(task) === taskId);
      if (hasTask) {
        const route = { projectId: project.id, listId: list.id };
        taskRouteMap.set(taskId, route);
        return route;
      }
    }
  }

  throw new Error('Task not found');
}

export async function resolveTaskRoute(taskId: number): Promise<{ projectId: number; listId: number }> {
  return resolveRouteByTaskId(taskId);
}

async function resolveProjectIdByListId(listId: number): Promise<number> {
  const knownProjectId = getProjectIdByListId(listId);
  if (knownProjectId) {
    return knownProjectId;
  }

  const projects = await fetchProjectsForRouteResolution();

  for (const project of projects) {
    const projectDetail = await api.get<ProjectDetailResponse>(`/projects/${project.id}`);
    const lists = getProjectTaskLists(projectDetail.data);
    const hasList = lists.some((item) => item.id === listId);
    if (hasList) {
      return project.id;
    }
  }

  throw new Error('Project for list is not resolved');
}

export async function fetchTasks(listId: number, params?: TaskListParams): Promise<Task[]> {
  const projectId = await resolveProjectIdByListId(listId);

  const projectDetail = await api.get<ProjectDetailResponse>(`/projects/${projectId}`, {
    params: {
      ...(params?.q ? { q: params.q } : {}),
      ...(params?.tagNames && params.tagNames.length > 0 ? { tag: params.tagNames } : {}),
      ...(params?.status ? { status: toApiStatus(params.status) } : {}),
      ...(params?.priority ? { priority: toApiPriority(params.priority) } : {}),
      ...(params?.dueFrom ? { deadline_from: toDateOnly(params.dueFrom) } : {}),
      ...(params?.dueTo ? { deadline_to: toDateOnly(params.dueTo) } : {}),
    },
    paramsSerializer: { indexes: null },
  });
  const lists = getProjectTaskLists(projectDetail.data);
  const list = lists.find((item) => item.id === listId);
  if (!list) {
    return [];
  }

  const taskRefs = list.tasks ?? [];
  const detailedTasks = taskRefs.filter(isDetailedTask);
  const refsToLoad = taskRefs
    .filter((task): task is number | { id: number } => !isDetailedTask(task))
    .map(resolveTaskRefId)
    .filter((taskId): taskId is number => typeof taskId === 'number');

  const loadedTaskResponses = refsToLoad.length
    ? await Promise.all(
        refsToLoad.map((taskId) =>
          api.get<TaskResponse>(`/projects/${projectId}/tasklist/${listId}/task/${taskId}`),
        ),
      )
    : [];

  const mappedDetailed = detailedTasks.map((task) => mapTask(task, projectId, listId));
  const mappedLoaded = loadedTaskResponses.map((response) => mapTask(response.data, projectId, listId));
  const mapped = [...mappedDetailed, ...mappedLoaded].filter(
    (task, index, self) => self.findIndex((candidate) => candidate.id === task.id) === index,
  );

  mapped.forEach((task) => {
    taskRouteMap.set(task.id, { projectId, listId });
  });

  return mapped;
}

export async function createTask(listId: number, payload: TaskCreatePayload): Promise<Task> {
  const projectId = await resolveProjectIdByListId(listId);
  const route = { projectId, listId };

  const body = {
    name: payload.title,
    ...(payload.description !== undefined ? { description: payload.description } : {}),
    ...(payload.dueDate !== undefined ? { deadline: toDateOnly(payload.dueDate) } : {}),
    ...(payload.priority !== undefined ? { priority: toApiPriority(payload.priority) } : {}),
    ...(payload.status !== undefined ? { status: toApiStatus(payload.status) } : {}),
  };

  const { data } = await api.post<TaskResponse | null>(
    `/projects/${projectId}/tasklist/${listId}/task/`,
    body,
  );

  let task: Task | null = null;
  if (data && typeof data.id === 'number') {
    task = mapTask(data, projectId, listId);
  } else {
    const tasks = await fetchTasks(listId);
    const candidates = tasks.filter((item) => item.title === payload.title);
    task = candidates.sort((left, right) => right.id - left.id)[0] ?? tasks.sort((left, right) => right.id - left.id)[0] ?? null;
  }

  if (!task) {
    throw new Error('Created task was not found');
  }

  taskRouteMap.set(task.id, route);

  const hasFollowUpUpdates =
    payload.tagIds !== undefined ||
    payload.status !== undefined ||
    payload.dueDate !== undefined;

  if (payload.dueDate !== undefined) {
    await syncTaskPeriod(route, task.id, payload.dueDate);
  }

  if (payload.status !== undefined) {
    await syncTaskStatus(route, task.id, payload.status);
  }

  if (payload.tagIds !== undefined) {
    await syncTaskTags(route, task.id, payload.tagIds);
  }

  if (hasFollowUpUpdates) {
    return fetchTask(task.id);
  }

  return task;
}

export async function fetchTask(taskId: number): Promise<Task> {
  const route = await resolveRouteByTaskId(taskId);
  const { data } = await api.get<TaskResponse>(
    `/projects/${route.projectId}/tasklist/${route.listId}/task/${taskId}`,
  );

  const task = mapTask(data, route.projectId, route.listId);
  taskRouteMap.set(task.id, route);
  return task;
}

export async function updateTask(taskId: number, payload: TaskUpdatePayload): Promise<Task> {
  const route = await resolveRouteByTaskId(taskId);

  const infoBody = {
    ...(payload.title !== undefined ? { name: payload.title } : {}),
    ...(payload.description !== undefined ? { description: payload.description } : {}),
    ...(payload.priority !== undefined ? { priority: toApiPriority(payload.priority) } : {}),
  };

  let task: Task | null = null;
  if (Object.keys(infoBody).length > 0) {
    const { data } = await api.patch<TaskResponse | null>(
      `/projects/${route.projectId}/tasklist/${route.listId}/task/${taskId}`,
      infoBody,
    );
    if (data && typeof data.id === 'number') {
      task = mapTask(data, route.projectId, route.listId);
      taskRouteMap.set(task.id, route);
    }
  }

  const hasFollowUpUpdates =
    payload.tagIds !== undefined ||
    payload.status !== undefined ||
    payload.dueDate !== undefined;

  if (payload.dueDate !== undefined) {
    await syncTaskPeriod(route, taskId, payload.dueDate);
  }

  if (payload.status !== undefined) {
    await syncTaskStatus(route, taskId, payload.status, payload);
  }

  if (payload.tagIds !== undefined) {
    await syncTaskTags(route, taskId, payload.tagIds);
  }

  if (hasFollowUpUpdates || !task) {
    return fetchTask(taskId);
  }

  return task;
}

export async function moveTaskToList(taskId: number, targetListId: number): Promise<void> {
  const sourceRoute = await resolveRouteByTaskId(taskId);
  if (sourceRoute.listId === targetListId) {
    return;
  }

  const endpoint = `/projects/${sourceRoute.projectId}/tasklist/${sourceRoute.listId}/task/${taskId}/move`;
  try {
      await api.patch(endpoint, { tasklist_id: targetListId });

      // Update cached route without re-fetching every project detail.
      taskRouteMap.set(taskId, {
        projectId: sourceRoute.projectId,
        listId: targetListId,
      });
      return;
  } catch (error) {
    taskRouteMap.set(taskId, sourceRoute);
    if (error instanceof Error) {
      throw error;
    }

    throw new Error('Не удалось перенести задачу между этапами');
  }

  taskRouteMap.set(taskId, sourceRoute);

  throw new Error('Не удалось перенести задачу между этапами');
}

export async function deleteTask(taskId: number): Promise<void> {
  const route = await resolveRouteByTaskId(taskId);
  await api.delete(`/projects/${route.projectId}/tasklist/${route.listId}/task/${taskId}`);
  taskRouteMap.delete(taskId);
  taskCompletionMap.delete(taskId);
}
