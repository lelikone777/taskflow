import { isAxiosError } from 'axios';

import { api } from './client';

export type Tag = {
  id: number;
  name: string;
  color: string;
};

export type TagCreatePayload = {
  name: string;
  color: string;
};

export type TagUpdatePayload = {
  name?: string;
  color?: string;
};

type TagResponse = {
  id: number;
  name: string;
};

type TagsListResponse = {
  tags: TagResponse[];
};

const TAG_COLOR_STORAGE_KEY = 'taskflow_tag_colors_v1';
const DEFAULT_TAG_COLORS = ['#3380F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#EC4899'];

type StoredTagColors = Record<string, string>;

function loadStoredTagColors(): StoredTagColors {
  try {
    const raw = localStorage.getItem(TAG_COLOR_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      return {};
    }
    return parsed as StoredTagColors;
  } catch {
    return {};
  }
}

function saveStoredTagColors(colors: StoredTagColors) {
  localStorage.setItem(TAG_COLOR_STORAGE_KEY, JSON.stringify(colors));
}

function colorByName(name: string): string {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) >>> 0;
  }
  return DEFAULT_TAG_COLORS[hash % DEFAULT_TAG_COLORS.length] ?? DEFAULT_TAG_COLORS[0];
}

function mapTag(response: TagResponse, colors: StoredTagColors): Tag {
  const storedColor = colors[String(response.id)];
  return {
    id: response.id,
    name: response.name,
    color: storedColor ?? colorByName(response.name),
  };
}

function isDuplicateTagConflict(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 409;
}

export async function fetchTags(query = ''): Promise<Tag[]> {
  const { data } = await api.get<TagsListResponse>('/projects/tags/', {
    params: query ? { q: query } : undefined,
  });

  const colors = loadStoredTagColors();
  return (data.tags ?? []).map((item) => mapTag(item, colors));
}

export async function createTag(payload: TagCreatePayload): Promise<Tag> {
  const trimmedName = payload.name.trim();
  if (!trimmedName) {
    throw new Error('Название тега не может быть пустым');
  }

  const existing = (await fetchTags(trimmedName)).find(
    (tag) => tag.name.toLowerCase() === trimmedName.toLowerCase(),
  );

  if (existing) {
    const colors = loadStoredTagColors();
    colors[String(existing.id)] = payload.color;
    saveStoredTagColors(colors);
    return {
      ...existing,
      color: payload.color,
    };
  }

  try {
    await api.post('/projects/tags/', { name: trimmedName });
  } catch (error) {
    if (!isDuplicateTagConflict(error)) {
      throw error;
    }
  }

  const tags = await fetchTags(trimmedName);
  const created =
    tags.find((tag) => tag.name.toLowerCase() === trimmedName.toLowerCase()) ??
    tags.sort((left, right) => right.id - left.id)[0];

  if (!created) {
    throw new Error('Тег создан, но не найден в ответе сервера');
  }

  const colors = loadStoredTagColors();
  colors[String(created.id)] = payload.color;
  saveStoredTagColors(colors);

  return {
    ...created,
    color: payload.color,
  };
}

export async function updateTag(tagId: number, payload: TagUpdatePayload): Promise<Tag> {
  const current = (await fetchTags()).find((tag) => tag.id === tagId);
  if (!current) {
    throw new Error('Tag not found');
  }

  const nextName = payload.name?.trim() || current.name;

  if (payload.name !== undefined) {
    await api.patch(`/projects/tags/${tagId}`, { name: nextName });
  }

  const colors = loadStoredTagColors();
  if (payload.color) {
    colors[String(tagId)] = payload.color;
    saveStoredTagColors(colors);
  }

  const updated = (await fetchTags()).find((tag) => tag.id === tagId);
  if (!updated) {
    throw new Error('Tag not found after update');
  }

  return {
    ...updated,
    color: payload.color ?? updated.color,
  };
}

// Backend-develop сейчас не предоставляет endpoint удаления тега.
export async function deleteTag(tagId: number): Promise<void> {
  const colors = loadStoredTagColors();
  if (String(tagId) in colors) {
    delete colors[String(tagId)];
    saveStoredTagColors(colors);
  }
}
