import { useEffect, useMemo, useState, type FormEventHandler } from 'react';
import { isAxiosError } from 'axios';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import './auth.css';

import logo from '@/assets/logo.svg';
import { confirmRegistration, login, register, startOAuth, type OAuthProvider } from '@/shared/api';
import { cn } from '@/shared/lib/cn';
import { setSession } from '@/shared/lib/auth';
import { authEmailSchema, authPasswordSchema } from '@/shared/lib/authValidation';
import {
  clearPendingConfirmCredentials,
  clearConfirmResendCooldown,
  setPendingConfirmEmail,
  setPendingConfirmPassword,
  startConfirmResendCooldown,
} from '@/shared/lib/pendingRegistration';
import {
  Button,
  Checkbox,
  Divider,
  EyeIcon,
  Input,
  Progress,
  AuthButton,
  Tabs,
  Toggle,
} from '@/shared/ui';
import { ChevronLeftIcon} from '@/shared/ui/icons';
import { EyeOffIcon } from '@/shared/ui/icons/EyeOffIcon';

const authTabs = [
  { value: 'register', label: 'Регистрация' },
  { value: 'login', label: 'Войти' },
];

const mobileQuery = '(max-width: 767px)';

type AuthTab = 'register' | 'login';
type MobileScreen = 'welcome' | 'form';

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

type LoginPageProps = {
  initialTab?: AuthTab;
};

const requiredMessage = 'Пожалуйста, заполните все обязательные поля';
const invalidEmailMessage = 'Проверьте введенные данные';
const weakPasswordMessage =
  'Пароль должен содержать минимум 12 символов, заглавную и строчную буквы, цифру и специальный символ.';

const loginSchema = z.object({
  email: authEmailSchema,
  password: z.string().min(1, requiredMessage),
});

const registerSchema = z
  .object({
    email: authEmailSchema,
    password: authPasswordSchema,
    confirmPassword: z.string().min(1, requiredMessage),
    agreeTerms: z.boolean().refine((value) => value, requiredMessage),
    agreePrivacy: z.boolean().refine((value) => value, requiredMessage),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Пароли не совпадают. Пожалуйста, введите одинаковые пароли',
  });

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

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
  'Email must not contain spaces': 'Email не должен содержать пробелы.',
  "Email must not start with '.' or '-'": 'Email не должен начинаться с точки или дефиса.',
  "Email must not contain '..' or '--'": 'Email не должен содержать две точки или два дефиса подряд.',
  'Email format is invalid': invalidEmailMessage,
  'Invalid email': invalidEmailMessage,
  'Password contains disallowed characters': 'Пароль содержит недопустимые символы.',
  'Password contains disallowed sequence': 'Пароль содержит запрещенную последовательность.',
  'Password must contain uppercase letter': weakPasswordMessage,
  'Password must contain lowercase letter': weakPasswordMessage,
  'Password must contain a digit': weakPasswordMessage,
  'Password must contain a special character': weakPasswordMessage,
  'Password must not contain email': 'Пароль не должен содержать email.',
};

const fieldLabelMap: Record<string, string> = {
  email: 'Электронная почта',
  password: 'Пароль',
  passwordConfirm: 'Подтверждение пароля',
  confirm_password: 'Подтверждение пароля',
};

const mapIssueMessage = (issue: ApiIssue): string | null => {
  if (!issue.message) return null;
  const field = typeof issue.path?.[0] === 'string' ? issue.path[0] : undefined;
  if (issue.message === 'Required') {
    return field ? `${fieldLabelMap[field] ?? 'Поле'} обязательно.` : 'Поле обязательно.';
  }
  return validationMessageMap[issue.message] ?? issue.message;
};

const normalizeMessages = (messages: Array<string | null | undefined>): string[] => {
  const result = messages.filter((item): item is string => Boolean(item?.trim()));
  return Array.from(new Set(result));
};

const mapFastApiIssueMessage = (issue: FastApiIssue): string | null => {
  if (!issue.msg) return null;
  const field = typeof issue.loc?.[1] === 'string' ? issue.loc[1] : undefined;
  if (issue.msg === 'Field required') {
    return field ? `${fieldLabelMap[field] ?? 'Поле'} обязательно.` : 'Поле обязательно.';
  }
  return validationMessageMap[issue.msg] ?? issue.msg;
};

const mapBackendDetailMessage = (issue: FastApiIssue): string | null => {
  const message = issue.msg ?? issue.message;
  if (!message) return null;

  const field =
    typeof issue.loc?.[1] === 'string'
      ? issue.loc?.[1]
      : typeof issue.field === 'string'
        ? issue.field
        : undefined;

  if (message === 'Field required') {
    return field ? `${fieldLabelMap[field] ?? 'РџРѕР»Рµ'} РѕР±СЏР·Р°С‚РµР»СЊРЅРѕ.` : 'РџРѕР»Рµ РѕР±СЏР·Р°С‚РµР»СЊРЅРѕ.';
  }

  return validationMessageMap[message] ?? message;
};

void mapFastApiIssueMessage;

export function LoginPage({ initialTab = 'login' }: LoginPageProps) {
  const [activeTab, setActiveTab] = useState<AuthTab>(initialTab);
  const [mobileScreen, setMobileScreen] = useState<MobileScreen>('welcome');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [rememberLogin, setRememberLogin] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(mobileQuery).matches : false,
  );

  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
    mode: 'onBlur',
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      agreeTerms: false,
      agreePrivacy: false,
    },
    mode: 'onChange',
  });

  const showRegister = activeTab === 'register';
  const formEmail = showRegister ? registerForm.watch('email') : loginForm.watch('email');
  const formPassword = showRegister ? registerForm.watch('password') : loginForm.watch('password');
  const formPasswordConfirm = registerForm.watch('confirmPassword');
  const formAgreeTerms = registerForm.watch('agreeTerms');
  const formAgreePrivacy = registerForm.watch('agreePrivacy');

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
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token || isConfirming) {
      return;
    }

    setIsConfirming(true);
    clearMessages();

    confirmRegistration(token)
      .then(() => {
        setActiveTab('login');
        setSuccessMessage('Email подтвержден. Теперь можно войти.');
      })
      .catch((err) => {
        if (isAxiosError(err)) {
          const data = err.response?.data as ApiErrorData | undefined;
          if (typeof data?.detail === 'string') {
            setErrors([apiMessageMap[data.detail] ?? data.detail]);
            return;
          }
          if (data?.message) {
            setErrors([apiMessageMap[data.message] ?? data.message]);
            return;
          }
        }
        setErrors(['Не удалось подтвердить регистрацию. Запросите письмо повторно.']);
      })
      .finally(() => {
        const next = new URLSearchParams(searchParams);
        next.delete('token');
        setSearchParams(next, { replace: true });
        setIsConfirming(false);
      });
  }, [isConfirming, searchParams, setSearchParams]);

  const clearMessages = () => {
    setErrors([]);
    setSuccessMessage(null);
  };

  const passwordStrength = useMemo(() => {
    if (!showRegister || !formPassword) {
      return 0;
    }
    let score = 0;
    if (formPassword.length >= 12) score += 25;
    if (/[A-Z]/.test(formPassword)) score += 25;
    if (/[a-z]/.test(formPassword)) score += 25;
    if (/\d/.test(formPassword)) score += 25;
    if (/[^A-Za-z0-9]/.test(formPassword)) score += 25;
    return Math.min(100, score);
  }, [formPassword, showRegister]);

  const strengthColor =
    !showRegister || formPassword.length === 0
      ? 'neutral'
      : passwordStrength >= 75
        ? 'success'
        : passwordStrength >= 50
          ? 'warning'
          : 'danger';

  const canSubmit =
    !isSubmitting &&
    formEmail.trim().length > 0 &&
    formPassword.length > 0 &&
    (!showRegister || (formPasswordConfirm.length > 0 && formAgreeTerms && formAgreePrivacy));

  const handleApiError = (err: unknown) => {
    if (isAxiosError(err)) {
      const data = err.response?.data as ApiErrorData | undefined;
      const detailIssues = Array.isArray(data?.detail)
        ? data.detail
        : Array.isArray(data?.details)
          ? data.details
          : [];
      const issueMessages = normalizeMessages([
        ...(data?.issues?.map(mapIssueMessage) ?? []),
        ...detailIssues.map(mapBackendDetailMessage),
      ]);

      if (issueMessages.length > 0) {
        setErrors(issueMessages);
        return;
      }
      if (typeof data?.detail === 'string') {
        setErrors([apiMessageMap[data.detail] ?? data.detail]);
        return;
      }
      if (data?.message) {
        setErrors([apiMessageMap[data.message] ?? data.message]);
        return;
      }
      if (data?.error) {
        setErrors([apiMessageMap[data.error] ?? data.error]);
        return;
      }
    }

    if (err instanceof Error) {
      setErrors([err.message]);
      return;
    }
    setErrors(['Ошибка запроса']);
  };

  const onLoginSubmit = loginForm.handleSubmit(async (values) => {
    clearMessages();
    setIsSubmitting(true);
    try {
      const tokens = await login({
        email: values.email.trim(),
        password: values.password,
      });
      setSession(tokens.access_token, tokens.refresh_token);
      clearPendingConfirmCredentials();
      clearConfirmResendCooldown();
      const from =
        (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/dashboard';
      navigate(from, { replace: true });
    } catch (err) {
      handleApiError(err);
    } finally {
      setIsSubmitting(false);
    }
  });

  const onRegisterSubmit = registerForm.handleSubmit(async (values) => {
    clearMessages();
    setIsSubmitting(true);
    try {
      await register({
        email: values.email.trim(),
        password: values.password,
        passwordConfirm: values.confirmPassword,
      });
      setPendingConfirmEmail(values.email.trim());
      setPendingConfirmPassword(values.password);
      startConfirmResendCooldown();
      setSuccessMessage('Регистрация завершена. Подтвердите email и затем войдите.');
      navigate('/confirm-email', { replace: true });
      registerForm.reset({
        email: '',
        password: '',
        confirmPassword: '',
        agreeTerms: false,
        agreePrivacy: false,
      });
    } catch (err) {
      handleApiError(err);
    } finally {
      setIsSubmitting(false);
    }
  });

  const handleSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    if (showRegister) {
      onRegisterSubmit(event);
      return;
    }
    onLoginSubmit(event);
  };

  const setTab = (tab: AuthTab) => {
    setActiveTab(tab);
    clearMessages();
    loginForm.clearErrors();
    registerForm.clearErrors();
    if (tab === 'register') {
      navigate('/register', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  };

  const passwordToggle = (
    <button
      type="button"
      className="auth-form__icon-btn"
      aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
      onClick={() => setShowPassword((prev) => !prev)}
    >
      {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
    </button>
  );

  const confirmToggle = (
    <button
      type="button"
      className="auth-form__icon-btn"
      aria-label={showConfirm ? 'Скрыть пароль' : 'Показать пароль'}
      onClick={() => setShowConfirm((prev) => !prev)}
    >
      {showConfirm ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
    </button>
  );

  const openMobileForm = (tab: AuthTab) => {
    setTab(tab);
    setMobileScreen('form');
  };

  const handleOAuthStart = async (provider: OAuthProvider) => {
    clearMessages();
    try {
      const url = await startOAuth(provider);
      const state = new URL(url).searchParams.get('state');
      if (!state) {
        throw new Error('OAuth-сервер не вернул параметр state.');
      }
      sessionStorage.setItem(`taskflow.oauth.state.${provider}`, state);
      window.location.assign(url);
    } catch (err) {
      handleApiError(err);
    }
  };

  const registerEmailError = registerForm.formState.errors.email?.message;
  const registerPasswordError = registerForm.formState.errors.password?.message;
  const registerConfirmError = registerForm.formState.errors.confirmPassword?.message;
  const registerTermsError = registerForm.formState.errors.agreeTerms?.message;
  const registerPrivacyError = registerForm.formState.errors.agreePrivacy?.message;
  const loginEmailError = loginForm.formState.errors.email?.message;
  const loginPasswordError = loginForm.formState.errors.password?.message;
  const loginInlineError = !showRegister && errors.length > 0 ? errors[0] : null;

  const renderAuthForm = (mobile: boolean) => (
    <form className={cn('auth-form', mobile && 'auth-form--mobile')} onSubmit={handleSubmit}>
      {!mobile ? (
        <Tabs
          items={authTabs}
          value={activeTab}
          onChange={(nextTab) => setTab(nextTab === 'register' ? 'register' : 'login')}
          className="auth-form__tabs"
        />
      ) : null}

      <div className="auth-form__fields">
        <div className="auth-form__field">
          <label className="auth-form__label">
            Электронная почта <span className="auth-form__required">*</span>
          </label>
          <Input
            className="auth-form__input"
            placeholder="name@email.com"
            type="email"
            autoComplete="email"
            hasError={Boolean(showRegister ? registerEmailError : loginEmailError)}
            {...(showRegister ? registerForm.register('email') : loginForm.register('email'))}
          />
          {showRegister && registerEmailError ? <p className="auth-form__error">{registerEmailError}</p> : null}
          {!showRegister && loginEmailError ? <p className="auth-form__error">{loginEmailError}</p> : null}
          {!showRegister ? (
            <p className="auth-form__helper">Введите действующий email, например: name@example.com</p>
          ) : null}
        </div>

        <div className="auth-form__field">
          <label className="auth-form__label">
            Пароль <span className="auth-form__required">*</span>
          </label>
          <Input
            className="auth-form__input"
            placeholder="Введите пароль"
            type={showPassword ? 'text' : 'password'}
            autoComplete={showRegister ? 'new-password' : 'current-password'}
            rightSlot={passwordToggle}
            hasError={Boolean(showRegister ? registerPasswordError : loginPasswordError || loginInlineError)}
            {...(showRegister ? registerForm.register('password') : loginForm.register('password'))}
          />
          {showRegister && registerPasswordError ? (
            <p className="auth-form__error">{registerPasswordError}</p>
          ) : null}
          {!showRegister && loginPasswordError ? <p className="auth-form__error">{loginPasswordError}</p> : null}
          {!showRegister && loginInlineError ? <p className="auth-form__error">{loginInlineError}</p> : null}
          {showRegister ? (
            <>
              <p className="auth-form__helper">
                Пароль должен быть не короче 12 символов и содержать заглавную и строчную буквы, цифру и специальный символ.
              </p>
              <Progress value={passwordStrength} color={strengthColor} className="auth-form__progress" />
            </>
          ) : null}
        </div>

        {showRegister ? (
          <div className="auth-form__field">
            <label className="auth-form__label">
              Повторите пароль <span className="auth-form__required">*</span>
            </label>
            <Input
              className="auth-form__input"
              placeholder="Повторите пароль"
              type={showConfirm ? 'text' : 'password'}
              rightSlot={confirmToggle}
              autoComplete="new-password"
              hasError={Boolean(registerConfirmError)}
              {...registerForm.register('confirmPassword')}
            />
            {registerConfirmError ? <p className="auth-form__error">{registerConfirmError}</p> : null}
          </div>
        ) : (
          <Link to="/forgot-password" className="auth-form__forgot">
            Забыли пароль?
          </Link>
        )}
      </div>

      {showRegister ? (
        <div className="auth-form__checkboxes">
          <Checkbox
            checked={formAgreeTerms}
            onChange={(event) => registerForm.setValue('agreeTerms', event.target.checked, { shouldValidate: true })}
            label={
              <span>
                Я принимаю условия{' '}
                <a className="auth-form__link" href="/legal/personal-data-consent.pdf" target="_blank" rel="noreferrer">
                  Согласия на обработку персональных данных
                </a>{' '}
                TaskFlow
              </span>
            }
          />
          <Checkbox
            checked={formAgreePrivacy}
            onChange={(event) =>
              registerForm.setValue('agreePrivacy', event.target.checked, { shouldValidate: true })
            }
            label={
              <span>
                Принимаю условия{' '}
                <a className="auth-form__link" href="/legal/privacy-policy.pdf" target="_blank" rel="noreferrer">
                  Политики конфиденциальности
                </a>
              </span>
            }
          />
          {registerTermsError || registerPrivacyError ? (
            <p className="auth-form__error">{requiredMessage}</p>
          ) : null}
        </div>
      ) : null}

      {mobile && !showRegister ? (
        <div className="auth-form__remember">
          <span>Запомнить вход</span>
          <Toggle checked={rememberLogin} onChange={(event) => setRememberLogin(event.target.checked)} />
        </div>
      ) : null}

      {showRegister && errors.length > 0 ? (
        <div className="auth-form__messages auth-form__messages--error">
          {errors.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
      ) : null}

      {successMessage ? (
        <div className="auth-form__messages auth-form__messages--success">
          <p>{successMessage}</p>
        </div>
      ) : null}

      <Button
        fullWidth
        size="lg"
        type="submit"
        disabled={!canSubmit || isConfirming}
        className={cn('auth-form__submit', mobile && !showRegister && 'auth-form__submit--mobile-main')}
      >
        {showRegister ? 'Зарегистрироваться' : 'Войти'}
      </Button>

      {showRegister || !mobile ? (
        <>
          <Divider label="или" className="auth-form__divider" />
          <div className={cn('auth-form__social', showRegister && mobile && 'auth-form__social--stack')}>
            <AuthButton type="button" provider="gitlab" fullWidth className="auth-form__social-btn" onClick={() => void handleOAuthStart('gitlab')}>

            </AuthButton>
            <AuthButton type="button" provider="google" fullWidth className="auth-form__social-btn" onClick={() => void handleOAuthStart('google')}>

            </AuthButton>
          </div>
        </>
      ) : null}
    </form>
  );

  return (
    <div className="auth-shell">
      {!isMobile ? (
        <div className="auth-page__desktop">
          <div className="container auth-desktop__layout">
            <section className="auth-desktop__hero">
              <div className="auth-brand">
                <img src={logo} alt="TaskFlow" className="auth-brand__logo" />
                <span>TaskFlow</span>
              </div>
              <h1 className="auth-desktop__title">Добро пожаловать!</h1>
              <p className="auth-desktop__subtitle">
                Трекер для тех, кто ценит ясность и контроль. Создавайте, упорядочивайте, выполняйте без
                лишних движений.
              </p>
            </section>

            <section className="surface auth-desktop__card">{renderAuthForm(false)}</section>
          </div>
        </div>
      ) : (
        <div className="auth-page__mobile">
          {mobileScreen === 'welcome' ? (
            <div className="auth-mobile-welcome">
              <div className="auth-mobile-welcome__top">
                <img src={logo} alt="TaskFlow" className="auth-mobile-welcome__logo" />
              </div>

              <div className="auth-mobile-welcome__sheet">
                <h1 className="auth-mobile-welcome__title">Добро пожаловать!</h1>
                <p className="auth-mobile-welcome__subtitle">
                  Создавайте, упорядочивайте, выполняйте без лишних движений
                </p>

                <div className="auth-mobile-welcome__social">
                  <AuthButton
                    type="button"
                    provider="gitlab"
                    fullWidth
                    size="lg"
                    className="auth-form__social-btn"
                    onClick={() => void handleOAuthStart('gitlab')}
                  />
                  <AuthButton
                    type="button"
                    provider="google"
                    fullWidth
                    size="lg"
                    className="auth-form__social-btn"
                    onClick={() => void handleOAuthStart('google')}
                  />
                </div>
                <Divider label="или" className="auth-form__divider" />

                <Button fullWidth size="lg" className="auth-form__submit" onClick={() => openMobileForm('login')}>
                  Войти
                </Button>
                <Button
                  fullWidth
                  size="lg"
                  variant="tonal"
                  className="auth-mobile-welcome__secondary-btn"
                  onClick={() => openMobileForm('register')}
                >
                  Зарегистрироваться
                </Button>
              </div>
            </div>
          ) : (
            <div className="auth-mobile-form">
              <header className="auth-mobile-form__header">
                <button
                  type="button"
                  className="auth-mobile-form__back"
                  onClick={() => {
                    setMobileScreen('welcome');
                    clearMessages();
                  }}
                  aria-label="Назад"
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                </button>
                <h1 className="auth-mobile-form__title">{showRegister ? 'Регистрация' : 'Вход'}</h1>
              </header>

              <div className="auth-mobile-form__content">{renderAuthForm(true)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
