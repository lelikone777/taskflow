import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AxiosError } from 'axios';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProfilePage } from '@/pages/profile/ProfilePage';

const meMock = vi.fn();
const updateProfileMock = vi.fn();

vi.mock('@/shared/api', () => ({
  me: (...args: unknown[]) => meMock(...args),
  updateProfile: (...args: unknown[]) => updateProfileMock(...args),
}));

vi.mock('@/widgets/modals', () => ({
  ChangePasswordModal: () => null,
  ConfirmExitModal: () => null,
  UploadAvatarModal: () => null,
}));

vi.mock('@/widgets/dashboard', () => ({
  DashboardSidebar: () => null,
  DashboardBottomNav: () => null,
}));

describe('ProfilePage update behavior', () => {
  beforeEach(() => {
    meMock.mockReset();
    updateProfileMock.mockReset();

    meMock.mockResolvedValue({
      id: 1,
      email: 'user@example.com',
      username: '',
      timezone: 'Europe/Moscow',
      avatarUrl: null,
      projects: [],
    });

    updateProfileMock.mockResolvedValue({
      id: 1,
      email: 'user@example.com',
      username: 'Al',
      timezone: 'Europe/Moscow',
      avatarUrl: null,
      projects: [],
    });
  });

  it('does not call backend for name shorter than 2 chars', async () => {
    render(
      <MemoryRouter>
        <ProfilePage isOpen={true} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(meMock).toHaveBeenCalledTimes(1);
    });

    const nameInput = screen.getByLabelText('Имя');
    fireEvent.change(nameInput, { target: { value: 'A' } });
    fireEvent.blur(nameInput);

    expect(updateProfileMock).not.toHaveBeenCalled();
  });

  it('calls backend on blur for valid name length', async () => {
    render(
      <MemoryRouter>
        <ProfilePage isOpen={true} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(meMock).toHaveBeenCalledTimes(1);
    });

    const nameInput = screen.getByLabelText('Имя');
    fireEvent.change(nameInput, { target: { value: 'Al' } });
    fireEvent.blur(nameInput);

    await waitFor(() => {
      expect(updateProfileMock).toHaveBeenCalledWith({ username: 'Al' });
    });
  });

  it('shows backend username conflict message instead of generic profile error', async () => {
    updateProfileMock.mockRejectedValue(
      new AxiosError('Request failed with status code 409', undefined, undefined, undefined, {
        data: {
          error: 'Ошибка валидации',
          details: [
            {
              field: 'username',
              message: 'Имя пользователя уже занято, попробуйте использовать другое.',
            },
          ],
        },
        status: 409,
        statusText: 'Conflict',
        headers: {},
        config: { headers: undefined as never },
      }),
    );

    render(
      <MemoryRouter>
        <ProfilePage isOpen={true} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(meMock).toHaveBeenCalledTimes(1);
    });

    const nameInput = screen.getByLabelText('Имя');
    fireEvent.change(nameInput, { target: { value: 'occupied_name' } });
    fireEvent.blur(nameInput);

    expect(
      await screen.findByText('Имя пользователя уже занято, попробуйте использовать другое.'),
    ).toBeInTheDocument();
  });

  it('saves selected timezone via profile update', async () => {
    updateProfileMock.mockResolvedValue({
      id: 1,
      email: 'user@example.com',
      username: '',
      timezone: 'Europe/Paris',
      avatarUrl: null,
      projects: [],
    });

    render(
      <MemoryRouter>
        <ProfilePage isOpen={true} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(meMock).toHaveBeenCalledTimes(1);
    });

    const timezoneSelect = screen.getByLabelText('Часовой пояс');
    fireEvent.change(timezoneSelect, { target: { value: 'Europe/Paris' } });

    fireEvent.click(screen.getByRole('button', { name: 'сохранить' }));

    await waitFor(() => {
      expect(updateProfileMock).toHaveBeenCalledWith({ timezone: 'Europe/Paris' });
    });
  });
});
