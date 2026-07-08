import { describe, expect, it } from 'vitest';

import { getApiFieldValidationMessage, getApiValidationSummary } from './apiValidation';

describe('shared/lib/apiValidation', () => {
  const validationError = {
    isAxiosError: true,
    response: {
      data: {
        detail: [
          { loc: ['body', 'name'], msg: 'Название задачи должно содержать минимум 3 символа' },
          { loc: ['body', 'description'], msg: 'Описание слишком длинное' },
        ],
      },
    },
  };

  const backendValidationError = {
    isAxiosError: true,
    response: {
      data: {
        details: [
          { field: 'name', message: 'Убедитесь, что это значение содержит не менее 3 символов' },
          { field: 'description', message: 'Описание слишком длинное' },
        ],
      },
    },
  };

  it('extracts field-level validation message by backend field name', () => {
    expect(getApiFieldValidationMessage(validationError, ['name', 'title'])).toBe(
      'Название задачи должно содержать минимум 3 символа',
    );
  });

  it('returns null when requested field is absent in validation detail', () => {
    expect(getApiFieldValidationMessage(validationError, ['dueDate'])).toBeNull();
  });

  it('builds a readable validation summary from detail array', () => {
    expect(getApiValidationSummary(validationError)).toBe(
      'Название задачи должно содержать минимум 3 символа. Описание слишком длинное',
    );
  });

  it('extracts field-level validation message from backend details payload', () => {
    expect(getApiFieldValidationMessage(backendValidationError, ['name', 'title'])).toBe(
      'Убедитесь, что это значение содержит не менее 3 символов',
    );
  });

  it('builds a readable validation summary from backend details payload', () => {
    expect(getApiValidationSummary(backendValidationError)).toBe(
      'Убедитесь, что это значение содержит не менее 3 символов. Описание слишком длинное',
    );
  });
});
