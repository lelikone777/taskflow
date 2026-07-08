import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';

import { NotificationsProvider } from '@/features/notifications';
import { ProjectCreateProvider } from '@/features/project-create';
import { queryClient } from './query-client';

import { Toaster } from 'sonner';

type AppProviderProps = {
  children: ReactNode;
};

export function AppProvider({ children }: AppProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster closeButton richColors position="top-right"/>
      <NotificationsProvider>
        <ProjectCreateProvider>{children}</ProjectCreateProvider>
      </NotificationsProvider>
    </QueryClientProvider>
  );
}
