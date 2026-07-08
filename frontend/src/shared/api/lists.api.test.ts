import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiMock } = vi.hoisted(() => ({
  apiMock: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/shared/api/client', () => ({
  api: apiMock,
}));

type ListsModule = typeof import('@/shared/api/lists');

async function loadListsModule(): Promise<ListsModule> {
  const mod = await import('@/shared/api/lists');
  return mod;
}

describe('shared/api/lists', () => {
  beforeEach(() => {
    vi.resetModules();
    apiMock.get.mockReset();
    apiMock.post.mockReset();
    apiMock.patch.mockReset();
    apiMock.delete.mockReset();
  });

  it('creates task list via canonical /tasklist endpoint', async () => {
    const listsApi = await loadListsModule();
    apiMock.get.mockResolvedValueOnce({
      data: {
        task_lists: [
          { id: 10, name: 'Todo', status: 'active', seq_number: 1 },
          { id: 11, name: 'Doing', status: 'active', seq_number: 2 },
        ],
      },
    });
    apiMock.post.mockResolvedValueOnce({
      data: {
        id: 41,
        name: 'Backlog',
        status: 'active',
        seq_number: 3,
      },
    });

    const result = await listsApi.createTaskList(3, { name: '  Backlog  ' });

    expect(apiMock.get).toHaveBeenCalledWith('/projects/3');
    expect(apiMock.post).toHaveBeenCalledTimes(1);
    expect(apiMock.post).toHaveBeenCalledWith('/projects/3/tasklist/', {
      name: 'Backlog',
      seq_number: 3,
    });
    expect(result).toEqual({
      id: 41,
      projectId: 3,
      name: 'Backlog',
      status: 'active',
      seqNumber: 3,
    });
  });

  it('rejects empty task list name before request', async () => {
    const listsApi = await loadListsModule();

    await expect(listsApi.createTaskList(3, { name: '   ' })).rejects.toThrow(
      '\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u043a\u043e\u043b\u043e\u043d\u043a\u0438 \u043d\u0435 \u043c\u043e\u0436\u0435\u0442 \u0431\u044b\u0442\u044c \u043f\u0443\u0441\u0442\u044b\u043c',
    );

    expect(apiMock.get).not.toHaveBeenCalled();
    expect(apiMock.post).not.toHaveBeenCalled();
  });

  it('updates and deletes task list via /tasklist endpoint', async () => {
    const listsApi = await loadListsModule();
    apiMock.get.mockResolvedValueOnce({
      data: {
        task_lists: [{ id: 77, name: 'Todo', status: 'active', seq_number: 1 }],
      },
    });
    apiMock.patch.mockResolvedValueOnce({
      data: {
        id: 77,
        name: 'Doing',
        status: 'active',
        seq_number: 1,
      },
    });
    apiMock.delete.mockResolvedValueOnce({ data: {} });

    await listsApi.fetchTaskLists(9);
    const updated = await listsApi.updateTaskList(77, { name: 'Doing' });
    await listsApi.deleteTaskList(77);

    expect(apiMock.patch).toHaveBeenCalledWith('/projects/9/tasklist/77', {
      name: 'Doing',
      status: undefined,
    });
    expect(apiMock.delete).toHaveBeenCalledWith('/projects/9/tasklist/77');
    expect(updated).toEqual({
      id: 77,
      projectId: 9,
      name: 'Doing',
      status: 'active',
      seqNumber: 1,
    });
  });

  it('sorts task lists via /tasklist/sort endpoint and reorders locally', async () => {
    const listsApi = await loadListsModule();

    await listsApi.sortTaskLists(9, {
      taskListId: 77,
      newPreviousTaskListId: 11,
    });

    expect(apiMock.patch).toHaveBeenCalledWith('/projects/9/tasklist/sort/', {
      tasklist_id: 77,
      new_previous_tasklist_id: 11,
    });

    expect(
      listsApi.reorderTaskLists(
        [
          { id: 10, projectId: 9, name: 'Todo', status: 'active', seqNumber: 1 },
          { id: 11, projectId: 9, name: 'Doing', status: 'active', seqNumber: 2 },
          { id: 77, projectId: 9, name: 'Done', status: 'active', seqNumber: 3 },
        ],
        77,
        null,
      ),
    ).toEqual([
      { id: 77, projectId: 9, name: 'Done', status: 'active', seqNumber: 1 },
      { id: 10, projectId: 9, name: 'Todo', status: 'active', seqNumber: 2 },
      { id: 11, projectId: 9, name: 'Doing', status: 'active', seqNumber: 3 },
    ]);
  });
});
