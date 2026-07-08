import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiMock, resolveTaskRouteMock } = vi.hoisted(() => ({
  apiMock: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  resolveTaskRouteMock: vi.fn(),
}));

vi.mock('@/shared/api/client', () => ({
  api: apiMock,
}));

vi.mock('@/shared/api/tasks', () => ({
  resolveTaskRoute: resolveTaskRouteMock,
}));

type SubtasksModule = typeof import('@/shared/api/subtasks');

async function loadSubtasksModule(): Promise<SubtasksModule> {
  const mod = await import('@/shared/api/subtasks');
  return mod;
}

describe('shared/api/subtasks', () => {
  beforeEach(() => {
    vi.resetModules();
    apiMock.get.mockReset();
    apiMock.post.mockReset();
    apiMock.patch.mockReset();
    apiMock.delete.mockReset();
    resolveTaskRouteMock.mockReset();
  });

  it('returns empty list when openapi has no subtask routes', async () => {
    const subtasksApi = await loadSubtasksModule();
    apiMock.get.mockResolvedValueOnce({
      data: {
        paths: {
          '/projects/': {},
        },
      },
    });

    const subtasks = await subtasksApi.fetchSubtasks(10);

    expect(subtasks).toEqual([]);
    expect(resolveTaskRouteMock).not.toHaveBeenCalled();
    expect(apiMock.get).toHaveBeenCalledWith('/openapi.json');
  });

  it('creates subtask via singular endpoint and reloads from task detail', async () => {
    const subtasksApi = await loadSubtasksModule();
    resolveTaskRouteMock.mockResolvedValue({ projectId: 2, listId: 3 });

    apiMock.get
      .mockResolvedValueOnce({
        data: {
          paths: {
            '/projects/{project_id}/tasklist/{tasklist_id}/task/{task_id}/subtask/': {},
          },
          components: {
            schemas: {
              SubtaskStatus: {
                enum: ['in_progress', 'done'],
              },
            },
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          subtasks: [{ id: 99, name: 'Subtask A', status: 'in_progress' }],
        },
      });
    apiMock.post.mockResolvedValueOnce({ data: {} });

    const created = await subtasksApi.createSubtask(10, { title: 'Subtask A' });

    expect(apiMock.post).toHaveBeenCalledWith('/projects/2/tasklist/3/task/10/subtask/', {
      name: 'Subtask A',
    });
    expect(apiMock.get).toHaveBeenLastCalledWith('/projects/2/tasklist/3/task/10');
    expect(created).toMatchObject({
      id: 99,
      taskId: 10,
      title: 'Subtask A',
      status: 'todo',
    });
  });

  it('throws readable error on create when subtasks are unsupported', async () => {
    const subtasksApi = await loadSubtasksModule();
    apiMock.get.mockResolvedValueOnce({
      data: {
        paths: {
          '/projects/': {},
        },
      },
    });

    await expect(subtasksApi.createSubtask(10, { title: 'Subtask A' })).rejects.toThrow(
      'Подзадачи пока не поддерживаются текущим backend.',
    );
  });
});

