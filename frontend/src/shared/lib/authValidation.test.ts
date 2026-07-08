import { describe, expect, it } from 'vitest';

import { authEmailSchema, authPasswordSchema, authValidationText } from './authValidation';

describe('authEmailSchema', () => {
  it('rejects disallowed email characters and combinations', () => {
    const invalidEmails = [
      "test'email@example.com",
      'test--email@example.com',
      '-test@example.com',
      '.test@example.com',
      'test@-example.com',
      'test@example..com',
    ];

    invalidEmails.forEach((email) => {
      const result = authEmailSchema.safeParse(email);

      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe(authValidationText.invalidEmail);
    });
  });

  it('accepts valid email without disallowed patterns', () => {
    const result = authEmailSchema.safeParse('name.surname@example-mail.com');

    expect(result.success).toBe(true);
  });
});

describe('authPasswordSchema', () => {
  it('rejects disallowed password characters and sequences', () => {
    const invalidPasswords = [
      'Aa!12345678@#',
      'Aa!12345678/#',
      'Aa!12345678\\*',
      'Aa!12345678--',
      'Aa!12345678"<',
      'Aa!12345678&*',
    ];

    invalidPasswords.forEach((password) => {
      const result = authPasswordSchema.safeParse(password);

      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe(authValidationText.disallowedPasswordChars);
    });
  });

  it('accepts valid password without disallowed characters', () => {
    const result = authPasswordSchema.safeParse('Aa!12345678*?');

    expect(result.success).toBe(true);
  });
});
