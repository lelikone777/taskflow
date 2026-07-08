import { useEffect } from 'react';

import type { Task, TaskStatus } from '@/shared/api';
import { ChevronRightIcon, DeleteIcon, MoreVerticalIcon, RecoverIcon } from '@/shared/ui/icons';
import { EditMenuIcon } from '@/shared/ui/icons/EditMenuIcon';
import { cn } from '@/shared/lib/cn';
import { useKeyboardMenu } from '@/shared/lib/hooks/useKeyboardMenu';
import type { TaskStatusAction } from '@/entities/task';


export type TaskBoardCardActionsMenuProps = {
  task: Task;
  isOpen: boolean;
  statusAction: TaskStatusAction;
  onToggle: () => void;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onOpen?: (task: Task) => void;
  onRestore?: (taskId: number, status: TaskStatus) => void;
  triggerVariant?: 'default' | 'ghost';
};

export function TaskBoardCardActionsMenu({
  task,
  isOpen, 
  statusAction, 
  onToggle,
  onEdit,
  onDelete,
  onOpen,
  onRestore,
  triggerVariant = 'ghost',
}: TaskBoardCardActionsMenuProps) {

  const menuItems = [
    {
      label: 'Редактировать',
      value: 'edit',
      icon: <EditMenuIcon />,
      onClick: () => onEdit?.(task),
      show: true
    },
    {
      label: 'Открыть',
      value: 'open',
      icon: <ChevronRightIcon />,
      onClick: () => onOpen?.(task),
      show: !!onOpen
    },
    {
      label: 'Восстановить',
      value: 'restore',
      icon: <RecoverIcon />,
      onClick: () => onRestore?.(task.id, 'in_progress'),
      show: statusAction.done && !!onRestore
    },
    {
      label: 'Удалить',
      value: 'delete',
      icon: <DeleteIcon />,
      onClick: () => onDelete?.(task),
      show: true,
      danger: true
    },
  ].filter(item => item.show);

  const { menuRef, handleKeyDown } = useKeyboardMenu(isOpen, onToggle);

  // clickOutside
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleClick = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      onToggle();
    }

    document.addEventListener('pointerdown', handleClick);
    return () => document.removeEventListener('pointerdown', handleClick);
  }, [isOpen, menuRef, onToggle]);

  return (
    <div
      className="menu shrink-0"
      ref={menuRef}
      onKeyDown={
        (event) => {
          event.stopPropagation();
          handleKeyDown(event);
        }} >
      <button
        type="button"
        className={cn(
          triggerVariant === 'ghost' ? 'menu__button menu__button--ghost' : 'menu__button'
        )}
        aria-label="Меню задачи"
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
      >
        <MoreVerticalIcon className="h-4 w-4" />
      </button>
      {isOpen ? (
        <div
          role="menu"
          className="menu__popover menu__popover--overlay"
        >

          {menuItems.map((item) => (
            <button
              key={item.label}
              role="menuitem"
              className={cn(
                'menu__item project-card-menu__item text-body-sm',
                'menu__item--focused', 
                item.danger && 'menu__item--danger'
              )}
              onPointerDown={(event) => event.stopPropagation()} // Остановка всплытия нажатия указателя
              onClick={(event) => {
                event.stopPropagation();
                item.onClick();
                onToggle();
              }}
            >
              <div className='w-6 h-6'>{item.icon}</div>
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
