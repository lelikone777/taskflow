import { isAxiosError } from 'axios';

import { api } from './client';

type TaskListStatus = 'active' | 'archive' | 'deleted';

export type TaskList = {
  id: number;
  projectId: number;
  name: string;
  status: TaskListStatus;
  seqNumber: number;
};

export type TaskListCreatePayload = {
  name: string;
};

export type TaskListUpdatePayload = {
  name?: string;
  isArchived?: boolean;
};

export type TaskListSortPayload = {
  taskListId: number;
  newPreviousTaskListId?: number | null;
};

type ProjectTaskListResponse = {
  id: number;
  name: string;
  status: string;
  seq_number?: number | null;
};

type ProjectResponse = {
  task_lists?: ProjectTaskListResponse[] | null;
  tasks_list?: ProjectTaskListResponse[] | null;
  tasklists?: ProjectTaskListResponse[] | null;
};

type TaskListResponse = {
  id: number;
  name: string;
  status: string;
  seq_number?: number | null;
};

const RETRYABLE_STATUSES = new Set([404, 405]);
const listProjectMap = new Map<number, number>();

export function getProjectIdByListId(listId: number): number | null {
  return listProjectMap.get(listId) ?? null;
}

function mapTaskList(projectId: number, item: TaskListResponse): TaskList {
  listProjectMap.set(item.id, projectId);
  return {
    id: item.id,
    projectId,
    name: item.name,
    status: fromApiTaskListStatus(item.status),
    seqNumber: item.seq_number ?? 0,
  };
}

function fromApiTaskListStatus(status?: string): TaskListStatus {
  const normalized = String(status ?? '').toLowerCase();
  if (
    normalized.includes('\u0441\u0434\u0435\u043b') ||
    normalized.includes('done') ||
    normalized.includes('archive') ||
    normalized.includes('\u0430\u0440\u0445\u0438\u0432')
  ) {
    return 'archive';
  }
  return 'active';
}

function toApiTaskListStatus(isArchived?: boolean): string | undefined {
  if (typeof isArchived !== 'boolean') return undefined;
  return isArchived ? '\u0421\u0434\u0435\u043b\u0430\u043d\u043e' : '\u0410\u043a\u0442\u0438\u0432\u043d\u044b\u0439';
}

function normalizeTaskListName(name: string): string {
  return name.trim();
}

async function requestWithEndpointFallback<T>(
  endpoints: string[],
  request: (endpoint: string) => Promise<T>,
): Promise<T> {
  let lastError: unknown;
  for (const endpoint of endpoints) {
    try {
      return await request(endpoint);
    } catch (error) {
      lastError = error;
      if (!isAxiosError(error)) {
        throw error;
      }
      const status = error.response?.status;
      if (!status || !RETRYABLE_STATUSES.has(status)) {
        throw error;
      }
    }
  }
  throw lastError ?? new Error('Failed to execute task list request');
}

async function resolveNextSeqNumber(projectId: number): Promise<number> {
  const { data } = await api.get<ProjectResponse>(`/projects/${projectId}`);
  const taskLists = data.task_lists ?? data.tasks_list ?? data.tasklists ?? [];
  const maxSeq = taskLists.reduce((max, list) => Math.max(max, list.seq_number ?? 0), 0);
  return maxSeq + 1;
}

export async function fetchTaskLists(projectId: number): Promise<TaskList[]> {
  const { data } = await api.get<ProjectResponse>(`/projects/${projectId}`);
  const taskLists = data.task_lists ?? data.tasks_list ?? data.tasklists ?? [];
  return taskLists.map((item) => mapTaskList(projectId, item));
}

export async function createTaskList(
  projectId: number,
  payload: TaskListCreatePayload,
): Promise<TaskList> {
  const name = normalizeTaskListName(payload.name);
  if (!name) {
    throw new Error('\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u043a\u043e\u043b\u043e\u043d\u043a\u0438 \u043d\u0435 \u043c\u043e\u0436\u0435\u0442 \u0431\u044b\u0442\u044c \u043f\u0443\u0441\u0442\u044b\u043c');
  }

  const seqNumber = await resolveNextSeqNumber(projectId);

  const data = await requestWithEndpointFallback(
    [`/projects/${projectId}/tasklist/`],
    async (endpoint) => {
      const response = await api.post<TaskListResponse | null>(endpoint, {
        name,
        seq_number: seqNumber,
      });
      return response.data;
    },
  );

  if (data && typeof data.id === 'number') {
    return mapTaskList(projectId, data);
  }

  // Some backend revisions return empty body for create list.
  const lists = await fetchTaskLists(projectId);
  const candidates = lists.filter((item) => item.name === name);
  const created =
    candidates.sort((left, right) => right.seqNumber - left.seqNumber)[0] ??
    lists.sort((left, right) => right.seqNumber - left.seqNumber)[0];

  if (!created) {
    throw new Error('Created task list was not found');
  }
  return created;
}

export async function updateTaskList(listId: number, payload: TaskListUpdatePayload): Promise<TaskList> {
  const projectId = listProjectMap.get(listId);
  if (!projectId) {
    throw new Error('To update a list, load the project data first');
  }

  const body = {
    name: payload.name,
    status: toApiTaskListStatus(payload.isArchived),
  };

  const data = await requestWithEndpointFallback<TaskListResponse | null>(
    [`/projects/${projectId}/tasklist/${listId}`],
    async (endpoint) => {
      const response = await api.patch<TaskListResponse | null>(endpoint, body);
      return response.data;
    },
  );

  if (data && typeof data.id === 'number') {
    return mapTaskList(projectId, data);
  }

  const lists = await fetchTaskLists(projectId);
  const updated = lists.find((list) => list.id === listId);
  if (!updated) {
    throw new Error('Updated task list was not found');
  }
  return updated;
}

export async function deleteTaskList(listId: number): Promise<void> {
  const projectId = listProjectMap.get(listId);
  if (!projectId) return;

  await requestWithEndpointFallback(
    [`/projects/${projectId}/tasklist/${listId}`],
    async (endpoint) => {
      await api.delete(endpoint);
    },
  );
}

export function reorderTaskLists(
  lists: TaskList[],
  taskListId: number,
  newPreviousTaskListId?: number | null,
): TaskList[] {
  const currentIndex = lists.findIndex((list) => list.id === taskListId);
  if (currentIndex === -1) {
    return lists;
  }

  const nextLists = [...lists];
  const [movedList] = nextLists.splice(currentIndex, 1);

  if (!movedList) {
    return lists;
  }

  if (newPreviousTaskListId == null || newPreviousTaskListId === 0) {
    nextLists.unshift(movedList);
  } else {
    const previousIndex = nextLists.findIndex((list) => list.id === newPreviousTaskListId);
    if (previousIndex === -1) {
      nextLists.push(movedList);
    } else {
      nextLists.splice(previousIndex + 1, 0, movedList);
    }
  }

  return nextLists.map((list, index) => ({
    ...list,
    seqNumber: index + 1,
  }));
}

export async function sortTaskLists(
  projectId: number,
  payload: TaskListSortPayload,
): Promise<void> {
  await requestWithEndpointFallback(
    [`/projects/${projectId}/tasklist/sort/`],
    async (endpoint) => {
      await api.patch(endpoint, {
        tasklist_id: payload.taskListId,
        new_previous_tasklist_id: payload.newPreviousTaskListId ?? null,
      });
    },
  );
}

