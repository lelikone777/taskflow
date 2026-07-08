import { isAxiosError } from 'axios';

type ValidationDetailItem = {
  loc?: unknown;
  msg?: unknown;
  field?: unknown;
  message?: unknown;
};

function normalizeFieldNames(fieldNames: string[]): Set<string> {
  return new Set(fieldNames.map((fieldName) => fieldName.trim().toLowerCase()).filter(Boolean));
}

function getValidationDetail(error: unknown): ValidationDetailItem[] {
  if (!isAxiosError(error)) {
    return [];
  }

  const payload = error.response?.data;
  const detail = Array.isArray(payload?.detail)
    ? payload.detail
    : Array.isArray(payload?.details)
      ? payload.details
      : null;
  if (!detail) {
    return [];
  }

  return detail.filter(
    (item: unknown): item is ValidationDetailItem => typeof item === 'object' && item !== null,
  );
}

function extractLocationParts(detail: ValidationDetailItem): string[] {
  if (Array.isArray(detail.loc)) {
    return detail.loc
      .map((part) => String(part).trim().toLowerCase())
      .filter(Boolean);
  }

  if (typeof detail.field === 'string' && detail.field.trim()) {
    return [detail.field.trim().toLowerCase()];
  }

  return [];
}

function extractMessage(detail: ValidationDetailItem): string | null {
  if (typeof detail.msg === 'string' && detail.msg.trim()) {
    return detail.msg;
  }

  if (typeof detail.message === 'string' && detail.message.trim()) {
    return detail.message;
  }

  return null;
}

export function getApiFieldValidationMessage(error: unknown, fieldNames: string[]): string | null {
  const normalizedFieldNames = normalizeFieldNames(fieldNames);
  if (normalizedFieldNames.size === 0) {
    return null;
  }

  for (const detailItem of getValidationDetail(error)) {
    const locationParts = extractLocationParts(detailItem);
    const matchesField = locationParts.some((part) => normalizedFieldNames.has(part));
    if (!matchesField) {
      continue;
    }

    const message = extractMessage(detailItem);
    if (message) {
      return message;
    }
  }

  return null;
}

export function getApiValidationSummary(error: unknown): string | null {
  const messages = getValidationDetail(error)
    .map((detailItem) => extractMessage(detailItem)?.trim() ?? '')
    .filter(Boolean);

  if (messages.length === 0) {
    return null;
  }

  return messages.join('. ');
}
