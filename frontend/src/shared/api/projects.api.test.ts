import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { apiMock } = vi.hoisted(() => ({
  apiMock: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

vi.mock('@/shared/api/client', () => ({
  api: apiMock,
}));

import {
  createProject,
  deleteProject,
  fetchProjects,
  fetchProjectsWithResolvedTaskCounts,
  updateProject,
} from '@/shared/api/projects';

describe('shared/api/projects createProject', () => {
  beforeEach(() => {
    apiMock.get.mockReset();
    apiMock.post.mockReset();
    apiMock.patch.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sends create payload with date-only deadline and maps response', async () => {
    apiMock.post.mockResolvedValueOnce({
      data: {
        id: 11,
        name: 'Project A',
        description: 'desc',
        start_at: '2026-03-10',
        deadline: '2026-03-30',
        status: 'in_progress',
        tasks_count_all: 3,
        tasks_count_done: 1,
        task_lists: [{ id: 1, name: 'Backlog', status: 'active' }],
      },
    });

    const result = await createProject({
      name: 'Project A',
      description: 'desc',
      startAt: '2026-03-10',
      deadline: '2026-03-30T18:00:00.000Z',
    });

    expect(apiMock.post).toHaveBeenCalledWith('/projects/', {
      name: 'Project A',
      description: 'desc',
      start_at: '2026-03-10',
      deadline: '2026-03-30',
    });

    expect(result).toEqual({
      id: 11,
      name: 'Project A',
      description: 'desc',
      startAt: '2026-03-10',
      createdAt: '2026-03-10',
      deadline: '2026-03-30',
      status: 'in_progress',
      tasksCountAll: 3,
      tasksCountDone: 1,
      taskLists: [{ id: 1, name: 'Backlog', status: 'active' }],
    });
  });

  it('uses default deadline (+14 days) when payload has no deadline', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-01T09:00:00.000Z'));

    apiMock.post.mockResolvedValueOnce({
      data: {
        id: 12,
        name: 'Project B',
        description: null,
        start_at: '2026-03-01',
        deadline: '2026-03-15',
        status: 'in_progress',
      },
    });

    await createProject({
      name: 'Project B',
      startAt: '2026-03-01',
    });

    expect(apiMock.post).toHaveBeenCalledWith('/projects/', {
      name: 'Project B',
      description: undefined,
      start_at: '2026-03-01',
      deadline: '2026-03-15',
    });
  });

  it('updates project via PATCH endpoint with partial payload', async () => {
    apiMock.patch.mockResolvedValueOnce({
      data: {
        id: 12,
        name: 'Project B',
        description: null,
        start_at: '2026-03-01',
        deadline: '2026-03-20',
        status: 'done',
      },
    });

    const result = await updateProject(12, {
      status: 'done',
      deadline: '2026-03-20T00:00:00.000Z',
    });

    expect(apiMock.patch).toHaveBeenCalledWith('/projects/12', {
      deadline: '2026-03-20',
      status: '\u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043d',
    });
    expect(result.status).toBe('done');
  });

  it('archives project with deadline fallback to avoid partial backend update crash', async () => {
    apiMock.get.mockResolvedValueOnce({
      data: {
        id: 21,
        name: 'Project C',
        description: null,
        created_at: '2026-03-01',
        start_at: '2026-03-01',
        deadline: '2026-04-01',
        status: 'in_progress',
      },
    });
    apiMock.patch.mockResolvedValueOnce({
      data: {
        id: 21,
        name: 'Project C',
        description: null,
        created_at: '2026-03-01',
        start_at: '2026-03-01',
        deadline: '2026-04-01',
        status: 'Архивный',
      },
    });

    await deleteProject(21);

    expect(apiMock.get).toHaveBeenCalledWith('/projects/21');
    expect(apiMock.patch).toHaveBeenCalledWith('/projects/21', {
      deadline: '2026-04-01',
      status: '\u0410\u0440\u0445\u0438\u0432\u043d\u044b\u0439',
    });
  });

  it('maps wrapped projects list response from backend', async () => {
    apiMock.get.mockResolvedValueOnce({
      data: {
        projects: [
          {
            id: 31,
            name: 'Project Z',
            description: null,
            created_at: '2026-03-01',
            deadline: '2026-03-20',
            status: 'in_progress',
            tasks_count_all: 4,
            tasks_count_done: 2,
          },
        ],
      },
    });

    const result = await fetchProjects();

    expect(result).toEqual([
      {
        id: 31,
        name: 'Project Z',
        description: null,
        startAt: '2026-03-01',
        createdAt: '2026-03-01',
        deadline: '2026-03-20',
        status: 'in_progress',
        tasksCountAll: 4,
        tasksCountDone: 2,
        taskLists: null,
      },
    ]);
  });

  it('supports nested payload and returns empty list for unknown response shape', async () => {
    apiMock.get
      .mockResolvedValueOnce({
        data: {
          data: {
            projects: [],
          },
        },
      })
      .mockResolvedValueOnce({
        data: null,
      });

    await expect(fetchProjects()).resolves.toEqual([]);
    await expect(fetchProjects()).resolves.toEqual([]);
  });

  it('does not request project details when task counters already exist in list response', async () => {
    apiMock.get.mockResolvedValueOnce({
      data: {
        projects: [
          {
            id: 41,
            name: 'Project Metrics',
            description: null,
            created_at: '2026-03-01',
            deadline: '2026-03-21',
            status: 'in_progress',
            tasks_count_all: 5,
            tasks_count_done: 3,
          },
        ],
      },
    });

    const result = await fetchProjectsWithResolvedTaskCounts();

    expect(apiMock.get).toHaveBeenCalledTimes(1);
    expect(result[0]?.tasksCountAll).toBe(5);
    expect(result[0]?.tasksCountDone).toBe(3);
  });
});
