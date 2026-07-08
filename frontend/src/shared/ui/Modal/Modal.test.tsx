import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Modal } from './Modal';

describe('Modal', () => {
  it('does not steal focus from an input when rerendered with a new onClose handler', () => {
    const { rerender } = render(
      <Modal isOpen={true} onClose={() => undefined} title="Change password">
        <input aria-label="New password" />
      </Modal>,
    );

    const input = screen.getByLabelText('New password');
    input.focus();

    expect(input).toHaveFocus();

    rerender(
      <Modal isOpen={true} onClose={() => vi.fn()} title="Change password">
        <input aria-label="New password" />
      </Modal>,
    );

    expect(screen.getByLabelText('New password')).toHaveFocus();
  });
});
