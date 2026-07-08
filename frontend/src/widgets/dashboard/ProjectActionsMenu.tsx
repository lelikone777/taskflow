import type { RefObject } from 'react';

import type { Project } from '@/shared/api';
import { ArhivIcon, ChevronRightIcon, DeleteIcon, EditIcon, MoreVerticalIcon, RecoverIcon } from '@/shared/ui/icons';

export type ProjectActionsMenuProps = {
  project: Project;
  isOpen: boolean;
  onToggle: () => void;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  onOpen?: (project: Project) => void;
  onArchive?: (project: Project) => void;
  onRestore?: (project: Project) => void;
  menuRef?: RefObject<HTMLDivElement | null>;
  triggerVariant?: 'default' | 'ghost';
};

export function ProjectActionsMenu({
  project,
  isOpen,
  onToggle,
  onEdit,
  onDelete,
  onOpen,
  onArchive,
  onRestore,
  menuRef,
  triggerVariant = 'default',
}: ProjectActionsMenuProps) {
  return (
    <div className="menu" ref={isOpen ? menuRef : null}>
      <button
        type="button"
        className={triggerVariant === 'ghost' ? 'menu__button menu__button--ghost' : 'menu__button'}
        aria-label="Меню проекта"
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
      >
        <MoreVerticalIcon className="h-4 w-4" />
      </button>
      {isOpen ? (
        <div className="menu__popover">
          <button
            type="button"
            className="menu__item"
            onClick={(event) => {
              event.stopPropagation();
              onEdit(project);
            }}
          >
            <EditIcon className="h-4 w-4" />
            Редактировать
          </button>

          {onOpen ? (
            <button
              type="button"
              className="menu__item"
              onClick={(event) => {
                event.stopPropagation();
                onOpen(project);
              }}
            >
              <ChevronRightIcon className="h-4 w-4" />
              Открыть
            </button>
          ) : null}

          {project.status === 'archive' ? (
            onRestore ? (
              <button
                type="button"
                className="menu__item"
                onClick={(event) => {
                  event.stopPropagation();
                  onRestore(project);
                }}
              >
                <RecoverIcon className="h-4 w-4" />
                Восстановить
              </button>
            ) : null
          ) : onArchive ? (
            <button
              type="button"
              className="menu__item"
              onClick={(event) => {
                event.stopPropagation();
                onArchive(project);
              }}
            >
              <ArhivIcon className="h-4 w-4" />
              В архив
            </button>
          ) : null}

          <button
            type="button"
            className="menu__item menu__item--danger"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(project);
            }}
          >
            <DeleteIcon className="h-4 w-4" />
            Удалить
          </button>
        </div>
      ) : null}
    </div>
  );
}
