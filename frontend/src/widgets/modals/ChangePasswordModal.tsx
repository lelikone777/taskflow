import { useMemo, useState } from 'react';
import { isAxiosError } from 'axios';

import { changePassword } from '@/shared/api';
import { authPasswordSchema, authValidationText } from '@/shared/lib/authValidation';
import { Button, EyeIcon, Input, Modal } from '@/shared/ui';
import { EyeOffIcon } from '@/shared/ui/icons/EyeOffIcon';

export type ChangePasswordModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

function parseChangePasswordError(err: unknown) {
  if (isAxiosError(err)) {
    const detail = err.response?.data?.detail;
    if (typeof detail === 'string') {
      return detail;
    }
    if (Array.isArray(detail) && detail[0]?.msg) {
      return String(detail[0].msg);
    }
  }
  return 'Не удалось изменить пароль.';
}

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return Boolean(password && passwordConfirm && !isSubmitting);
  }, [isSubmitting, password, passwordConfirm]);

  const resetState = () => {
    setPassword('');
    setPasswordConfirm('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setIsSubmitting(false);
    setPasswordError(null);
    setConfirmPasswordError(null);
    setFormError(null);
    setSuccess(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleSubmit = async () => {
    setPasswordError(null);
    setConfirmPasswordError(null);
    setFormError(null);
    setSuccess(null);

    if (!password || !passwordConfirm) {
      if (!password) {
        setPasswordError(authValidationText.requiredField);
      }
      if (!passwordConfirm) {
        setConfirmPasswordError(authValidationText.requiredField);
      }
      return;
    }

    const passwordValidation = authPasswordSchema.safeParse(password);
    if (!passwordValidation.success) {
      setPasswordError(passwordValidation.error.issues[0]?.message ?? authValidationText.weakPassword);
      return;
    }

    if (password !== passwordConfirm) {
      setConfirmPasswordError(authValidationText.passwordMismatch);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await changePassword({ password, passwordConfirm });
      setSuccess(response.message || 'Пароль успешно изменен.');
      setPassword('');
      setPasswordConfirm('');
    } catch (err) {
      setFormError(parseChangePasswordError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordToggle = (
    <button
      type="button"
      className="profile-password-modal__toggle"
      aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
      onClick={() => setShowPassword((prev) => !prev)}
    >
      {showPassword ? <EyeIcon className="h-5 w-5" /> : <EyeOffIcon className="h-5 w-5" />}
    </button>
  );

  const passwordConfirmToggle = (
    <button
      type="button"
      className="profile-password-modal__toggle"
      aria-label={showConfirmPassword ? 'Скрыть пароль' : 'Показать пароль'}
      onClick={() => setShowConfirmPassword((prev) => !prev)}
    >
      {showConfirmPassword ? <EyeIcon className="h-5 w-5" /> : <EyeOffIcon className="h-5 w-5" />}
    </button>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      closeOnOverlay={true}
      className="profile-password-modal"
      title={<h3 className="profile-password-modal__title">Изменить пароль</h3>}
      footer={
        <div className="profile-password-modal__actions">
          <Button type="button" size="lg" onClick={handleSubmit} disabled={!canSubmit}>
            {isSubmitting ? 'Сохранение...' : 'Изменить пароль'}
          </Button>
          <Button type="button" size="lg" variant="outlined" onClick={handleClose} disabled={isSubmitting}>
            Отмена
          </Button>
        </div>
      }
    >
      <div className="profile-password-modal__body">
        <div className="profile-password-modal__field">
          <label htmlFor="password">
            Новый пароль <span>*</span>
          </label>
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              if (passwordError) {
                setPasswordError(null);
              }
              if (formError) {
                setFormError(null);
              }
            }}
            autoComplete="new-password"
            size="lg"
            hasError={Boolean(passwordError)}
            rightSlot={passwordToggle}
          />
          {passwordError ? (
            <p className="profile-password-modal__message profile-password-modal__message--error">{passwordError}</p>
          ) : null}
        </div>

        <div className="profile-password-modal__field">
          <label htmlFor="confirm-password">
            Повторите пароль <span>*</span>
          </label>
          <Input
            id="confirm-password"
            type={showConfirmPassword ? 'text' : 'password'}
            value={passwordConfirm}
            onChange={(event) => {
              setPasswordConfirm(event.target.value);
              if (confirmPasswordError) {
                setConfirmPasswordError(null);
              }
              if (formError) {
                setFormError(null);
              }
            }}
            autoComplete="new-password"
            size="lg"
            hasError={Boolean(confirmPasswordError)}
            rightSlot={passwordConfirmToggle}
          />
          {confirmPasswordError ? (
            <p className="profile-password-modal__message profile-password-modal__message--error">
              {confirmPasswordError}
            </p>
          ) : null}
        </div>

        {formError ? <p className="profile-password-modal__message profile-password-modal__message--error">{formError}</p> : null}
        {success ? <p className="profile-password-modal__message">{success}</p> : null}
      </div>
    </Modal>
  );
}
