import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';

import './auth.css';

import { changePassword, confirmPasswordRecovery } from '@/shared/api';
import { parseAuthApiError } from '@/shared/lib/authApiError';
import { clearSession, setSession } from '@/shared/lib/auth';
import {
  authValidationText,
  resetPasswordSchema,
  type ResetPasswordValues,
} from '@/shared/lib/authValidation';
import { Button, Input } from '@/shared/ui';

type TokenState = 'checking' | 'valid' | 'invalid';

export function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const hasToken = Boolean(token);

  const [tokenState, setTokenState] = useState<TokenState>(hasToken ? 'checking' : 'invalid');
  const [tokenMessage, setTokenMessage] = useState(
    hasToken ? authValidationText.recoveryTokenChecking : authValidationText.recoveryTokenMissing,
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
    mode: 'onChange',
  });

  useEffect(() => {
    if (!token) {
      return;
    }

    confirmPasswordRecovery(token)
      .then((tokens) => {
        setSession(tokens.access_token, tokens.refresh_token);
        setTokenState('valid');
        setTokenMessage(authValidationText.recoveryTokenValid);
      })
      .catch((error) => {
        setTokenState('invalid');
        const parsed = parseAuthApiError(error, {
          fallbackMessage: authValidationText.recoveryTokenInvalid,
        });
        setTokenMessage(parsed.formError ?? authValidationText.recoveryTokenInvalid);
      });
  }, [token]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (tokenState !== 'valid') {
      return;
    }

    setFormError(null);
    setSuccess(null);

    try {
      const response = await changePassword({
        password: values.password,
        passwordConfirm: values.confirmPassword,
      });
      clearSession();
      setSuccess(response.message || 'Пароль успешно изменен. Войдите с новым паролем.');
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1200);
    } catch (error) {
      const parsed = parseAuthApiError<'password' | 'confirmPassword'>(error, {
        fallbackMessage: authValidationText.resetPasswordFailed,
        fieldAliases: {
          password: 'password',
          confirm_password: 'confirmPassword',
          passwordConfirm: 'confirmPassword',
        },
      });

      if (parsed.fieldErrors.password) {
        form.setError('password', { message: parsed.fieldErrors.password });
      }
      if (parsed.fieldErrors.confirmPassword) {
        form.setError('confirmPassword', { message: parsed.fieldErrors.confirmPassword });
      }
      setFormError(parsed.formError);
    }
  });

  const passwordError = form.formState.errors.password?.message;
  const confirmPasswordError = form.formState.errors.confirmPassword?.message;

  return (
    <div className="auth-shell">
      <div className="container auth-forgot__layout">
        <div className="surface auth-forgot__card">
          <form className="auth-forgot__form" onSubmit={onSubmit}>
            <h1 className="auth-forgot__title">Сброс пароля</h1>
            <p className="auth-forgot__subtitle">{tokenMessage}</p>

            {tokenState === 'valid' ? (
              <>
                <div className="auth-form__field">
                  <label className="auth-form__label">
                    Новый пароль <span className="auth-form__required">*</span>
                  </label>
                  <Input
                    className="auth-form__input"
                    type="password"
                    autoComplete="new-password"
                    hasError={Boolean(passwordError)}
                    {...form.register('password')}
                  />
                  {passwordError ? <p className="auth-form__error">{passwordError}</p> : null}
                </div>

                <div className="auth-form__field">
                  <label className="auth-form__label">
                    Подтверждение пароля <span className="auth-form__required">*</span>
                  </label>
                  <Input
                    className="auth-form__input"
                    type="password"
                    autoComplete="new-password"
                    hasError={Boolean(confirmPasswordError)}
                    {...form.register('confirmPassword')}
                  />
                  {confirmPasswordError ? <p className="auth-form__error">{confirmPasswordError}</p> : null}
                </div>

                {formError ? <p className="auth-form__error">{formError}</p> : null}
                {success ? (
                  <div className="auth-form__messages auth-form__messages--success">
                    <p>{success}</p>
                  </div>
                ) : null}

                <Button fullWidth size="lg" type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Сохраняем...' : 'Сменить пароль'}
                </Button>
              </>
            ) : null}

            {tokenState === 'invalid' ? (
              <div className="stack stack-gap-sm">
                <Link to="/forgot-password">
                  <Button fullWidth size="lg" type="button">
                    Запросить новую ссылку
                  </Button>
                </Link>
                <Link to="/login">
                  <Button fullWidth size="lg" variant="tonal" type="button">
                    Ко входу
                  </Button>
                </Link>
              </div>
            ) : null}
          </form>
        </div>
      </div>
    </div>
  );
}
