export type TaskListQueryFilters = {
  search?: string;
  status?: string;
  priority?: string;
  tagFilters?: number[];
  dueFrom?: string;
  dueTo?: string;
};

function normalizeTaskListQueryFilters(filters?: TaskListQueryFilters) {
  if (!filters) {
    return {};
  }

  return {
    search: filters.search ?? '',
    status: filters.status ?? '',
    priority: filters.priority ?? '',
    tagFilters: filters.tagFilters ?? [],
    dueFrom: filters.dueFrom ?? '',
    dueTo: filters.dueTo ?? '',
  };
}

export const queryKeys = {
  auth: {
    me: () => ['me'] as const,
  },
  projects: {
    all: () => ['projects'] as const,
    list: (search = '', status = '') => ['projects', search, status] as const,
    detail: (projectId: number | null | undefined) => ['project', projectId ?? null] as const,
    lists: (projectId: number | null | undefined) => ['projectLists', projectId ?? null] as const,
  },
  tags: {
    all: () => ['tags'] as const,
  },
  tasks: {
    all: () => ['tasks'] as const,
    list: (listId: number, filters?: TaskListQueryFilters) =>
      ['tasks', listId, normalizeTaskListQueryFilters(filters)] as const,
    detail: (taskId: number | null | undefined) => ['task', taskId ?? null] as const,
  },
  subtasks: {
    byTask: (taskId: number | null | undefined) => ['subtasks', taskId ?? null] as const,
  },
  attachments: {
    byTask: (taskId: number | null | undefined) => ['attachments', taskId ?? null] as const,
  },
  reminders: {
    all: () => ['reminders'] as const,
  },
  flow: {
    all: () => ['flowNotes'] as const,
    list: (noteDate = '', offset = 0, limit = 50) => ['flowNotes', noteDate, offset, limit] as const,
    byDate: (noteDate = '') => ['flowNotesByDate', noteDate] as const,
    detail: (noteId: number | null | undefined) => ['flowNote', noteId ?? null] as const,
    calendar: (year: number, month: number) => ['flowNotesCalendar', year, month] as const,
  },
};
