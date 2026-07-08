import { isAxiosError } from 'axios';

import { api } from './client';
import { resolveTaskRoute } from './tasks';

export type Attachment = {
  id: number;
  taskId: number;
  filename: string;
  contentType: string;
  size: number;
  s3Key: string;
  createdAt: string;
};

export type PresignAttachmentPayload = {
  filename: string;
  contentType: string;
  size: number;
};

export type PresignAttachmentResponse = {
  attachmentId: number;
  uploadUrl: string;
  s3Key: string;
};

type AttachmentResponse = {
  id: number;
  filename: string;
  size: number;
  url?: string | null;
  created_at?: string | null;
};

type AttachmentsListResponse = {
  attachments?: AttachmentResponse[];
};

type TaskDetailResponse = {
  attachments?: AttachmentResponse[];
};

const pendingUploadTaskMap = new Map<string, number>();
const attachmentTaskMap = new Map<number, number>();
const RETRYABLE_ATTACHMENT_DELETE_STATUSES = new Set([404, 405]);

function nowIso(): string {
  return new Date().toISOString();
}

function inferContentType(filename: string): string {
  const normalized = filename.toLowerCase();
  if (normalized.endsWith('.txt')) return 'text/plain';
  if (normalized.endsWith('.png')) return 'image/png';
  if (normalized.endsWith('.jpg') || normalized.endsWith('.jpeg')) return 'image/jpeg';
  if (normalized.endsWith('.doc')) return 'application/msword';
  if (normalized.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  if (normalized.endsWith('.xls')) return 'application/vnd.ms-excel';
  if (normalized.endsWith('.xlsx')) {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }
  return 'application/octet-stream';
}

function mapAttachment(taskId: number, attachment: AttachmentResponse): Attachment {
  attachmentTaskMap.set(attachment.id, taskId);
  return {
    id: attachment.id,
    taskId,
    filename: attachment.filename,
    contentType: inferContentType(attachment.filename),
    size: attachment.size,
    s3Key: attachment.url ?? '',
    createdAt: attachment.created_at ?? nowIso(),
  };
}

function getPendingUploadToken(uploadUrl: string): string {
  const prefix = 'taskflow-upload://';
  if (!uploadUrl.startsWith(prefix)) {
    throw new Error('Некорректный upload URL');
  }
  return uploadUrl.slice(prefix.length);
}

export async function fetchAttachments(taskId: number): Promise<Attachment[]> {
  const route = await resolveTaskRoute(taskId);
  const { data } = await api.get<TaskDetailResponse>(
    `/projects/${route.projectId}/tasklist/${route.listId}/task/${taskId}`,
  );
  return (data.attachments ?? []).map((item) => mapAttachment(taskId, item));
}

export async function presignAttachment(
  taskId: number,
  payload: PresignAttachmentPayload,
): Promise<PresignAttachmentResponse> {
  const token = `${taskId}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  pendingUploadTaskMap.set(token, taskId);

  return {
    attachmentId: -1,
    uploadUrl: `taskflow-upload://${token}`,
    s3Key: payload.filename,
  };
}

export async function uploadAttachment(uploadUrl: string, file: File): Promise<void> {
  const token = getPendingUploadToken(uploadUrl);
  const taskId = pendingUploadTaskMap.get(token);
  if (!taskId) {
    throw new Error('Контекст загрузки вложения устарел. Попробуйте выбрать файл заново.');
  }

  try {
    const route = await resolveTaskRoute(taskId);

    const formData = new FormData();
    formData.append('files', file);

    const uploadResponse = await api.post<AttachmentsListResponse>('/projects/attachments/', formData);
    const uploadedAttachmentIds = (uploadResponse.data.attachments ?? [])
      .map((attachment) => attachment.id)
      .filter((id): id is number => typeof id === 'number');

    if (uploadedAttachmentIds.length === 0) {
      throw new Error('Сервер не вернул идентификатор вложения');
    }

    await api.post(`/projects/${route.projectId}/tasklist/${route.listId}/task/${taskId}/attachments/`, {
      attachment_ids: uploadedAttachmentIds,
    });
    uploadedAttachmentIds.forEach((attachmentId) => {
      attachmentTaskMap.set(attachmentId, taskId);
    });
  } finally {
    pendingUploadTaskMap.delete(token);
  }
}

export async function deleteAttachment(attachmentId: number): Promise<void> {
  const taskId = attachmentTaskMap.get(attachmentId);
  if (taskId) {
    try {
      const route = await resolveTaskRoute(taskId);
      await api.delete(
        `/projects/${route.projectId}/tasklist/${route.listId}/task/${taskId}/attachments/${attachmentId}`,
      );
      attachmentTaskMap.delete(attachmentId);
      return;
    } catch (error) {
      const status = isAxiosError(error) ? error.response?.status : undefined;
      if (!status || !RETRYABLE_ATTACHMENT_DELETE_STATUSES.has(status)) {
        throw error;
      }
    }
  }

  await api.delete(`/projects/attachments/${attachmentId}`);
  attachmentTaskMap.delete(attachmentId);
}
