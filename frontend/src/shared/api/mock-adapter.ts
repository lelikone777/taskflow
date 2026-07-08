import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { AxiosError } from 'axios';

type ProjectStatus = 'active' | 'at_risk' | 'completed' | 'archived';
type TaskStatus = 'planned' | 'in_progress' | 'done';
type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
type SubtaskStatus = 'todo' | 'done';

type User = {
  id: number;
  email: string;
  fullName?: string | null;
  role: string;
};

type Project = {
  id: number;
  name: string;
  description?: string | null;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  tasksCount?: number | null;
};

type TaskList = {
  id: number;
  projectId: number;
  name: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
};

type Task = {
  id: number;
  listId: number;
  projectId?: number;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  assigneeId?: number | null;
  tagIds: number[];
  createdById: number;
  isArchived: boolean;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

type Tag = {
  id: number;
  name: string;
  color: string;
};

type Subtask = {
  id: number;
  taskId: number;
  title: string;
  status: SubtaskStatus;
  createdAt: string;
  updatedAt: string;
};

type Attachment = {
  id: number;
  taskId: number;
  filename: string;
  contentType: string;
  size: number;
  s3Key: string;
  createdAt: string;
};

type Db = {
  user: User;
  projects: Project[];
  lists: TaskList[];
  tasks: Task[];
  tags: Tag[];
  subtasks: Subtask[];
  attachments: Attachment[];
};

type IdCounters = {
  project: number;
  list: number;
  task: number;
  tag: number;
  subtask: number;
  attachment: number;
};

const MOCK_TOKEN = 'mock-token';

const nowIso = () => new Date().toISOString();

const seedNow = nowIso();

const db: Db = {
  user: {
    id: 1,
    email: 'demo@taskflow.local',
    fullName: 'Demo User',
    role: 'user',
  },
  projects: [
    {
      id: 1,
      name: 'Demo project',
      description: 'Frontend-only local mode',
      status: 'active',
      createdAt: seedNow,
      updatedAt: seedNow,
      tasksCount: 1,
    },
  ],
  lists: [
    {
      id: 1,
      projectId: 1,
      name: 'Backlog',
      isArchived: false,
      createdAt: seedNow,
      updatedAt: seedNow,
    },
  ],
  tasks: [
    {
      id: 1,
      listId: 1,
      projectId: 1,
      title: 'Run frontend without backend',
      description: 'Mock API is enabled by VITE_USE_MOCK_API=true',
      priority: 'high',
      status: 'in_progress',
      assigneeId: 1,
      tagIds: [1],
      createdById: 1,
      isArchived: false,
      createdAt: seedNow,
      updatedAt: seedNow,
      completedAt: null,
      dueDate: null,
    },
  ],
  tags: [{ id: 1, name: 'Demo', color: '#3B82F6' }],
  subtasks: [
    {
      id: 1,
      taskId: 1,
      title: 'Open app',
      status: 'done',
      createdAt: seedNow,
      updatedAt: seedNow,
    },
  ],
  attachments: [],
};

const ids: IdCounters = {
  project: 2,
  list: 2,
  task: 2,
  tag: 2,
  subtask: 2,
  attachment: 1,
};

const toInt = (value: string) => Number.parseInt(value, 10);

const parseBody = <T>(config: InternalAxiosRequestConfig): T => {
  if (config.data == null || config.data === '') {
    return {} as T;
  }
  if (typeof config.data === 'string') {
    return JSON.parse(config.data) as T;
  }
  return config.data as T;
};

const getPath = (url?: string) => (url ?? '').replace(/^https?:\/\/[^/]+/, '');

const ok = <T>(config: InternalAxiosRequestConfig, data: T, status = 200): Promise<AxiosResponse<T>> =>
  Promise.resolve({
    data,
    status,
    statusText: 'OK',
    headers: {},
    config: config as AxiosResponse<T>['config'],
  });

const fail = (config: InternalAxiosRequestConfig, status: number, data: unknown): Promise<never> => {
  const response: AxiosResponse = {
    data,
    status,
    statusText: 'Error',
    headers: {},
    config: config as AxiosResponse['config'],
  };
  return Promise.reject(new AxiosError(`Request failed with status code ${status}`, undefined, config, undefined, response));
};

const refreshProjectTaskCounts = () => {
  for (const project of db.projects) {
    const listIds = new Set(db.lists.filter((list) => list.projectId === project.id).map((list) => list.id));
    project.tasksCount = db.tasks.filter((task) => listIds.has(task.listId) && !task.isArchived).length;
  }
};

const withProjectId = (task: Task): Task => {
  const list = db.lists.find((item) => item.id === task.listId);
  return { ...task, projectId: list?.projectId };
};

const handleAuth = (config: InternalAxiosRequestConfig, path: string) => {
  if (config.method === 'post' && (path === '/auth/token' || path === '/user/auth/login')) {
    return ok(config, { access_token: MOCK_TOKEN, refresh_token: MOCK_TOKEN, token_type: 'bearer' });
  }

  if (config.method === 'post' && (path === '/auth/register' || path === '/user/auth/registration')) {
    const payload = parseBody<{ email: string; fullName?: string }>(config);
    db.user = {
      ...db.user,
      email: payload.email ?? db.user.email,
      fullName: payload.fullName ?? db.user.fullName,
    };
    return ok(config, { message: 'Вы успешно зарегистрировались в сервисе.' }, 201);
  }

  if (config.method === 'post' && path === '/user/auth/registration/confirm') {
    return ok(config, { message: 'Регистрация успешно подтверждена.' });
  }

  if (config.method === 'post' && path === '/user/auth/recovery') {
    return ok(config, { message: 'Письмо для восстановления пароля отправлено.' });
  }

  if (config.method === 'post' && path === '/user/auth/recovery/confirm') {
    return ok(config, { access_token: MOCK_TOKEN, refresh_token: MOCK_TOKEN, token_type: 'bearer' });
  }

  if (config.method === 'post' && path === '/user/auth/passchange') {
    return ok(config, { message: 'Пароль успешно изменён.' });
  }

  if (config.method === 'post' && path === '/user/auth/refresh') {
    return ok(config, { access_token: MOCK_TOKEN, refresh_token: MOCK_TOKEN });
  }

  if (config.method === 'post' && path === '/user/auth/logout') {
    return ok(config, { message: 'Выход выполнен.' });
  }

  if (config.method === 'get' && (path === '/auth/me' || path === '/user/me')) {
    return ok(config, {
      id: db.user.id,
      email: db.user.email,
      username: db.user.fullName ?? null,
      avatar_url: null,
      projects: db.projects.map((project) => ({ id: project.id, name: project.name })),
    });
  }

  if ((config.method === 'post' || config.method === 'patch') && path === '/user/me') {
    const payload = parseBody<{ username?: string | null }>(config);
    db.user = {
      ...db.user,
      fullName: payload.username ?? db.user.fullName,
    };
    return ok(config, {
      id: db.user.id,
      email: db.user.email,
      username: db.user.fullName ?? null,
      avatar_url: null,
      projects: db.projects.map((project) => ({ id: project.id, name: project.name })),
    });
  }

  if (config.method === 'post' && path === '/user/avatar') {
    return ok(config, undefined, 201);
  }

  return null;
};

const handleProjects = (config: InternalAxiosRequestConfig, path: string) => {
  if (config.method === 'get' && path === '/projects') {
    const q = typeof config.params?.q === 'string' ? config.params.q.toLowerCase() : '';
    const status = typeof config.params?.status === 'string' ? config.params.status : '';
    const data = db.projects.filter((project) => {
      const passQuery =
        !q ||
        project.name.toLowerCase().includes(q) ||
        (project.description ?? '').toLowerCase().includes(q);
      const passStatus = !status || project.status === status;
      return passQuery && passStatus;
    });
    refreshProjectTaskCounts();
    return ok(config, data);
  }

  if (config.method === 'post' && path === '/projects') {
    const payload = parseBody<{ name: string; description?: string }>(config);
    const timestamp = nowIso();
    const project: Project = {
      id: ids.project++,
      name: payload.name,
      description: payload.description ?? null,
      status: 'active',
      createdAt: timestamp,
      updatedAt: timestamp,
      tasksCount: 0,
    };
    db.projects.push(project);
    return ok(config, project, 201);
  }

  const projectMatch = path.match(/^\/projects\/(\d+)$/);
  if (!projectMatch) {
    return null;
  }

  const projectId = toInt(projectMatch[1]);
  const project = db.projects.find((item) => item.id === projectId);
  if (!project) {
    return fail(config, 404, { message: 'Project not found' });
  }

  if (config.method === 'get') {
    refreshProjectTaskCounts();
    return ok(config, project);
  }

  if (config.method === 'patch') {
    const payload = parseBody<Partial<Project>>(config);
    Object.assign(project, {
      ...payload,
      updatedAt: nowIso(),
    });
    return ok(config, project);
  }

  if (config.method === 'delete') {
    const listIds = new Set(db.lists.filter((list) => list.projectId === projectId).map((list) => list.id));
    const taskIds = new Set(db.tasks.filter((task) => listIds.has(task.listId)).map((task) => task.id));
    db.projects = db.projects.filter((item) => item.id !== projectId);
    db.lists = db.lists.filter((item) => item.projectId !== projectId);
    db.tasks = db.tasks.filter((item) => !taskIds.has(item.id));
    db.subtasks = db.subtasks.filter((item) => !taskIds.has(item.taskId));
    db.attachments = db.attachments.filter((item) => !taskIds.has(item.taskId));
    return ok(config, undefined, 204);
  }

  return null;
};

const handleLists = (config: InternalAxiosRequestConfig, path: string) => {
  const projectListsMatch = path.match(/^\/projects\/(\d+)\/lists$/);
  if (projectListsMatch) {
    const projectId = toInt(projectListsMatch[1]);
    if (config.method === 'get') {
      return ok(config, db.lists.filter((list) => list.projectId === projectId));
    }
    if (config.method === 'post') {
      const payload = parseBody<{ name: string }>(config);
      const timestamp = nowIso();
      const list: TaskList = {
        id: ids.list++,
        projectId,
        name: payload.name,
        isArchived: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      db.lists.push(list);
      return ok(config, list, 201);
    }
  }

  const listMatch = path.match(/^\/lists\/(\d+)$/);
  if (!listMatch) {
    return null;
  }
  const listId = toInt(listMatch[1]);
  const list = db.lists.find((item) => item.id === listId);
  if (!list) {
    return fail(config, 404, { message: 'List not found' });
  }

  if (config.method === 'patch') {
    const payload = parseBody<Partial<TaskList>>(config);
    Object.assign(list, payload, { updatedAt: nowIso() });
    return ok(config, list);
  }

  if (config.method === 'delete') {
    const taskIds = new Set(db.tasks.filter((task) => task.listId === listId).map((task) => task.id));
    db.lists = db.lists.filter((item) => item.id !== listId);
    db.tasks = db.tasks.filter((item) => item.listId !== listId);
    db.subtasks = db.subtasks.filter((item) => !taskIds.has(item.taskId));
    db.attachments = db.attachments.filter((item) => !taskIds.has(item.taskId));
    refreshProjectTaskCounts();
    return ok(config, undefined, 204);
  }

  return null;
};

const handleTasks = (config: InternalAxiosRequestConfig, path: string) => {
  const listTasksMatch = path.match(/^\/lists\/(\d+)\/tasks$/);
  if (listTasksMatch) {
    const listId = toInt(listTasksMatch[1]);
    if (config.method === 'get') {
      let items = db.tasks.filter((task) => task.listId === listId);
      const params = config.params as Record<string, string | undefined> | undefined;
      if (params?.q) {
        const q = params.q.toLowerCase();
        items = items.filter(
          (task) => task.title.toLowerCase().includes(q) || (task.description ?? '').toLowerCase().includes(q),
        );
      }
      if (params?.status) {
        items = items.filter((task) => task.status === params.status);
      }
      if (params?.priority) {
        items = items.filter((task) => task.priority === params.priority);
      }
      if (params?.tagId) {
        const tagId = Number(params.tagId);
        items = items.filter((task) => task.tagIds.includes(tagId));
      }
      return ok(config, items.map(withProjectId));
    }

    if (config.method === 'post') {
      const payload = parseBody<Partial<Task>>(config);
      const timestamp = nowIso();
      const task: Task = {
        id: ids.task++,
        listId,
        projectId: db.lists.find((item) => item.id === listId)?.projectId,
        title: payload.title ?? 'Untitled task',
        description: payload.description ?? null,
        dueDate: payload.dueDate ?? null,
        priority: payload.priority ?? 'medium',
        status: payload.status ?? 'planned',
        assigneeId: payload.assigneeId ?? null,
        tagIds: payload.tagIds ?? [],
        createdById: 1,
        isArchived: false,
        completedAt: payload.status === 'done' ? timestamp : null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      db.tasks.push(task);
      refreshProjectTaskCounts();
      return ok(config, withProjectId(task), 201);
    }
  }

  const taskMatch = path.match(/^\/tasks\/(\d+)$/);
  if (!taskMatch) {
    return null;
  }
  const taskId = toInt(taskMatch[1]);
  const task = db.tasks.find((item) => item.id === taskId);
  if (!task) {
    return fail(config, 404, { message: 'Task not found' });
  }

  if (config.method === 'get') {
    return ok(config, withProjectId(task));
  }

  if (config.method === 'patch') {
    const payload = parseBody<Partial<Task>>(config);
    const nextStatus = payload.status ?? task.status;
    Object.assign(task, payload, {
      status: nextStatus,
      completedAt: nextStatus === 'done' ? (task.completedAt ?? nowIso()) : null,
      updatedAt: nowIso(),
    });
    refreshProjectTaskCounts();
    return ok(config, withProjectId(task));
  }

  if (config.method === 'delete') {
    db.tasks = db.tasks.filter((item) => item.id !== taskId);
    db.subtasks = db.subtasks.filter((item) => item.taskId !== taskId);
    db.attachments = db.attachments.filter((item) => item.taskId !== taskId);
    refreshProjectTaskCounts();
    return ok(config, undefined, 204);
  }

  return null;
};

const handleTags = (config: InternalAxiosRequestConfig, path: string) => {
  if (config.method === 'get' && path === '/tags') {
    return ok(config, db.tags);
  }

  if (config.method === 'post' && path === '/tags') {
    const payload = parseBody<{ name: string; color: string }>(config);
    const tag: Tag = {
      id: ids.tag++,
      name: payload.name,
      color: payload.color,
    };
    db.tags.push(tag);
    return ok(config, tag, 201);
  }

  const tagMatch = path.match(/^\/tags\/(\d+)$/);
  if (!tagMatch) {
    return null;
  }
  const tagId = toInt(tagMatch[1]);
  const tag = db.tags.find((item) => item.id === tagId);
  if (!tag) {
    return fail(config, 404, { message: 'Tag not found' });
  }

  if (config.method === 'patch') {
    const payload = parseBody<Partial<Tag>>(config);
    Object.assign(tag, payload);
    return ok(config, tag);
  }

  if (config.method === 'delete') {
    db.tags = db.tags.filter((item) => item.id !== tagId);
    db.tasks = db.tasks.map((task) => ({ ...task, tagIds: task.tagIds.filter((id) => id !== tagId) }));
    return ok(config, undefined, 204);
  }

  return null;
};

const handleSubtasks = (config: InternalAxiosRequestConfig, path: string) => {
  const taskSubtasksMatch = path.match(/^\/tasks\/(\d+)\/subtasks$/);
  if (taskSubtasksMatch) {
    const taskId = toInt(taskSubtasksMatch[1]);
    if (config.method === 'get') {
      return ok(config, db.subtasks.filter((item) => item.taskId === taskId));
    }
    if (config.method === 'post') {
      const payload = parseBody<{ title: string; status?: SubtaskStatus }>(config);
      const timestamp = nowIso();
      const subtask: Subtask = {
        id: ids.subtask++,
        taskId,
        title: payload.title,
        status: payload.status ?? 'todo',
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      db.subtasks.push(subtask);
      return ok(config, subtask, 201);
    }
  }

  const subtaskMatch = path.match(/^\/subtasks\/(\d+)$/);
  if (!subtaskMatch) {
    return null;
  }
  const subtaskId = toInt(subtaskMatch[1]);
  const subtask = db.subtasks.find((item) => item.id === subtaskId);
  if (!subtask) {
    return fail(config, 404, { message: 'Subtask not found' });
  }

  if (config.method === 'patch') {
    const payload = parseBody<Partial<Subtask>>(config);
    Object.assign(subtask, payload, { updatedAt: nowIso() });
    return ok(config, subtask);
  }

  if (config.method === 'delete') {
    db.subtasks = db.subtasks.filter((item) => item.id !== subtaskId);
    return ok(config, undefined, 204);
  }

  return null;
};

const handleAttachments = (config: InternalAxiosRequestConfig, path: string) => {
  const taskAttachmentsMatch = path.match(/^\/tasks\/(\d+)\/attachments$/);
  if (taskAttachmentsMatch && config.method === 'get') {
    const taskId = toInt(taskAttachmentsMatch[1]);
    return ok(config, db.attachments.filter((item) => item.taskId === taskId));
  }

  const presignMatch = path.match(/^\/tasks\/(\d+)\/attachments\/presign$/);
  if (presignMatch && config.method === 'post') {
    const taskId = toInt(presignMatch[1]);
    const payload = parseBody<{ filename: string; contentType: string; size: number }>(config);
    const attachmentId = ids.attachment++;
    const attachment: Attachment = {
      id: attachmentId,
      taskId,
      filename: payload.filename,
      contentType: payload.contentType,
      size: payload.size,
      s3Key: `mock/${taskId}/${attachmentId}/${payload.filename}`,
      createdAt: nowIso(),
    };
    db.attachments.push(attachment);
    return ok(config, {
      attachmentId,
      uploadUrl: 'mock://upload',
      s3Key: attachment.s3Key,
    });
  }

  const attachmentMatch = path.match(/^\/attachments\/(\d+)$/);
  if (attachmentMatch && config.method === 'delete') {
    const attachmentId = toInt(attachmentMatch[1]);
    db.attachments = db.attachments.filter((item) => item.id !== attachmentId);
    return ok(config, undefined, 204);
  }

  return null;
};

const handlers = [
  handleAuth,
  handleProjects,
  handleLists,
  handleTasks,
  handleTags,
  handleSubtasks,
  handleAttachments,
];

export const mockAdapter: AxiosAdapter = (config) => {
  const path = getPath(config.url).replace(/^\/api(?:\/tasks)?/, '');

  for (const handler of handlers) {
    const response = handler(config, path);
    if (response) {
      return response;
    }
  }

  return fail(config, 404, { message: `Mock route not implemented: ${config.method?.toUpperCase()} ${path}` });
};

export const mockToken = MOCK_TOKEN;
