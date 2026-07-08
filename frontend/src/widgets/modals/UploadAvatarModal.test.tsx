import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UploadAvatarModal } from '@/widgets/modals/UploadAvatarModal';

const uploadAvatarMock = vi.fn();

vi.mock('@/shared/api', () => ({
  uploadAvatar: (...args: unknown[]) => uploadAvatarMock(...args),
}));

vi.mock('@/shared/ui', async () => {
  const actual = await vi.importActual<typeof import('@/shared/ui')>('@/shared/ui');
  return {
    ...actual,
    Modal: ({
      isOpen,
      children,
    }: {
      isOpen: boolean;
      children: ReactNode;
    }) => (isOpen ? <div>{children}</div> : null),
  };
});

describe('UploadAvatarModal', () => {
  beforeEach(() => {
    uploadAvatarMock.mockReset();
  });

  it('does not show validation error before file selection', () => {
    render(<UploadAvatarModal isOpen={true} onClose={() => undefined} />);

    expect(screen.queryByText('Размер файла превышает 2 МБ')).not.toBeInTheDocument();
    expect(screen.getByText('Максимальный размер файла 2 МБ, формат JPG/JPEG/PNG')).toBeInTheDocument();
  });

  it('shows 2 MB validation message for oversized avatar', async () => {
    render(<UploadAvatarModal isOpen={true} onClose={() => undefined} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'avatar.png', { type: 'image/png' });

    fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByText('Размер файла превышает 2 МБ')).toBeInTheDocument();
    expect(uploadAvatarMock).not.toHaveBeenCalled();
  });
});
