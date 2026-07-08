import { useEffect, useRef } from "react";

export function useKeyboardMenu(isOpen: boolean, onClose: () => void) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Автофокус на первый элемент при открытии меню
  useEffect(() => {
    if (isOpen && menuRef.current) {
      const trigger = menuRef.current.querySelector('button[aria-haspopup]');

      if (document.activeElement === trigger) {
        const firstItem = menuRef.current.querySelector<HTMLButtonElement>('[role="menuitem"]');
        const timer = setTimeout(() => firstItem?.focus(), 10);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen]);



  const handleKeyDown = (event: React.KeyboardEvent) => {
    const items = Array.from(
      menuRef?.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') || []
    );

    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        items[(currentIndex + 1) % items.length]?.focus();
        break;
      case 'ArrowUp':
        event.preventDefault();
        items[(currentIndex - 1 + items.length) % items.length]?.focus();
        break;
      case 'Home':
        event.preventDefault();
        items[0]?.focus();
        break;
      case 'End':
        event.preventDefault();
        items[items.length - 1]?.focus();
        break;
      case 'Escape':
        event.preventDefault();
        onClose();
        menuRef?.current?.querySelector<HTMLButtonElement>('button[aria-haspopup]')?.focus();
        break;
      case 'Tab': {
        event.preventDefault();
        const trigger = menuRef.current?.querySelector('button[aria-haspopup]');
        const isFocusOnTrigger = document.activeElement === trigger;

        if (isFocusOnTrigger && event.shiftKey) {
          onClose();
          return;
        }

        onClose();
        break;
      }
    }
  };

  return { menuRef, handleKeyDown };
}
