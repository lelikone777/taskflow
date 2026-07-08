import { useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import { Link, useNavigate, useParams } from 'react-router-dom';

import './auth.css';

import logo from '@/assets/logo.svg';
import { confirmRegistration, login, register } from '@/shared/api';
import { setSession } from '@/shared/lib/auth';
import { parseAuthApiError } from '@/shared/lib/authApiError';
import {
  clearConfirmResendCooldown,
  clearPendingConfirmCredentials,
  getConfirmResendRemainingSeconds,
  getPendingConfirmEmail,
  getPendingConfirmPassword,
  startConfirmResendCooldown,
} from '@/shared/lib/pendingRegistration';
import { Button } from '@/shared/ui';
import { ChevronLeftIcon } from '@/shared/ui/icons';

type ConfirmState = 'checking' | 'waiting' | 'success' | 'error';

const resendPlaceholderPassword = 'Aa123456789!';
const confirmTokenStatusPrefix = 'taskflow_confirm_token_status:';
const mobileQuery = '(max-width: 767px)';

function getConfirmTokenStatusKey(token: string): string {
  return `${confirmTokenStatusPrefix}${token}`;
}

export function ConfirmEmailPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const pendingEmail = getPendingConfirmEmail();
  const pendingPassword = getPendingConfirmPassword();
  const hasToken = Boolean(token);

  const [state, setState] = useState<ConfirmState>(() => {
    if (hasToken) {
      return 'checking';
    }
    return pendingEmail ? 'waiting' : 'error';
  });

  const [message, setMessage] = useState(() => {
    if (hasToken) {
      return 'Проверяем ссылку подтверждения...';
    }
    return pendingEmail
      ? `Письмо с подтверждением отправлено на ${pendingEmail}.`
      : 'Ссылка подтверждения некорректна.';
  });

  const [resendError, setResendError] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(getConfirmResendRemainingSeconds());
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
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCooldownSeconds(getConfirmResendRemainingSeconds());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }

    const statusKey = getConfirmTokenStatusKey(token);
    const currentStatus = sessionStorage.getItem(statusKey);

    if (currentStatus === 'pending') {
      return;
    }

    if (currentStatus === 'done') {
      setState('success');
      setMessage('Email уже подтвержден. Теперь можно войти.');
      clearPendingConfirmCredentials();
      clearConfirmResendCooldown();
      return;
    }

    sessionStorage.setItem(statusKey, 'pending');

    confirmRegistration(token)
      .then(async () => {
        sessionStorage.setItem(statusKey, 'done');
        setState('success');

        if (pendingEmail && pendingPassword) {
          try {
            const tokens = await login({
              email: pendingEmail,
              password: pendingPassword,
            });
            setSession(tokens.access_token, tokens.refresh_token);
            clearPendingConfirmCredentials();
            clearConfirmResendCooldown();
            navigate('/dashboard', { replace: true });
            return;
          } catch {
            // Fall back to manual sign-in if saved credentials are unavailable.
          }
        }

        setMessage('Email подтвержден. Теперь можно войти.');
        clearPendingConfirmCredentials();
        clearConfirmResendCooldown();
        navigate('/login', { replace: true });
      })
      .catch((error) => {
        const detail = isAxiosError(error) ? error.response?.data?.detail : null;
        if (detail === 'Invalid token type') {
          sessionStorage.removeItem(statusKey);
          navigate(`/reset-password/${encodeURIComponent(token)}`, { replace: true });
          return;
        }
        if (detail === 'Ошибка регистрации в сервисе.') {
          sessionStorage.setItem(statusKey, 'done');
          setState('success');
          setMessage('Email уже подтвержден.');
          clearPendingConfirmCredentials();
          clearConfirmResendCooldown();
          return;
        }
        sessionStorage.removeItem(statusKey);
        setState('error');
        const parsed = parseAuthApiError(error, {
          fallbackMessage: 'Не удалось подтвердить email. Попробуйте запросить письмо заново.',
        });
        setMessage(parsed.formError ?? 'Не удалось подтвердить email. Попробуйте запросить письмо заново.');
      });
  }, [navigate, pendingEmail, pendingPassword, token]);

  const handleResend = async () => {
    if (!pendingEmail || cooldownSeconds > 0 || resending) {
      return;
    }

    setResending(true);
    setResendError(null);
    setResendSuccess(null);

    try {
      // Backend currently has no dedicated resend endpoint, so we reuse registration
      // for an inactive user to trigger another confirmation email.
      await register({
        email: pendingEmail,
        password: resendPlaceholderPassword,
        passwordConfirm: resendPlaceholderPassword,
      });
      startConfirmResendCooldown();
      setCooldownSeconds(getConfirmResendRemainingSeconds());
      setResendSuccess('Письмо отправлено повторно.');
    } catch (error) {
      const parsed = parseAuthApiError(error, {
        fallbackMessage: 'Не удалось отправить письмо подтверждения. Попробуйте позже.',
      });
      setResendError(parsed.formError ?? 'Не удалось отправить письмо подтверждения. Попробуйте позже.');
    } finally {
      setResending(false);
    }
  };

  const canResend = Boolean(pendingEmail) && cooldownSeconds === 0 && !resending;
  const showResend = state === 'waiting' || state === 'error';

  const renderContent = (mobile: boolean) => (
    <>
      {!mobile ? <h1 className="auth-forgot__title">Подтверждение email</h1> : null}
      <p className="auth-forgot__subtitle">{message}</p>

      {showResend ? (
        <div className="stack stack-gap-sm">
          {pendingEmail ? (
            <Button fullWidth size="lg" type="button" onClick={handleResend} disabled={!canResend}>
              {resending
                ? 'Отправляем...'
                : cooldownSeconds > 0
                  ? `Отправить повторно через ${cooldownSeconds}с`
                  : 'Отправить письмо повторно'}
            </Button>
          ) : (
            <p className="auth-form__error">Нет email для повторной отправки. Пройдите регистрацию заново.</p>
          )}

          {resendError ? <p className="auth-form__error">{resendError}</p> : null}
          {resendSuccess ? (
            <div className="auth-form__messages auth-form__messages--success">
              <p>{resendSuccess}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="stack stack-gap-sm">
        <Link to="/login">
          <Button fullWidth size="lg" type="button">
            Перейти ко входу
          </Button>
        </Link>
        {state === 'error' ? (
          <Link to="/register">
            <Button fullWidth size="lg" variant="tonal" type="button">
              К регистрации
            </Button>
          </Link>
        ) : null}
      </div>
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
              <div className="auth-forgot__form">{renderContent(false)}</div>
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
              <h1 className="auth-mobile-form__title">Подтверждение email</h1>
            </header>

            <div className="auth-mobile-form__content">
              <div className="auth-forgot__mobile-form">{renderContent(true)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
