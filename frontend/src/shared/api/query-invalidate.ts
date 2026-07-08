import type { QueryClient } from '@tanstack/react-query';

import { queryKeys } from './query-keys';

type InvalidateTaskRelationsArgs = {
  projectId?: number | null;
  taskId?: number | null;
  includeProjects?: boolean;
  includeProjectDetail?: boolean;
  includeProjectLists?: boolean;
  includeSubtasks?: boolean;
  includeAttachments?: boolean;
};

export function invalidateProjects(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: queryKeys.projects.all() });
}

export function invalidateProject(queryClient: QueryClient, projectId?: number | null) {
  if (!projectId) {
    return Promise.resolve();
  }
  return queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
}

export function invalidateProjectLists(queryClient: QueryClient, projectId?: number | null) {
  if (!projectId) {
    return Promise.resolve();
  }
  return queryClient.invalidateQueries({ queryKey: queryKeys.projects.lists(projectId) });
}

export function invalidateTasks(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all() });
}

export function invalidateTask(queryClient: QueryClient, taskId?: number | null) {
  if (!taskId) {
    return Promise.resolve();
  }
  return queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) });
}

export function invalidateSubtasks(queryClient: QueryClient, taskId?: number | null) {
  if (!taskId) {
    return Promise.resolve();
  }
  return queryClient.invalidateQueries({ queryKey: queryKeys.subtasks.byTask(taskId) });
}

export function invalidateAttachments(queryClient: QueryClient, taskId?: number | null) {
  if (!taskId) {
    return Promise.resolve();
  }
  return queryClient.invalidateQueries({ queryKey: queryKeys.attachments.byTask(taskId) });
}

export function invalidateTaskRelations(queryClient: QueryClient, args: InvalidateTaskRelationsArgs) {
  const {
    projectId,
    taskId,
    includeProjects,
    includeProjectDetail,
    includeProjectLists,
    includeSubtasks,
    includeAttachments,
  } = args;

  const jobs = [
    invalidateTasks(queryClient),
    invalidateTask(queryClient, taskId),
  ];

  if (includeProjects) {
    jobs.push(invalidateProjects(queryClient));
  }

  if (includeProjectDetail) {
    jobs.push(invalidateProject(queryClient, projectId));
  }

  if (includeProjectLists) {
    jobs.push(invalidateProjectLists(queryClient, projectId));
  }

  if (includeSubtasks) {
    jobs.push(invalidateSubtasks(queryClient, taskId));
  }

  if (includeAttachments) {
    jobs.push(invalidateAttachments(queryClient, taskId));
  }

  return Promise.all(jobs);
}
