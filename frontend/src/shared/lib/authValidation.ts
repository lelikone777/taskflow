import { z } from 'zod';

export const authValidationText = {
  requiredField: 'Пожалуйста, заполните все обязательные поля',
  invalidEmail: 'Проверьте введенные данные',
  weakPassword:
    'Пароль должен содержать минимум 12 символов, заглавную и строчную буквы, цифру и специальный символ.',
  disallowedPasswordChars:
    'Пароль содержит недопустимые символы. Используйте другие спецсимволы.',
  passwordMismatch: 'Пароли не совпадают. Пожалуйста, введите одинаковые пароли',
  recoveryTokenChecking: 'Проверяем токен восстановления...',
  recoveryTokenMissing: 'Токен восстановления отсутствует.',
  recoveryTokenValid: 'Токен подтвержден. Установите новый пароль.',
  recoveryTokenInvalid: 'Ссылка восстановления недействительна или истекла.',
  forgotRequestFailed: 'Не удалось отправить запрос на восстановление.',
  resetPasswordFailed: 'Не удалось изменить пароль. Проверьте данные и попробуйте снова.',
};

const passwordPattern = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;
const disallowedPasswordCharsPattern = /['"\\/;#<>&@]/;
const disallowedPasswordSequencePattern = /--/;
const disallowedEmailCharsPattern = /'/;

function hasDisallowedEmailFormat(value: string) {
  const [localPart = '', domainPart = ''] = value.split('@');

  return (
    value.includes(' ') ||
    disallowedEmailCharsPattern.test(value) ||
    value.includes('..') ||
    value.includes('--') ||
    localPart.startsWith('.') ||
    localPart.startsWith('-') ||
    domainPart.startsWith('.') ||
    domainPart.startsWith('-')
  );
}

export const authEmailSchema = z
  .string()
  .min(1, authValidationText.requiredField)
  .email(authValidationText.invalidEmail)
  .refine((value) => !hasDisallowedEmailFormat(value), authValidationText.invalidEmail);

export const authPasswordSchema = z
  .string()
  .min(1, authValidationText.requiredField)
  .refine(
    (value) =>
      !disallowedPasswordCharsPattern.test(value) &&
      !disallowedPasswordSequencePattern.test(value),
    authValidationText.disallowedPasswordChars,
  )
  .refine((value) => passwordPattern.test(value), authValidationText.weakPassword);

export const forgotPasswordSchema = z.object({
  email: authEmailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: authPasswordSchema,
    confirmPassword: z.string().min(1, authValidationText.requiredField),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: authValidationText.passwordMismatch,
  });

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
