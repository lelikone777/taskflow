import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NotificationsProvider } from '@/features/notifications/providers/NotificationsProvider';

const fetchUserRemindersMock = vi.fn();
const getTokenMock = vi.fn();

vi.mock('@/shared/lib/auth', () => ({
  getToken: () => getTokenMock(),
}));

vi.mock('@/shared/api', () => ({
  fetchUserReminders: (...args: unknown[]) => fetchUserRemindersMock(...args),
  markReminderRead: vi.fn(),
  deleteReminder: vi.fn(),
  queryKeys: {
    reminders: {
      all: () => ['reminders'],
    },
  },
}));

function renderWithProviders() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <NotificationsProvider>
        <div>child</div>
      </NotificationsProvider>
    </QueryClientProvider>,
  );
}

describe('NotificationsProvider auth guard', () => {
  beforeEach(() => {
    fetchUserRemindersMock.mockReset();
    getTokenMock.mockReset();
    fetchUserRemindersMock.mockResolvedValue([]);
  });

  it('does not request reminders without access token', async () => {
    getTokenMock.mockReturnValue(null);

    renderWithProviders();

    await waitFor(() => {
      expect(fetchUserRemindersMock).not.toHaveBeenCalled();
    });
  });

  it('requests reminders when access token exists', async () => {
    getTokenMock.mockReturnValue('token');

    renderWithProviders();

    await waitFor(() => {
      expect(fetchUserRemindersMock).toHaveBeenCalledTimes(1);
    });
  });
});

