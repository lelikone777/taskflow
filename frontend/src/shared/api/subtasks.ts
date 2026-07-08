import { isAxiosError } from 'axios';

import { api } from './client';
import { resolveTaskRoute } from './tasks';

export type SubtaskStatus = 'todo' | 'done';

export type Subtask = {
  id: number;
  taskId: number;
  title: string;
  status: SubtaskStatus;
  createdAt: string;
  updatedAt: string;
};

export type SubtaskCreatePayload = {
  title: string;
  status?: SubtaskStatus;
};

export type SubtaskUpdatePayload = {
  title?: string;
  status?: SubtaskStatus;
};

type SubtaskApiMode = 'none' | 'plural' | 'singular';

type SubtaskStatusValues = {
  inProgress: string;
  done: string;
};

type SubtaskCapability = {
  mode: SubtaskApiMode;
  statusValues: SubtaskStatusValues;
};

type OpenApiSchema = {
  paths?: Record<string, unknown>;
  components?: {
    schemas?: {
      SubtaskStatus?: {
        enum?: unknown[];
      };
    };
  };
};

type SubtaskResponse = {
  id: number;
  task_id?: number;
  name: string;
  status: string;
};

type SubtasksListResponse = {
  subtasks: SubtaskResponse[];
};

type TaskDetailResponse = {
  subtasks?: SubtaskResponse[];
};

const DEFAULT_STATUS_VALUES: SubtaskStatusValues = {
  inProgress: 'in_progress',
  done: 'done',
};

const subtaskTaskMap = new Map<number, number>();
const SUBTASKS_UNSUPPORTED_MESSAGE = 'Подзадачи пока не поддерживаются текущим backend.';

let subtasksCapability: SubtaskCapability | null = null;
let subtasksCapabilityPromise: Promise<SubtaskCapability> | null = null;

function nowIso(): string {
  return new Date().toISOString();
}

function isNotFound(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 404;
}

function normalizeStatusValues(enumValues: unknown[] | undefined): SubtaskStatusValues {
  const values = (enumValues ?? []).filter((value): value is string => typeof value === 'string');
  if (values.length === 0) {
    return DEFAULT_STATUS_VALUES;
  }

  const doneValue =
    values.find((value) => /done|заверш/i.test(value)) ??
    values.find((value) => /close/i.test(value)) ??
    values[values.length - 1];
  const inProgressValue =
    values.find((value) => value !== doneValue && /progress|work|работ/i.test(value)) ??
    values.find((value) => value !== doneValue) ??
    values[0];

  if (!doneValue || !inProgressValue) {
    return DEFAULT_STATUS_VALUES;
  }

  return {
    inProgress: inProgressValue,
    done: doneValue,
  };
}

async function getSubtaskCapability(): Promise<SubtaskCapability> {
  if (subtasksCapability) {
    return subtasksCapability;
  }

  if (!subtasksCapabilityPromise) {
    subtasksCapabilityPromise = api
      .get<OpenApiSchema>('/openapi.json')
      .then(({ data }) => {
        const paths = Object.keys(data?.paths ?? {});
        const mode: SubtaskApiMode = paths.some((path) => path.includes('/subtasks'))
          ? 'plural'
          : paths.some((path) => path.includes('/subtask/'))
            ? 'singular'
            : 'none';

        subtasksCapability = {
          mode,
          statusValues: normalizeStatusValues(data?.components?.schemas?.SubtaskStatus?.enum),
        };

        return subtasksCapability;
      })
      .catch(() => {
        // If OpenAPI is unavailable, keep old behavior as safe fallback.
        subtasksCapability = {
          mode: 'plural',
          statusValues: DEFAULT_STATUS_VALUES,
        };
        return subtasksCapability;
      })
      .finally(() => {
        subtasksCapabilityPromise = null;
      });
  }

  return subtasksCapabilityPromise;
}

function toApiStatus(value: SubtaskStatus | undefined, capability: SubtaskCapability): string | undefined {
  if (!value) return undefined;
  return value === 'done' ? capability.statusValues.done : capability.statusValues.inProgress;
}

function fromApiStatus(value: string, capability: SubtaskCapability): SubtaskStatus {
  if (value === capability.statusValues.done || /done|заверш/i.test(value)) {
    return 'done';
  }
  return 'todo';
}

function mapSubtask(response: SubtaskResponse, taskId: number, capability: SubtaskCapability): Subtask {
  return {
    id: response.id,
    taskId: response.task_id ?? taskId,
    title: response.name,
    status: fromApiStatus(response.status, capability),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

function rememberSubtasks(taskId: number, subtasks: Subtask[]): Subtask[] {
  subtasks.forEach((subtask) => subtaskTaskMap.set(subtask.id, taskId));
  return subtasks;
}

function getPluralPath(projectId: number, listId: number, taskId: number): string {
  return `/projects/${projectId}/tasklist/${listId}/task/${taskId}/subtasks`;
}

function getSingularBasePath(projectId: number, listId: number, taskId: number): string {
  return `/projects/${projectId}/tasklist/${listId}/task/${taskId}/subtask`;
}

async function fetchSubtasksFromTaskDetail(taskId: number, capability: SubtaskCapability): Promise<Subtask[]> {
  const route = await resolveTaskRoute(taskId);
  const { data } = await api.get<TaskDetailResponse>(
    `/projects/${route.projectId}/tasklist/${route.listId}/task/${taskId}`,
  );
  return rememberSubtasks(
    taskId,
    (data.subtasks ?? []).map((subtask) => mapSubtask(subtask, taskId, capability)),
  );
}

export async function fetchSubtasks(taskId: number): Promise<Subtask[]> {
  const capability = await getSubtaskCapability();
  if (capability.mode === 'none') {
    return [];
  }

  if (capability.mode === 'singular') {
    return fetchSubtasksFromTaskDetail(taskId, capability);
  }

  const route = await resolveTaskRoute(taskId);
  try {
    const { data } = await api.get<SubtasksListResponse>(
      getPluralPath(route.projectId, route.listId, taskId),
    );
    return rememberSubtasks(
      taskId,
      (data.subtasks ?? []).map((subtask) => mapSubtask(subtask, taskId, capability)),
    );
  } catch (error) {
    if (isNotFound(error)) {
      // Backend may use singular /subtask API without list endpoint.
      subtasksCapability = {
        ...capability,
        mode: 'singular',
      };
      return fetchSubtasksFromTaskDetail(taskId, subtasksCapability);
    }
    throw error;
  }
}

export async function createSubtask(taskId: number, payload: SubtaskCreatePayload): Promise<Subtask> {
  const capability = await getSubtaskCapability();
  if (capability.mode === 'none') {
    throw new Error(SUBTASKS_UNSUPPORTED_MESSAGE);
  }

  const route = await resolveTaskRoute(taskId);
  const body = {
    name: payload.title,
    ...(payload.status !== undefined ? { status: toApiStatus(payload.status, capability) } : {}),
  };

  if (capability.mode === 'plural') {
    try {
      const { data } = await api.post<SubtaskResponse>(
        getPluralPath(route.projectId, route.listId, taskId),
        body,
      );
      const subtask = mapSubtask(data, taskId, capability);
      subtaskTaskMap.set(subtask.id, taskId);
      return subtask;
    } catch (error) {
      if (!isNotFound(error)) {
        throw error;
      }
      subtasksCapability = {
        ...capability,
        mode: 'singular',
      };
    }
  }

  await api.post(`${getSingularBasePath(route.projectId, route.listId, taskId)}/`, body);
  const subtasks = await fetchSubtasks(taskId);
  const byName = subtasks
    .filter((subtask) => subtask.title === payload.title)
    .sort((left, right) => right.id - left.id);
  const created = byName[0] ?? subtasks.sort((left, right) => right.id - left.id)[0];
  if (!created) {
    throw new Error('Created subtask was not found in task details');
  }
  return created;
}

export async function updateSubtask(subtaskId: number, payload: SubtaskUpdatePayload): Promise<Subtask> {
  const capability = await getSubtaskCapability();
  if (capability.mode === 'none') {
    throw new Error(SUBTASKS_UNSUPPORTED_MESSAGE);
  }

  const taskId = subtaskTaskMap.get(subtaskId);
  if (!taskId) {
    throw new Error('Subtask context is not resolved');
  }

  const route = await resolveTaskRoute(taskId);
  const body = {
    ...(payload.title !== undefined ? { name: payload.title } : {}),
    ...(payload.status !== undefined ? { status: toApiStatus(payload.status, capability) } : {}),
  };

  if (capability.mode === 'plural') {
    try {
      const { data } = await api.patch<SubtaskResponse>(
        `${getPluralPath(route.projectId, route.listId, taskId)}/${subtaskId}`,
        body,
      );
      const subtask = mapSubtask(data, taskId, capability);
      subtaskTaskMap.set(subtask.id, taskId);
      return subtask;
    } catch (error) {
      if (!isNotFound(error)) {
        throw error;
      }
      subtasksCapability = {
        ...capability,
        mode: 'singular',
      };
    }
  }

  await api.patch(`${getSingularBasePath(route.projectId, route.listId, taskId)}/${subtaskId}`, body);
  const subtasks = await fetchSubtasks(taskId);
  const updated = subtasks.find((subtask) => subtask.id === subtaskId);
  if (!updated) {
    throw new Error('Updated subtask was not found in task details');
  }
  return updated;
}

export async function deleteSubtask(subtaskId: number): Promise<void> {
  const capability = await getSubtaskCapability();
  if (capability.mode === 'none') {
    return;
  }

  const taskId = subtaskTaskMap.get(subtaskId);
  if (!taskId) {
    return;
  }

  const route = await resolveTaskRoute(taskId);
  if (capability.mode === 'plural') {
    try {
      await api.delete(`${getPluralPath(route.projectId, route.listId, taskId)}/${subtaskId}`);
      subtaskTaskMap.delete(subtaskId);
      return;
    } catch (error) {
      if (!isNotFound(error)) {
        throw error;
      }
      subtasksCapability = {
        ...capability,
        mode: 'singular',
      };
    }
  }

  await api.delete(`${getSingularBasePath(route.projectId, route.listId, taskId)}/${subtaskId}`);
  subtaskTaskMap.delete(subtaskId);
}
