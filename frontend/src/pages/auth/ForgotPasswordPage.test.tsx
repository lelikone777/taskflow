import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';

const requestPasswordRecoveryMock = vi.fn();

vi.mock('@/shared/api', () => ({
  requestPasswordRecovery: (...args: unknown[]) => requestPasswordRecoveryMock(...args),
}));

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches,
      media: '(max-width: 767px)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

async function submitRecoveryForm(email: string) {
  render(
    <MemoryRouter>
      <ForgotPasswordPage />
    </MemoryRouter>,
  );

  const emailInput = screen.getByPlaceholderText('name@email.com');
  fireEvent.change(emailInput, { target: { value: email } });

  const submitButton = document.querySelector('button[type="submit"]');
  expect(submitButton).toBeTruthy();
  fireEvent.click(submitButton as HTMLButtonElement);

  await waitFor(() => {
    expect(requestPasswordRecoveryMock).toHaveBeenCalledWith(email.trim());
  });
}

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    requestPasswordRecoveryMock.mockReset();
    requestPasswordRecoveryMock.mockResolvedValue({ message: 'ok' });
  });

  it('submits recovery request on desktop viewport', async () => {
    mockMatchMedia(false);
    await submitRecoveryForm(' user@example.com ');
    expect(screen.getAllByPlaceholderText('name@email.com')).toHaveLength(1);
  });

  it('submits recovery request on mobile viewport', async () => {
    mockMatchMedia(true);
    await submitRecoveryForm('mobile@example.com');
    expect(screen.getAllByPlaceholderText('name@email.com')).toHaveLength(1);
  });
});

