import { isAxiosError } from 'axios';

import { authValidationText } from './authValidation';

type ApiIssue = {
  message?: string;
  path?: Array<string | number>;
};

type FastApiIssue = {
  loc?: Array<string | number>;
  msg?: string;
  field?: string;
  message?: string;
};

type ApiErrorData = {
  message?: string;
  detail?: string | FastApiIssue[];
  details?: FastApiIssue[];
  error?: string;
  issues?: ApiIssue[];
};

type ParseAuthApiErrorOptions<TField extends string> = {
  fallbackMessage: string;
  fieldAliases?: Partial<Record<string, TField>>;
};

export type ParseAuthApiErrorResult<TField extends string> = {
  formError: string | null;
  fieldErrors: Partial<Record<TField, string>>;
};

const apiMessageMap: Record<string, string> = {
  'Validation error': 'Проверьте корректность заполненных полей.',
  'Incorrect email or password': 'Неверный email или пароль.',
  'Invalid token': 'Сессия недействительна.',
  'Token expired': 'Срок действия сессии истек.',
  'Invalid token type': 'Некорректный тип токена.',
  'Access denied': 'Доступ запрещен.',
  'Unknown error': 'Неизвестная ошибка сервера.',
};

const validationMessageMap: Record<string, string> = {
  'Field required': authValidationText.requiredField,
  Required: authValidationText.requiredField,
  'Email format is invalid': authValidationText.invalidEmail,
  'Invalid email': authValidationText.invalidEmail,
  'Password must contain uppercase letter': authValidationText.weakPassword,
  'Password must contain lowercase letter': authValidationText.weakPassword,
  'Password must contain a digit': authValidationText.weakPassword,
  'Password must contain a special character': authValidationText.weakPassword,
};

function mapMessage(message?: string): string | null {
  if (!message) {
    return null;
  }
  return validationMessageMap[message] ?? apiMessageMap[message] ?? message;
}

export function parseAuthApiError<TField extends string>(
  error: unknown,
  options: ParseAuthApiErrorOptions<TField>,
): ParseAuthApiErrorResult<TField> {
  if (!isAxiosError(error)) {
    return { formError: options.fallbackMessage, fieldErrors: {} };
  }

  const data = error.response?.data as ApiErrorData | undefined;
  const fieldErrors: Partial<Record<TField, string>> = {};
  const formMessages: string[] = [];

  const addFieldError = (rawField: string | null, message: string | null) => {
    if (!rawField || !message) {
      return false;
    }
    const mappedField = options.fieldAliases?.[rawField] ?? (rawField as TField);
    if (!mappedField || fieldErrors[mappedField]) {
      return false;
    }
    fieldErrors[mappedField] = message;
    return true;
  };

  for (const issue of data?.issues ?? []) {
    const rawField = typeof issue.path?.[0] === 'string' ? issue.path[0] : null;
    const message = mapMessage(issue.message);
    if (!addFieldError(rawField, message) && message) {
      formMessages.push(message);
    }
  }

  if (Array.isArray(data?.detail)) {
    for (const issue of data.detail) {
      const rawField =
        typeof issue.loc?.[1] === 'string'
          ? issue.loc[1]
          : typeof issue.field === 'string'
            ? issue.field
            : null;
      const message = mapMessage(issue.msg ?? issue.message);
      if (!addFieldError(rawField, message) && message) {
        formMessages.push(message);
      }
    }
  } else if (Array.isArray(data?.details)) {
    for (const issue of data.details) {
      const rawField =
        typeof issue.loc?.[1] === 'string'
          ? issue.loc[1]
          : typeof issue.field === 'string'
            ? issue.field
            : null;
      const message = mapMessage(issue.msg ?? issue.message);
      if (!addFieldError(rawField, message) && message) {
        formMessages.push(message);
      }
    }
  } else if (typeof data?.detail === 'string') {
    const message = mapMessage(data.detail);
    if (message) {
      formMessages.push(message);
    }
  }

  if (data?.message) {
    const message = mapMessage(data.message);
    if (message) {
      formMessages.push(message);
    }
  }

  if (data?.error) {
    const message = mapMessage(data.error);
    if (message) {
      formMessages.push(message);
    }
  }

  const formError = formMessages.find(Boolean) ?? (Object.keys(fieldErrors).length ? null : options.fallbackMessage);
  return { formError, fieldErrors };
}
