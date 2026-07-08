import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiMock, getProjectIdByListIdMock } = vi.hoisted(() => ({
  apiMock: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  getProjectIdByListIdMock: vi.fn(),
}));

vi.mock('@/shared/api/client', () => ({
  api: apiMock,
}));

vi.mock('@/shared/api/lists', () => ({
  getProjectIdByListId: getProjectIdByListIdMock,
}));

import { createTask, fetchTasks, moveTaskToList } from '@/shared/api/tasks';

describe('shared/api/tasks', () => {
  beforeEach(() => {
    apiMock.get.mockReset();
    apiMock.post.mockReset();
    apiMock.patch.mockReset();
    apiMock.delete.mockReset();
    getProjectIdByListIdMock.mockReset();
  });

  it('creates task via backend API and maps response', async () => {
    getProjectIdByListIdMock.mockReturnValue(5);

    apiMock.post.mockResolvedValueOnce({
      data: {
        id: 101,
        task_list_id: 77,
        name: 'First task',
        description: null,
        deadline: null,
        priority: 'low',
        status: 'in_progress',
        tags: [],
      },
    });

    const created = await createTask(77, { title: 'First task' });

    expect(apiMock.post).toHaveBeenCalledWith('/projects/5/tasklist/77/task/', {
      name: 'First task',
    });
    expect(created.id).toBe(101);
    expect(created.listId).toBe(77);
    expect(created.projectId).toBe(5);
    expect(created.title).toBe('First task');
    expect(created.priority).toBe('low');
    expect(created.status).toBe('in_progress');
  });

  it('resolves project id by list id when list map is empty', async () => {
    getProjectIdByListIdMock.mockReturnValue(null);

    apiMock.get.mockImplementation(async (url: string) => {
      if (url === '/projects/') {
        return { data: [{ id: 5 }] };
      }
      if (url === '/projects/5') {
        return {
          data: {
            id: 5,
            task_lists: [{ id: 77, tasks: [] }],
          },
        };
      }
      throw new Error(`Unexpected GET ${url}`);
    });

    apiMock.post.mockResolvedValueOnce({
      data: {
        id: 102,
        task_list_id: 77,
        name: 'Resolved task',
        description: null,
        deadline: null,
        priority: 'mid',
        status: 'schedule',
        tags: [],
      },
    });

    const created = await createTask(77, { title: 'Resolved task' });

    expect(created.projectId).toBe(5);
    expect(created.priority).toBe('medium');
    expect(created.status).toBe('planned');
  });

  it('forwards task filters to backend without local filtering', async () => {
    getProjectIdByListIdMock.mockReturnValue(5);

    apiMock.get.mockImplementation(async (url: string) => {
      if (url === '/projects/5') {
        return {
          data: {
            id: 5,
            task_lists: [{ id: 77, tasks: [{ id: 1 }, { id: 2 }] }],
          },
        };
      }
      if (url === '/projects/5/tasklist/77/task/1') {
        return {
          data: {
            id: 1,
            task_list_id: 77,
            name: 'A',
            priority: 'low',
            status: 'schedule',
            tags: [],
          },
        };
      }
      if (url === '/projects/5/tasklist/77/task/2') {
        return {
          data: {
            id: 2,
            task_list_id: 77,
            name: 'B',
            priority: 'high',
            status: 'close',
            tags: [],
          },
        };
      }
      throw new Error(`Unexpected GET ${url}`);
    });

    const tasks = await fetchTasks(77, {
      status: 'done',
      priority: 'high',
      dueFrom: '2026-04-01',
      dueTo: '2026-04-30',
    });

    expect(apiMock.get).toHaveBeenCalledWith(
      '/projects/5',
      expect.objectContaining({
        params: expect.objectContaining({
          status: 'done',
          priority: expect.any(String),
          deadline_from: '2026-04-01',
          deadline_to: '2026-04-30',
        }),
      }),
    );
    expect(tasks).toHaveLength(2);
  });

  it('uses nested task details from project response without extra task fetches', async () => {
    getProjectIdByListIdMock.mockReturnValue(5);

    apiMock.get.mockResolvedValueOnce({
      data: {
        id: 5,
        task_lists: [
          {
            id: 77,
            tasks: [
              {
                id: 11,
                task_list_id: 77,
                name: 'Inline task',
                priority: 'mid',
                status: 'in_progress',
                tags: [],
              },
            ],
          },
        ],
      },
    });

    const tasks = await fetchTasks(77);

    expect(apiMock.get).toHaveBeenCalledTimes(1);
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({
      id: 11,
      listId: 77,
      projectId: 5,
      title: 'Inline task',
      priority: 'medium',
      status: 'in_progress',
    });
  });

  it('moves task without re-fetching project details after successful patch', async () => {
    getProjectIdByListIdMock.mockReturnValue(5);

    apiMock.get.mockResolvedValueOnce({
      data: {
        id: 5,
        task_lists: [
          {
            id: 77,
            tasks: [
              {
                id: 301,
                task_list_id: 77,
                name: 'Movable task',
                priority: 'mid',
                status: 'in_progress',
                tags: [],
              },
            ],
          },
        ],
      },
    });

    await fetchTasks(77);

    apiMock.patch.mockResolvedValueOnce({ data: null });

    await moveTaskToList(301, 88);

    expect(apiMock.patch).toHaveBeenCalledWith('/projects/5/tasklist/77/task/301/move', {
      tasklist_id: 88,
    });
    expect(apiMock.get).toHaveBeenCalledTimes(1);
  });
});
