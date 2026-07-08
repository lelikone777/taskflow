import { AxiosError } from 'axios';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LoginPage } from '@/pages/auth/LoginPage';

const registerMock = vi.fn();
const loginMock = vi.fn();
const confirmRegistrationMock = vi.fn();

vi.mock('@/shared/api', () => ({
  register: (...args: unknown[]) => registerMock(...args),
  login: (...args: unknown[]) => loginMock(...args),
  confirmRegistration: (...args: unknown[]) => confirmRegistrationMock(...args),
}));

describe('LoginPage register validation errors', () => {
  beforeEach(() => {
    registerMock.mockReset();
    loginMock.mockReset();
    confirmRegistrationMock.mockReset();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('shows backend details validation message for invalid registration email', async () => {
    registerMock.mockRejectedValue(
      new AxiosError('Request failed with status code 422', undefined, undefined, undefined, {
        data: {
          error: 'Ошибка валидации данных.',
          details: [
            {
              field: 'email',
              message: 'Ошибка валидации формата Email',
            },
          ],
        },
        status: 422,
        statusText: 'Unprocessable Entity',
        headers: {},
        config: { headers: undefined as never },
      }),
    );

    render(
      <MemoryRouter initialEntries={['/register']}>
        <LoginPage initialTab="register" />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText('name@email.com'), {
      target: { value: `${'a'.repeat(65)}@mail.ru` },
    });
    fireEvent.change(screen.getByPlaceholderText('Введите пароль'), {
      target: { value: 'ValidPassword1!' },
    });
    fireEvent.change(screen.getByPlaceholderText('Повторите пароль'), {
      target: { value: 'ValidPassword1!' },
    });

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Зарегистрироваться' }));

    await waitFor(() => {
      expect(registerMock).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText('Ошибка валидации формата Email')).toBeInTheDocument();
  });

  it('shows backend error text for already registered email', async () => {
    registerMock.mockRejectedValue(
      new AxiosError('Request failed with status code 400', undefined, undefined, undefined, {
        data: {
          error: 'Вы уже зарегистрированы в сервисе.',
        },
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: { headers: undefined as never },
      }),
    );

    render(
      <MemoryRouter initialEntries={['/register']}>
        <LoginPage initialTab="register" />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText('name@email.com'), {
      target: { value: 'existing_user@mail.ru' },
    });
    fireEvent.change(screen.getByPlaceholderText('Введите пароль'), {
      target: { value: 'ValidPassword1!' },
    });
    fireEvent.change(screen.getByPlaceholderText('Повторите пароль'), {
      target: { value: 'ValidPassword1!' },
    });

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Зарегистрироваться' }));

    await waitFor(() => {
      expect(registerMock).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText('Вы уже зарегистрированы в сервисе.')).toBeInTheDocument();
  });

  it('shows backend error text for invalid login password', async () => {
    loginMock.mockRejectedValue(
      new AxiosError('Request failed with status code 400', undefined, undefined, undefined, {
        data: {
          error: 'Проверьте корректность введенных данных и попробуйте ещё раз.',
        },
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: { headers: undefined as never },
      }),
    );

    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage initialTab="login" />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText('name@email.com'), {
      target: { value: 'existing_user@mail.ru' },
    });
    fireEvent.change(screen.getByPlaceholderText('Введите пароль'), {
      target: { value: 'WrongPassword1!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Войти' }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText('Проверьте корректность введенных данных и попробуйте ещё раз.')).toBeInTheDocument();
  });

  it('shows backend error text when account is blocked after failed logins', async () => {
    loginMock.mockRejectedValue(
      new AxiosError('Request failed with status code 403', undefined, undefined, undefined, {
        data: {
          error: 'Вы ввели неверный пароль 5 раз. Аккаунт заблокирован на 1 час.',
        },
        status: 403,
        statusText: 'Forbidden',
        headers: {},
        config: { headers: undefined as never },
      }),
    );

    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage initialTab="login" />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText('name@email.com'), {
      target: { value: 'existing_user@mail.ru' },
    });
    fireEvent.change(screen.getByPlaceholderText('Введите пароль'), {
      target: { value: 'WrongPassword1!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Войти' }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText('Вы ввели неверный пароль 5 раз. Аккаунт заблокирован на 1 час.')).toBeInTheDocument();
  });
});
