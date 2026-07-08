import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';

import './auth.css';

import logo from '@/assets/logo.svg';
import { requestPasswordRecovery } from '@/shared/api';
import { parseAuthApiError } from '@/shared/lib/authApiError';
import {
  authValidationText,
  forgotPasswordSchema,
  type ForgotPasswordValues,
} from '@/shared/lib/authValidation';
import { Button, Input } from '@/shared/ui';
import { ChevronLeftIcon } from '@/shared/ui/icons';

export function ForgotPasswordPage() {
  const mobileQuery = '(max-width: 767px)';
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(mobileQuery).matches : false,
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia(mobileQuery);
    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [mobileQuery]);

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
    mode: 'onBlur',
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    setSuccess(null);

    try {
      const response = await requestPasswordRecovery(values.email.trim());
      setSuccess(response.message || 'Письмо для восстановления отправлено.');
    } catch (error) {
      const parsed = parseAuthApiError<'email'>(error, {
        fallbackMessage: authValidationText.forgotRequestFailed,
        fieldAliases: { email: 'email' },
      });

      if (parsed.fieldErrors.email) {
        form.setError('email', { message: parsed.fieldErrors.email });
      }
      setFormError(parsed.formError);
    }
  });

  const emailError = form.formState.errors.email?.message;
  const submitting = form.formState.isSubmitting;

  const renderFormContent = (isMobile: boolean) => (
    <>
      {!isMobile ? (
        <>
          <h1 className="auth-forgot__title">Забыли пароль?</h1>
          <p className="auth-forgot__subtitle">
            Введите email, мы пришлем туда ссылку на восстановление пароля.
          </p>
        </>
      ) : (
        <p className="auth-forgot__subtitle">Введите email, мы пришлем туда ссылку на восстановление пароля.</p>
      )}

      <div className="auth-form__field">
        <label className="auth-form__label">
          Электронная почта <span className="auth-form__required">*</span>
        </label>
        <Input
          className="auth-form__input"
          placeholder="name@email.com"
          type="email"
          autoComplete="email"
          hasError={Boolean(emailError)}
          {...form.register('email')}
        />
        {emailError ? <p className="auth-form__error">{emailError}</p> : null}
      </div>

      {formError ? <p className="auth-form__error">{formError}</p> : null}
      {success ? (
        <div className="auth-form__messages auth-form__messages--success">
          <p>{success}</p>
        </div>
      ) : null}

      <Button
        fullWidth
        size="lg"
        type="submit"
        disabled={submitting}
        className={isMobile ? 'auth-form__submit auth-form__submit--mobile-main' : undefined}
      >
        {submitting ? 'Отправляем...' : 'Отправить'}
      </Button>

      {!isMobile ? (
        <Link to="/login" className="auth-forgot__back-link">
          <Button fullWidth size="lg" variant="tonal" type="button">
            Назад
          </Button>
        </Link>
      ) : null}
    </>
  );

  return (
    <div className="auth-shell">
      {!isMobile ? (
        <div className="auth-forgot__desktop">
          <div className="auth-forgot__brand">
            <img src={logo} alt="TaskFlow" className="auth-brand__logo" />
            <span>TaskFlow</span>
          </div>

          <div className="container auth-forgot__layout">
            <div className="surface auth-forgot__card">
              <form className="auth-forgot__form" onSubmit={onSubmit}>
                {renderFormContent(false)}
              </form>
            </div>
          </div>
        </div>
      ) : (
        <div className="auth-forgot__mobile">
          <div className="auth-mobile-form">
            <header className="auth-mobile-form__header">
              <button
              type="button"
              className="auth-mobile-form__back"
              onClick={() => navigate(-1)}
              aria-label="Назад"
            >
              <ChevronLeftIcon className="h-5 w-5" />
              </button>
            <h1 className="auth-mobile-form__title">Забыли пароль</h1>
            </header>

            <div className="auth-mobile-form__content">
              <form className="auth-forgot__mobile-form" onSubmit={onSubmit}>
                {renderFormContent(true)}
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
