import { createContext, useContext } from 'react';

export type NotificationTagTone = 'neutral' | 'danger';

export type AppNotificationTag = {
  label: string;
  tone: NotificationTagTone;
};

export type AppNotification = {
  id: number;
  title: string;
  description: string;
  createdAt: string;
  read: boolean;
  archived: boolean;
  tags: AppNotificationTag[];
};

export type NotificationsContextValue = {
  notifications: AppNotification[];
  unreadCount: number;
  isPanelOpen: boolean;
  isBulkPending: boolean;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  markAsRead: (id: number) => void;
  archiveNotification: (id: number) => void;
  deleteNotification: (id: number) => void;
  markAllAsRead: () => void;
  deleteAll: () => void;
};

export const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function useNotifications() {
  const context = useContext(NotificationsContext);

  if (!context) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }

  return context;
}
