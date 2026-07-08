import { useCallback, useEffect, useState } from 'react';
import { isAxiosError } from 'axios';

import { me, updateProfile } from '@/shared/api';
import { getApiFieldValidationMessage, getApiValidationSummary } from '@/shared/lib/apiValidation';
import { DEFAULT_TIMEZONE, formatTimezoneUtcOffset, TIMEZONE_OPTIONS } from '@/shared/lib/timezones';
import { Button, Input, Select } from '@/shared/ui';
import { AddImageIcon } from '@/shared/ui/icons';
import { DashboardBottomNav, DashboardSidebar } from '@/widgets/dashboard';
import { ChangePasswordModal, ConfirmExitModal, UploadAvatarModal } from '@/widgets/modals';

export type ProfilePageProps = {
  isOpen?: boolean;
  onClose?: () => void;
};

type ProfileMessage = {
  type: 'error' | 'success';
  text: string;
};

const profileNameMinLength = 2;

function getErrorMessage(err: unknown, fallback: string) {
  const usernameMessage = getApiFieldValidationMessage(err, ['username', 'name']);
  if (usernameMessage) {
    return usernameMessage;
  }

  const validationSummary = getApiValidationSummary(err);
  if (validationSummary) {
    return validationSummary;
  }

  if (isAxiosError(err)) {
    const detail = err.response?.data?.detail;
    if (typeof detail === 'string') {
      return detail;
    }
    if (Array.isArray(detail) && detail[0]?.msg) {
      return String(detail[0].msg);
    }
  }

  return fallback;
}

export function ProfilePage({ isOpen = true, onClose }: ProfilePageProps) {
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showExit, setShowExit] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [name, setName] = useState('');
  const [savedName, setSavedName] = useState('');
  const [email, setEmail] = useState('');
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const [savedTimezone, setSavedTimezone] = useState(DEFAULT_TIMEZONE);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSavingTimezone, setIsSavingTimezone] = useState(false);
  const [message, setMessage] = useState<ProfileMessage | null>(null);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const user = await me();
      const nextName = user.username ?? '';
      const nextTimezone = user.timezone ?? DEFAULT_TIMEZONE;

      setName(nextName);
      setSavedName(nextName);
      setEmail(user.email ?? '');
      setTimezone(nextTimezone);
      setSavedTimezone(nextTimezone);
      setAvatarUrl(user.avatarUrl ?? null);
    } catch (err) {
      setMessage({
        type: 'error',
        text: getErrorMessage(err, 'Не удалось загрузить профиль.'),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    void loadProfile();
  }, [isOpen, loadProfile]);

  const handleNameBlur = async () => {
    if (isLoading || isSavingName) {
      return;
    }

    const trimmed = name.trim();
    const current = savedName.trim();
    if (!trimmed || trimmed === current) {
      setName(trimmed || savedName);
      return;
    }
    if (trimmed.length < profileNameMinLength) {
      return;
    }

    setIsSavingName(true);
    setMessage(null);
    try {
      const user = await updateProfile({ username: trimmed });
      const nextName = user.username ?? trimmed;
      setName(nextName);
      setSavedName(nextName);
      setMessage({ type: 'success', text: 'Имя профиля обновлено.' });
    } catch (err) {
      setName(savedName);
      setMessage({
        type: 'error',
        text: getErrorMessage(err, 'Не удалось обновить имя профиля.'),
      });
    } finally {
      setIsSavingName(false);
    }
  };

  const handleTimezoneSave = async () => {
    if (isLoading || isSavingTimezone || timezone === savedTimezone) {
      return;
    }

    setIsSavingTimezone(true);
    setMessage(null);
    try {
      const user = await updateProfile({ timezone });
      const nextTimezone = user.timezone ?? timezone;
      setTimezone(nextTimezone);
      setSavedTimezone(nextTimezone);
      setMessage({ type: 'success', text: 'Часовой пояс обновлен.' });
    } catch (err) {
      setTimezone(savedTimezone);
      setMessage({
        type: 'error',
        text: getErrorMessage(err, 'Не удалось обновить часовой пояс.'),
      });
    } finally {
      setIsSavingTimezone(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div className="dashboard-layout">
        <DashboardSidebar />
        <div className="dashboard-main">
          <section className="profile-page" aria-label="Настройки профиля">
            <div className="profile-page__wrapper">
              <div className="profile-page__content">
                <h1 className="profile-page__title">Настройки профиля</h1>

                <div className="profile-page__fields">
                  <div className="profile-page__field">
                    <label className="profile-page__label" htmlFor="profile-name">
                      Имя
                    </label>
                    <div className="profile-page__field-value">
                      <Input
                        id="profile-name"
                        size="lg"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        onBlur={() => void handleNameBlur()}
                        disabled={isLoading || isSavingName}
                        inputClassName="profile-page__input-text"
                        className="profile-page__input"
                      />
                      <Button
                        type="button"
                        variant="link"
                        size="lg"
                        className="profile-page__field-button"
                        onClick={() => void handleNameBlur()}
                      >
                        изменить
                      </Button>
                    </div>
                  </div>

                  <div className="profile-page__field">
                    <label className="profile-page__label" htmlFor="profile-email">
                      Email
                    </label>
                    <div className="profile-page__field-value">
                      <Input
                        id="profile-email"
                        size="lg"
                        value={email}
                        readOnly={true}
                        disabled={true}
                        className="profile-page__input"
                        inputClassName="profile-page__input-text"
                      />
                      <Button
                        type="button"
                        variant="link"
                        size="lg"
                        className="profile-page__field-button"
                        disabled={true}
                      >
                        изменить
                      </Button>
                    </div>
                  </div>

                  <div className="profile-page__field profile-page__field--password">
                    <label className="profile-page__label" htmlFor="profile-password">
                      Пароль
                    </label>
                    <div className="profile-page__field-value">
                      <Input
                        id="profile-password"
                        size="lg"
                        value="************"
                        readOnly={true}
                        disabled={true}
                        className="profile-page__input"
                        inputClassName="profile-page__input-text"
                      />
                      <Button
                        type="button"
                        variant="link"
                        size="lg"
                        className="profile-page__field-button"
                        onClick={() => setShowChangePassword(true)}
                      >
                        сбросить
                      </Button>
                    </div>
                  </div>

                  <div className="profile-page__field">
                    <label className="profile-page__label" htmlFor="profile-timezone">
                      Часовой пояс
                    </label>
                    <div className="profile-page__field-value">
                      <Select
                        id="profile-timezone"
                        size="lg"
                        className="profile-page__timezone"
                        value={timezone}
                        onChange={(event) => setTimezone(event.target.value)}
                        disabled={isLoading || isSavingTimezone}
                      >
                        {TIMEZONE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {`${option.label} ${formatTimezoneUtcOffset(option.value)}`}
                          </option>
                        ))}
                      </Select>
                      <Button
                        type="button"
                        variant="link"
                        size="lg"
                        className="profile-page__field-button"
                        onClick={() => void handleTimezoneSave()}
                        disabled={isLoading || isSavingTimezone || timezone === savedTimezone}
                      >
                        сохранить
                      </Button>
                    </div>
                  </div>

                  {message ? (
                    <p
                      className={
                        message.type === 'error'
                          ? 'profile-page__message profile-page__message--error'
                          : 'profile-page__message'
                      }
                    >
                      {message.text}
                    </p>
                  ) : null}
                </div>

                <div className="profile-page__avatar-column">
                  <button
                    type="button"
                    className="profile-page__avatar-button"
                    onClick={() => setShowUpload(true)}
                    aria-label="Изменить фото профиля"
                  >
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Аватар профиля" className="profile-page__avatar-image" />
                    ) : (
                      <span className="profile-page__avatar-placeholder">
                        <AddImageIcon />
                        <span>Добавьте свое фото</span>
                      </span>
                    )}
                  </button>
                  <Button
                    type="button"
                    variant="link"
                    className="profile-page__avatar-action"
                    onClick={() => setShowUpload(true)}
                  >
                    изменить фото профиля
                  </Button>
                </div>
              </div>

              <div className="profile-page__actions">
                <Button
                  type="button"
                  size="lg"
                  className="profile-page__action-button"
                  onClick={() => setShowChangePassword(true)}
                >
                  Сменить пароль
                </Button>
                <Button
                  type="button"
                  size="lg"
                  variant="outlined"
                  className="profile-page__action-button profile-page__action-button--outlined"
                  onClick={() => setShowExit(true)}
                >
                  Выйти из профиля
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>
      <DashboardBottomNav />

      <ChangePasswordModal isOpen={showChangePassword} onClose={() => setShowChangePassword(false)} />
      <ConfirmExitModal
        isOpen={showExit}
        onClose={() => {
          setShowExit(false);
          onClose?.();
        }}
      />
      <UploadAvatarModal
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        onUploaded={async () => {
          await loadProfile();
        }}
      />
    </>
  );
}
