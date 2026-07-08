import type { ReactNode } from 'react';
import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { deleteReminder, fetchUserReminders, markReminderRead, queryKeys, type UserReminder } from '@/shared/api';
import { getToken } from '@/shared/lib/auth';
import type { AppNotification, AppNotificationTag } from '../model/notifications-context';
import { NotificationsContext } from '../model/notifications-context';
import { toast } from 'sonner';

function toIsoDateTime(date: string, hour: number, minutes: number): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day, hour, minutes).toISOString();
}

function mapStatusTag(status: UserReminder['taskStatus']): AppNotificationTag {
  if (status === 'done') {
    return { label: 'Завершена', tone: 'neutral' };
  }
  if (status === 'planned') {
    return { label: 'Запланирована', tone: 'neutral' };
  }
  return { label: 'В работе', tone: 'neutral' };
}

function mapReminderToNotification(reminder: UserReminder): AppNotification {
  const tags: AppNotificationTag[] = [mapStatusTag(reminder.taskStatus)];
  if (reminder.expired) {
    tags.push({ label: 'Просрочена', tone: 'danger' });
  }

  return {
    id: reminder.id,
    title: reminder.taskName || 'Напоминание',
    description: reminder.taskDescription || 'Напоминание по задаче.',
    createdAt: toIsoDateTime(reminder.sentDate, reminder.sentTimeHour, reminder.sentTimeMinutes),
    read: reminder.wasRead,
    archived: false,
    tags,
  };
}

type NotificationsProviderProps = {
  children: ReactNode;
};

export function NotificationsProvider({ children }: NotificationsProviderProps) {
  const queryClient = useQueryClient();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const hasToken = Boolean(getToken());

  // состояние запуска массовых операций
  const [isBulkPending, setIsBulkPending] = useState(false);
  
  // ref-lock
  const isBulkExecutingRef = useRef(false); 

  const remindersQuery = useQuery({
    queryKey: queryKeys.reminders.all(),
    queryFn: fetchUserReminders,
    enabled: hasToken,
    refetchInterval: hasToken ? 60_000 : false,
    staleTime: 30_000,
  });

  const markReadMutation = useMutation({
    mutationFn: (reminderId: number) => markReminderRead(reminderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reminders.all() });
    },
  });

  const deleteReminderMutation = useMutation({
    mutationFn: (reminderId: number) => deleteReminder(reminderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reminders.all() });
    },
  });

  const notifications = useMemo(
    () => (remindersQuery.data ?? []).map(mapReminderToNotification),
    [remindersQuery.data],
  );

  const value = useMemo(() => {
    const activeNotifications = notifications.filter((item) => !item.archived);
    const unreadCount = activeNotifications.filter((item) => !item.read).length;

    return {
      notifications: activeNotifications,
      unreadCount,
      isPanelOpen,
      isBulkPending,
      openPanel: () => setIsPanelOpen(true),
      closePanel: () => setIsPanelOpen(false),
      togglePanel: () => setIsPanelOpen((prev) => !prev),
      markAsRead: (id: number) => {
        if (markReadMutation.isPending) return;
        markReadMutation.mutate(id);
      },
      archiveNotification: (id: number) => {
        if (deleteReminderMutation.isPending) return;
        deleteReminderMutation.mutate(id);
      },
      deleteNotification: (id: number) => {
        if (deleteReminderMutation.isPending) return;
        deleteReminderMutation.mutate(id);
      },
      markAllAsRead: async () => {
        const unread = activeNotifications.filter((item) => !item.read).map((item) => item.id);
        if (unread.length === 0 || isBulkExecutingRef.current) return;

        isBulkExecutingRef.current = true;
        setIsBulkPending(true);
        try {
          const results = await Promise.allSettled(unread.map((id) => markReminderRead(id)));

          // проверка наличия ошибок по результатам массовой операции
          const hasErrors = results.some(res => res.status === 'rejected');
          if (hasErrors) {
            toast.error('Некоторые уведомления не удалось прочитать');
          } 
        } catch (error) {
          if (error instanceof Error) {
            toast.error(error.message);
          } else {
            toast.error('Произошла непредвиденная ошибка');
          }
        } finally {
          queryClient.invalidateQueries({ queryKey: queryKeys.reminders.all() });
          isBulkExecutingRef.current = false;
          setIsBulkPending(false);
        }
      },
      deleteAll: async () => {
        const ids = activeNotifications.map((item) => item.id);
        if (ids.length === 0 || isBulkExecutingRef.current) return;

        isBulkExecutingRef.current = true;
        setIsBulkPending(true);
        try {
          const results = await Promise.allSettled(ids.map((id) => deleteReminder(id)));

          // проверка наличия ошибок по результатам массовой операции
          const hasErrors = results.some((res) => res.status === 'rejected');
          if (hasErrors) {
            toast.error('Некоторые уведомления не удалось удалить');
          } 
        } catch (error) {
          if (error instanceof Error) {
            toast.error(error.message);
          } else {
            toast.error('Произошла непредвиденная ошибка');
          }
        } finally {
          queryClient.invalidateQueries({ queryKey: queryKeys.reminders.all() });
          isBulkExecutingRef.current = false;
          setIsBulkPending(false);
        }
      },
    };
  }, [deleteReminderMutation, isPanelOpen, markReadMutation, notifications, queryClient, isBulkPending]);

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}
