import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useNotifications, type AppNotification } from '@/features/notifications';
import { cn } from '@/shared/lib/cn';
import { Button, Tabs } from '@/shared/ui';
import { ArhivIcon, CheckIcon, CloseIcon, MoreVerticalIcon } from '@/shared/ui/icons';

type NotificationsTab = 'all' | 'unread';

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function getGroupLabel(value: string) {
  const date = new Date(value);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (isSameDay(date, now)) {
    return 'Сегодня';
  }

  if (isSameDay(date, yesterday)) {
    return 'Вчера';
  }

  return 'Ранее';
}

function formatMeta(value: string) {
  const date = new Date(value);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.max(0, Math.round(diffMs / (1000 * 60)));
  const dateLabel = new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);

  if (isSameDay(date, now) && diffMinutes > 0 && diffMinutes < 60) {
    const minutesLabel =
      diffMinutes % 10 === 1 && diffMinutes % 100 !== 11
        ? 'минута'
        : diffMinutes % 10 >= 2 && diffMinutes % 10 <= 4 && (diffMinutes % 100 < 12 || diffMinutes % 100 > 14)
          ? 'минуты'
          : 'минут';
    return `${dateLabel} • ${diffMinutes} ${minutesLabel} назад`;
  }

  const timeLabel = new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);

  return `${dateLabel} • ${timeLabel}`;
}

function groupNotifications(items: AppNotification[]) {
  const groups = new Map<string, AppNotification[]>();

  items.forEach((item) => {
    const label = getGroupLabel(item.createdAt);
    groups.set(label, [...(groups.get(label) ?? []), item]);
  });

  return ['Сегодня', 'Вчера', 'Ранее']
    .map((label) => ({ label, items: groups.get(label) ?? [] }))
    .filter((group) => group.items.length > 0);
}

export function NotificationsPanel() {
  const {
    notifications,
    unreadCount,
    isPanelOpen,
    isBulkPending,
    closePanel,
    markAsRead,
    archiveNotification,
    markAllAsRead,
    deleteAll,
  } = useNotifications();
  const [tab, setTab] = useState<NotificationsTab>('all');
  const [menuNotificationId, setMenuNotificationId] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const handleClosePanel = useCallback(() => {
    setMenuNotificationId(null);
    closePanel();
  }, [closePanel]);

  const activeNotifications = useMemo(
    () =>
      notifications
        .filter((item) => !item.archived)
        .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)),
    [notifications],
  );

  const visibleNotifications = useMemo(() => {
    if (tab === 'unread') {
      return activeNotifications.filter((item) => !item.read);
    }

    return activeNotifications;
  }, [activeNotifications, tab]);

  const groups = useMemo(() => groupNotifications(visibleNotifications), [visibleNotifications]);

  useEffect(() => {
    if (!isPanelOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (panelRef.current?.contains(event.target as Node)) {
        return;
      }

      handleClosePanel();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClosePanel();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleClosePanel, isPanelOpen]);

  if (!isPanelOpen) {
    return null;
  }

  return (
    <div className="notifications-panel-layer">
      <div className="notifications-panel-backdrop" aria-hidden="true" />
      <div className="notifications-panel" ref={panelRef} role="dialog" aria-modal="true" aria-label="Уведомления">
        <div className="notifications-panel__header">
          <h2 className="notifications-panel__title">Уведомления</h2>
          <button
            type="button"
            className="notifications-panel__close"
            aria-label="Закрыть уведомления"
            onClick={handleClosePanel}
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <Tabs
          className="notifications-panel__tabs"
          value={tab}
          onChange={(value) => setTab(value as NotificationsTab)}
          items={[
            { value: 'all', label: 'Все' },
            { value: 'unread', label: `Непрочитанные (${unreadCount})` },
          ]}
        />

        <div className="notifications-panel__body">
          {groups.length === 0 ? (
            <div className="notifications-panel__empty">Нет уведомлений</div>
          ) : (
            groups.map((group) => (
              <section key={group.label} className="notifications-panel__group">
                <h3 className="notifications-panel__group-title">{group.label}</h3>
                <div className="notifications-panel__list">
                  {group.items.map((item) => {
                    const isMenuOpen = menuNotificationId === item.id;
                    return (
                      <article key={item.id} className="notifications-card">
                        <div className="notifications-card__top">
                          <div className="notifications-card__heading">
                            <span className="notifications-card__title">{item.title}</span>
                            <span className="notifications-card__meta">{formatMeta(item.createdAt)}</span>
                          </div>
                          <div className="notifications-card__actions">
                            <button
                              type="button"
                              className="notifications-card__menu-trigger"
                              aria-label="Действия с уведомлением"
                              aria-expanded={isMenuOpen}
                              onClick={() => setMenuNotificationId((prev) => (prev === item.id ? null : item.id))}
                            >
                              <MoreVerticalIcon className="h-4 w-4" />
                            </button>
                            {isMenuOpen ? (
                              <div className="notifications-card__menu">
                                <button
                                  type="button"
                                  className="notifications-card__menu-item"
                                  onClick={() => {
                                    markAsRead(item.id);
                                    setMenuNotificationId(null);
                                  }}
                                >
                                  <CheckIcon className="h-4 w-4" />
                                  <span>Прочитать</span>
                                </button>
                                <button
                                  type="button"
                                  className="notifications-card__menu-item"
                                  onClick={() => {
                                    archiveNotification(item.id);
                                    setMenuNotificationId(null);
                                  }}
                                >
                                  <ArhivIcon className="h-4 w-4" />
                                  <span>Архивировать</span>
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div className="notifications-card__content">
                          {!item.read ? <span className="notifications-card__dot" aria-hidden="true" /> : null}
                          <p className="notifications-card__description">{item.description}</p>
                        </div>

                        <div className="notifications-card__tags">
                          {item.tags.map((tag) => (
                            <span
                              key={tag.label}
                              className={cn(
                                'notifications-card__tag',
                                tag.tone === 'danger' && 'notifications-card__tag--danger',
                              )}
                            >
                              {tag.label}
                            </span>
                          ))}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>

        <div className="notifications-panel__footer">
          <Button
            type="button"
            variant="tonal"
            size="sm"
            disabled={activeNotifications.length === 0 || unreadCount === 0 || isBulkPending}
            onClick={markAllAsRead}
          >
            {isBulkPending ? "Ожидайте..." : "Прочитать все"}
          </Button>
          <Button
            type="button"
            variant="outlined"
            size="sm"
            disabled={activeNotifications.length === 0 || isBulkPending}
            onClick={deleteAll}
          >
            {isBulkPending ? "Ожидайте..." : "Удалить все"}
          </Button>
        </div>
      </div>
    </div>
  );
}

