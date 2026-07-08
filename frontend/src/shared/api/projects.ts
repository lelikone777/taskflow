import { api } from './client';

export type ProjectStatus =
  | 'in_progress'
  | 'not_active'
  | 'under_threat'
  | 'on_pause'
  | 'done'
  | 'archive'
  | 'deleted';
export type ProjectTaskListStatus = 'active' | 'archive' | 'deleted';

export type ProjectTaskList = {
  id: number;
  name: string;
  status: ProjectTaskListStatus;
  seqNumber?: number | null;
  tasks?: Array<{ id: number } | number> | null;
};

export type Project = {
  id: number;
  name: string;
  description?: string | null;
  startAt: string;
  createdAt: string;
  deadline: string;
  status: ProjectStatus;
  tasksCountAll?: number | null;
  tasksCountDone?: number | null;
  taskLists?: ProjectTaskList[] | null;
};

export type ProjectCreatePayload = {
  name: string;
  description?: string;
  startAt?: string;
  deadline?: string;
};

export type ProjectUpdatePayload = {
  name?: string;
  description?: string;
  startAt?: string;
  deadline?: string | null;
  status?: ProjectStatus;
};

export type ProjectListParams = {
  q?: string;
  status?: ProjectStatus | ProjectStatus[];
  orderBy?: string;
  limit?: number;
  offset?: number;
};

type ApiProjectStatus = string;
type ApiProjectTaskListStatus = string;

type ProjectResponse = {
  id: number;
  name: string;
  description?: string | null;
  start_at?: string;
  created_at?: string;
  deadline: string;
  status: ApiProjectStatus;
  tasks_count_all?: number | null;
  tasks_count_done?: number | null;
  task_lists?: Array<Omit<ProjectTaskList, 'status'> & { status: ApiProjectTaskListStatus }> | null;
  tasks_list?: Array<Omit<ProjectTaskList, 'status'> & { status: ApiProjectTaskListStatus }> | null;
  tasklists?: Array<Omit<ProjectTaskList, 'status'> & { status: ApiProjectTaskListStatus }> | null;
};

type ProjectsListResponse = {
  projects: ProjectResponse[];
};

type UnknownProjectsResponse =
  | ProjectResponse[]
  | ProjectsListResponse
  | {
      data?: ProjectResponse[] | ProjectsListResponse | null;
      items?: ProjectResponse[] | null;
      results?: ProjectResponse[] | null;
    }
  | null
  | undefined;

const DEFAULT_DEADLINE_MS = 1000 * 60 * 60 * 24 * 14;

function toDateOnly(value: string): string {
  return value.slice(0, 10);
}

function normalizeEnumValue(value?: string | null): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function isProjectDone(value?: string | null): boolean {
  const normalized = normalizeEnumValue(value);
  return normalized.includes('done') || normalized.includes('\u0437\u0430\u0432\u0435\u0440\u0448');
}

function isProjectPaused(value?: string | null): boolean {
  const normalized = normalizeEnumValue(value);
  return normalized.includes('pause') || normalized.includes('\u043f\u0440\u0438\u043e\u0441\u0442');
}

function isProjectUnderThreat(value?: string | null): boolean {
  const normalized = normalizeEnumValue(value);
  return (
    normalized.includes('under_threat') ||
    normalized.includes('threat') ||
    normalized.includes('\u0443\u0433\u0440\u043e\u0437')
  );
}

function isProjectNotActive(value?: string | null): boolean {
  const normalized = normalizeEnumValue(value);
  return (
    normalized.includes('not_active') ||
    normalized.includes('inactive') ||
    normalized.includes('\u043d\u0435 \u0430\u043a\u0442')
  );
}

function isProjectArchive(value?: string | null): boolean {
  const normalized = normalizeEnumValue(value);
  return normalized.includes('archive') || normalized.includes('\u0430\u0440\u0445\u0438\u0432');
}

function isProjectInProgress(value?: string | null): boolean {
  const normalized = normalizeEnumValue(value);
  return (
    normalized.includes('in_progress') ||
    normalized.includes('progress') ||
    normalized.includes('\u0440\u0430\u0431\u043e\u0442')
  );
}

function fromApiProjectStatus(status: ApiProjectStatus): ProjectStatus {
  if (isProjectArchive(status)) return 'archive';
  if (isProjectDone(status)) return 'done';
  if (isProjectPaused(status)) return 'on_pause';
  if (isProjectUnderThreat(status)) return 'under_threat';
  if (isProjectNotActive(status)) return 'not_active';
  if (isProjectInProgress(status)) return 'in_progress';
  return 'in_progress';
}

function toApiStatus(status: ProjectStatus): string {
  if (status === 'done') return '\u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043d';
  if (status === 'on_pause') return '\u041f\u0440\u0438\u043e\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u0435\u043d';
  if (status === 'under_threat') return '\u041f\u043e\u0434 \u0443\u0433\u0440\u043e\u0437\u043e\u0439';
  if (status === 'not_active') return '\u041d\u0435 \u0430\u043a\u0442\u0438\u0432\u0435\u043d';
  if (status === 'archive' || status === 'deleted') {
    return '\u0410\u0440\u0445\u0438\u0432\u043d\u044b\u0439';
  }
  return '\u0412 \u0440\u0430\u0431\u043e\u0442\u0435';
}

function fromApiTaskListStatus(status: ApiProjectTaskListStatus): ProjectTaskListStatus {
  const normalized = normalizeEnumValue(status);
  if (
    normalized.includes('archive') ||
    normalized.includes('done') ||
    normalized.includes('\u0441\u0434\u0435\u043b') ||
    normalized.includes('\u0430\u0440\u0445\u0438\u0432')
  ) {
    return 'archive';
  }
  return 'active';
}

function mapTaskList(list: Omit<ProjectTaskList, 'status'> & { status: ApiProjectTaskListStatus }): ProjectTaskList {
  return {
    ...list,
    status: fromApiTaskListStatus(list.status),
  };
}

function mapProject(project: ProjectResponse): Project {
  const createdAt = project.created_at ?? project.start_at ?? '';
  const startAt = project.start_at ?? project.created_at ?? '';
  const taskLists = (project.task_lists ?? project.tasks_list ?? project.tasklists ?? null)?.map(mapTaskList) ?? null;

  return {
    id: project.id,
    name: project.name,
    description: project.description ?? null,
    startAt,
    createdAt,
    deadline: project.deadline,
    status: fromApiProjectStatus(project.status),
    tasksCountAll: project.tasks_count_all ?? null,
    tasksCountDone: project.tasks_count_done ?? null,
    taskLists,
  };
}

function extractProjectsPayload(data: UnknownProjectsResponse): ProjectResponse[] {
  if (Array.isArray(data)) {
    return data;
  }

  if (!data || typeof data !== 'object') {
    return [];
  }

  if ('projects' in data && Array.isArray(data.projects)) {
    return data.projects;
  }

  if ('items' in data && Array.isArray(data.items)) {
    return data.items;
  }

  if ('results' in data && Array.isArray(data.results)) {
    return data.results;
  }

  if ('data' in data) {
    return extractProjectsPayload(data.data);
  }

  return [];
}

function countTasksFromTaskLists(taskLists?: ProjectTaskList[] | null): number | null {
  if (!taskLists?.length) {
    return null;
  }

  return taskLists.reduce((total, list) => {
    if (!Array.isArray(list.tasks)) {
      return total;
    }
    return total + list.tasks.length;
  }, 0);
}

export async function fetchProjects(params?: ProjectListParams): Promise<Project[]> {
  const statusValues = Array.isArray(params?.status)
    ? params.status
    : params?.status
      ? [params.status]
      : [];

  const apiStatuses = statusValues
    .map((status) => {
      if (status === 'in_progress') return 'В работе';
      if (status === 'on_pause') return 'Приостановлен';
      if (status === 'done') return 'Завершен';
      if (status === 'archive' || status === 'deleted') return 'Архивный';
      return null;
    })
    .filter((value) => value !== null);

  const { data } = await api.get<UnknownProjectsResponse>('/projects/', {
    params: {
      ...(params?.q ? { q: params.q } : {}),
      ...(apiStatuses.length > 0 ? { status: apiStatuses } : {}),
      ...(params?.orderBy ? { order_by: params.orderBy } : {}),
    },
    paramsSerializer: { indexes: null },
  });
  const payload = extractProjectsPayload(data);
  let projects = payload.map(mapProject);

  if (typeof params?.offset === 'number' && params.offset > 0) {
    projects = projects.slice(params.offset);
  }
  if (typeof params?.limit === 'number' && params.limit >= 0) {
    projects = projects.slice(0, params.limit);
  }

  return projects;
}

export async function fetchProject(projectId: number): Promise<Project> {
  const { data } = await api.get<ProjectResponse>(`/projects/${projectId}`);
  return mapProject(data);
}

export async function fetchProjectsWithResolvedTaskCounts(
  params?: ProjectListParams,
): Promise<Project[]> {
  const projects = await fetchProjects(params);
  if (projects.length === 0) {
    return projects;
  }

  const projectsNeedingDetails = projects
    .map((project, index) => ({ project, index }))
    .filter(({ project }) => project.tasksCountAll == null || project.tasksCountDone == null);

  if (projectsNeedingDetails.length === 0) {
    return projects;
  }

  const details = await Promise.all(
    projectsNeedingDetails.map(async ({ project, index }) => {
      try {
        return { index, detail: await fetchProject(project.id) };
      } catch {
        return null;
      }
    }),
  );

  const detailMap = new Map<number, Project>();
  details.forEach((item) => {
    if (!item) return;
    detailMap.set(item.index, item.detail);
  });

  return projects.map((project, index) => {
    const detail = detailMap.get(index);
    if (!detail) {
      return project;
    }

    const derivedCount = countTasksFromTaskLists(detail.taskLists);
    const resolvedCount = derivedCount ?? detail.tasksCountAll;
    if (resolvedCount === null || resolvedCount === undefined) {
      return project;
    }

    return {
      ...project,
      tasksCountAll: resolvedCount,
    };
  });
}

export async function createProject(payload: ProjectCreatePayload): Promise<Project> {
  const deadline = payload.deadline
    ? toDateOnly(payload.deadline)
    : toDateOnly(new Date(Date.now() + DEFAULT_DEADLINE_MS).toISOString());
  const { data } = await api.post<ProjectResponse>('/projects/', {
    name: payload.name,
    description: payload.description,
    start_at: payload.startAt,
    deadline,
  });
  return mapProject(data);
}

export async function updateProject(projectId: number, payload: ProjectUpdatePayload): Promise<Project> {
  const body = {
    ...(payload.name !== undefined ? { name: payload.name } : {}),
    ...(payload.description !== undefined ? { description: payload.description } : {}),
    ...(payload.startAt !== undefined && payload.startAt !== null ? { start_at: payload.startAt } : {}),
    ...(payload.deadline !== undefined && payload.deadline !== null
      ? { deadline: toDateOnly(payload.deadline) }
      : {}),
    ...(payload.status !== undefined ? { status: toApiStatus(payload.status) } : {}),
  };
  const { data } = await api.patch<ProjectResponse>(`/projects/${projectId}`, body);
  return mapProject(data);
}

export async function deleteProject(projectId: number): Promise<void> {
  const project = await fetchProject(projectId);
  await updateProject(projectId, {
    status: 'archive',
    deadline: project.deadline,
  });
}
