import { describe, expect, it, vi } from 'vitest';

import { invalidateTaskRelations } from './query-invalidate';

describe('invalidateTaskRelations', () => {
  it('does not invalidate project queries by default', async () => {
    const queryClient = {
      invalidateQueries: vi.fn().mockResolvedValue(undefined),
    };

    await invalidateTaskRelations(queryClient as never, {
      projectId: 5,
      taskId: 10,
    });

    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(2);
    expect(queryClient.invalidateQueries).toHaveBeenNthCalledWith(1, {
      queryKey: ['tasks'],
    });
    expect(queryClient.invalidateQueries).toHaveBeenNthCalledWith(2, {
      queryKey: ['task', 10],
    });
  });

  it('invalidates project queries only when explicitly requested', async () => {
    const queryClient = {
      invalidateQueries: vi.fn().mockResolvedValue(undefined),
    };

    await invalidateTaskRelations(queryClient as never, {
      projectId: 5,
      taskId: 10,
      includeProjects: true,
      includeProjectDetail: true,
      includeProjectLists: true,
      includeSubtasks: true,
      includeAttachments: true,
    });

    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(7);
    expect(queryClient.invalidateQueries).toHaveBeenNthCalledWith(1, {
      queryKey: ['tasks'],
    });
    expect(queryClient.invalidateQueries).toHaveBeenNthCalledWith(2, {
      queryKey: ['task', 10],
    });
    expect(queryClient.invalidateQueries).toHaveBeenNthCalledWith(3, {
      queryKey: ['projects'],
    });
    expect(queryClient.invalidateQueries).toHaveBeenNthCalledWith(4, {
      queryKey: ['project', 5],
    });
    expect(queryClient.invalidateQueries).toHaveBeenNthCalledWith(5, {
      queryKey: ['projectLists', 5],
    });
    expect(queryClient.invalidateQueries).toHaveBeenNthCalledWith(6, {
      queryKey: ['subtasks', 10],
    });
    expect(queryClient.invalidateQueries).toHaveBeenNthCalledWith(7, {
      queryKey: ['attachments', 10],
    });
  });
});
