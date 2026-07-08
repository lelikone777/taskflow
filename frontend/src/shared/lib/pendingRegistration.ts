const PENDING_CONFIRM_EMAIL_KEY = 'taskflow_pending_confirm_email';
const PENDING_CONFIRM_PASSWORD_KEY = 'taskflow_pending_confirm_password';
const PENDING_CONFIRM_PASSWORD_EXPIRES_AT_KEY = 'taskflow_pending_confirm_password_expires_at';
const CONFIRM_RESEND_UNTIL_KEY = 'taskflow_confirm_resend_until';
const PENDING_CONFIRM_PASSWORD_TTL_MS = 30 * 60 * 1000;

export const CONFIRM_RESEND_COOLDOWN_SECONDS = 60;

function setStorageValue(key: string, value: string) {
  sessionStorage.setItem(key, value);
  localStorage.setItem(key, value);
}

function getStorageValue(key: string): string | null {
  return sessionStorage.getItem(key) ?? localStorage.getItem(key);
}

function removeStorageValue(key: string) {
  sessionStorage.removeItem(key);
  localStorage.removeItem(key);
}

export function setPendingConfirmEmail(email: string) {
  setStorageValue(PENDING_CONFIRM_EMAIL_KEY, email);
}

export function getPendingConfirmEmail(): string | null {
  return getStorageValue(PENDING_CONFIRM_EMAIL_KEY);
}

export function clearPendingConfirmEmail() {
  removeStorageValue(PENDING_CONFIRM_EMAIL_KEY);
}

export function setPendingConfirmPassword(password: string) {
  setStorageValue(PENDING_CONFIRM_PASSWORD_KEY, password);
  setStorageValue(PENDING_CONFIRM_PASSWORD_EXPIRES_AT_KEY, String(Date.now() + PENDING_CONFIRM_PASSWORD_TTL_MS));
}

export function getPendingConfirmPassword(): string | null {
  const rawExpiresAt = getStorageValue(PENDING_CONFIRM_PASSWORD_EXPIRES_AT_KEY);
  const expiresAt = Number(rawExpiresAt);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    clearPendingConfirmPassword();
    return null;
  }
  return getStorageValue(PENDING_CONFIRM_PASSWORD_KEY);
}

export function clearPendingConfirmPassword() {
  removeStorageValue(PENDING_CONFIRM_PASSWORD_KEY);
  removeStorageValue(PENDING_CONFIRM_PASSWORD_EXPIRES_AT_KEY);
}

export function clearPendingConfirmCredentials() {
  clearPendingConfirmEmail();
  clearPendingConfirmPassword();
}

export function startConfirmResendCooldown(seconds = CONFIRM_RESEND_COOLDOWN_SECONDS) {
  const until = Date.now() + seconds * 1000;
  setStorageValue(CONFIRM_RESEND_UNTIL_KEY, String(until));
}

export function clearConfirmResendCooldown() {
  removeStorageValue(CONFIRM_RESEND_UNTIL_KEY);
}

export function getConfirmResendRemainingSeconds() {
  const raw = getStorageValue(CONFIRM_RESEND_UNTIL_KEY);
  if (!raw) {
    return 0;
  }

  const until = Number(raw);
  if (!Number.isFinite(until)) {
    clearConfirmResendCooldown();
    return 0;
  }

  const remaining = Math.ceil((until - Date.now()) / 1000);
  if (remaining <= 0) {
    clearConfirmResendCooldown();
    return 0;
  }

  return remaining;
}
