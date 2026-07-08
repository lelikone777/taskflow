import type { ReactNode } from 'react';
import { useEffect, useEffectEvent, useRef } from 'react';

import { cn } from '@/shared/lib/cn';
import { IconButton } from '@/shared/ui/Button';
import { CloseIcon } from '@/shared/ui/icons';

type ModalSize = 'sm' | 'md' | 'lg';

export type ModalProps = {
  isOpen: boolean;
  onClose?: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  closeOnOverlay?: boolean;
  showClose?: boolean;
  className?: string;
  type?: 'page' | 'modal';
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnOverlay = true,
  showClose = true,
  className,
  type = 'modal',
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);
  const handleClose = useEffectEvent(() => {
    onClose?.();
  });

  useEffect(() => {
    if (!isOpen) return;

    const modal = modalRef.current;
    if (!modal) return;

    prevFocusRef.current = document.activeElement as HTMLElement;

    const selectors =
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

    const getFocusable = () =>
      Array.from(modal.querySelectorAll<HTMLElement>(selectors));

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
        return;
      }

      if (e.key !== "Tab") return;

      const focusable = getFocusable();
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (!modal.contains(document.activeElement)) {
        e.preventDefault();
        if (e.shiftKey) {
          last.focus();
        } else {
          first.focus();
        }
        return;
      }

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    modal.addEventListener("keydown", handleKeyDown);
    getFocusable()[0]?.focus();

    document.body.style.overflow = "hidden";

    return () => {
      modal.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      prevFocusRef.current?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className={cn('modal-overlay', `${type === 'page' ? 'modal-overlay--page' : ''}`)}
        data-state={isOpen ? 'open' : 'closed'}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-hidden={!isOpen}
      >
        <div
          className={cn('modal', `modal--${size}`, className)}
          data-state={isOpen ? 'open' : 'closed'}
          onClick={(event) => event.stopPropagation()}
          tabIndex={-1}
          ref={modalRef}
        >
          {showClose || title ? (
            <div className={`modal__header`}>
              {title ? title : <span />}
              {showClose ? (
                <IconButton
                  type="button"
                  variant="outlined"
                  className="modal__close z-10"
                  aria-label="Закрыть модальное окно"
                  onClick={onClose}
                >
                  <CloseIcon className="h-6 w-6" />
                </IconButton>
              ) : null}
            </div>
          ) : null}
          <div className="modal__body">{children}</div>
          {footer ? <div className="modal__footer">{footer}</div> : null}
        </div>
        {closeOnOverlay ? (
          <button
            type="button"
            className="modal__backdrop"
            aria-label="Закрыть модальное окно"
            onClick={onClose}
          />
        ) : (
          <div className='modal__backdrop modal__backdrop--off' />
        )}
      </div>
    </>
  );
}
