import { Link, useNavigate } from 'react-router-dom';

import type { Attachment, Project, Subtask, Tag, Task } from '@/shared/api';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/shared/ui';
import { ChevronDownIcon } from '@/shared/ui/icons';
import { TaskBoardFilters } from '@/widgets/project/TaskBoardFilters';
import { TaskBoardCard } from '@/widgets/project/TaskBoardCard';
import { DownloadFilesModal } from '@/widgets/modals';
import { useTaskBoardFilters } from '@/widgets/project/model/useTaskBoardFilters';
import { ProjectActionsMenu, ProjectCard } from '@/widgets/dashboard';
import { formatDate } from '@/shared/lib/date';
import { isProjectDeadlineOverdue } from '@/entities/project';
const demoTags: Tag[] = [
  { id: 1, name: 'frontend', color: '#3380F6' },
  { id: 2, name: 'design', color: '#F59E0B' },
  { id: 3, name: 'urgent', color: '#EF4444' },
];

const demoTagLookup: Record<number, Tag> = Object.fromEntries(
  demoTags.map((tag) => [tag.id, tag]),
);

const demoBoardItems: Array<{
  task: Task;
  subtasks: Subtask[];
  attachments: Attachment[];
}> = [
    {
      task: {
        id: 101,
        listId: 1,
        projectId: 1,
        title: 'Подготовить UI для карточки задачи',
        description: 'Собрать состояния карточки и проверить длинные заголовки.',
        dueDate: '2026-05-31',
        priority: 'medium',
        status: 'planned',
        assigneeId: null,
        tagIds: [1, 2],
        createdById: 1,
        isArchived: false,
        completedAt: null,
        createdAt: '2026-05-01T09:00:00.000Z',
        updatedAt: '2026-05-01T09:00:00.000Z',
        reminderDate: null,
        reminderTimeHour: null,
        reminderTimeMinutes: null,
        reminderRepeat: 'none',
      },
      subtasks: [
        {
          id: 201,
          taskId: 101,
          title: 'Подготовить базовый layout',
          status: 'done',
          createdAt: '2026-05-01T09:00:00.000Z',
          updatedAt: '2026-05-01T10:00:00.000Z',
        },
        {
          id: 202,
          taskId: 101,
          title: 'Проверить переполнение текста и теги',
          status: 'todo',
          createdAt: '2026-05-01T10:00:00.000Z',
          updatedAt: '2026-05-01T10:00:00.000Z',
        },
      ],
      attachments: [
        {
          id: 301,
          taskId: 101,
          filename: 'task-card-reference.png',
          contentType: 'image/png',
          size: 18432,
          s3Key: 'demo/task-card-reference.png',
          createdAt: '2026-05-01T10:15:00.000Z',
        },
      ],
    },
    {
      task: {
        id: 102,
        listId: 1,
        projectId: 1,
        title: 'Сверить критические сценарии доски',
        description: 'Карточка без тегов и вложений.',
        dueDate: '2026-06-02',
        priority: 'high',
        status: 'in_progress',
        assigneeId: null,
        tagIds: [],
        createdById: 1,
        isArchived: false,
        completedAt: null,
        createdAt: '2026-05-02T12:00:00.000Z',
        updatedAt: '2026-05-02T12:00:00.000Z',
        reminderDate: null,
        reminderTimeHour: null,
        reminderTimeMinutes: null,
        reminderRepeat: 'none',
      },
      subtasks: [],
      attachments: [],
    },
    {
      task: {
        id: 103,
        listId: 1,
        projectId: 1,
        title: 'Подготовить финальный показ для демо-страницы с очень длинным заголовком карточки задачи',
        description: 'Проверка длинного текста и состояния выполненной задачи.',
        dueDate: '2026-05-28',
        priority: 'low',
        status: 'done',
        assigneeId: null,
        tagIds: [3],
        createdById: 1,
        isArchived: false,
        completedAt: '2026-05-03T14:00:00.000Z',
        createdAt: '2026-05-02T09:00:00.000Z',
        updatedAt: '2026-05-03T14:00:00.000Z',
        reminderDate: null,
        reminderTimeHour: null,
        reminderTimeMinutes: null,
        reminderRepeat: 'none',
      },
      subtasks: [
        {
          id: 203,
          taskId: 103,
          title: 'Проверить состояние done',
          status: 'done',
          createdAt: '2026-05-02T09:00:00.000Z',
          updatedAt: '2026-05-03T14:00:00.000Z',
        },
      ],
      attachments: [],
    },
  ];

const demoProjects: Array<Project> = [
  {
    id: 1,
    createdAt: "2026-04-21",
    startAt: "",
    name: "Проект № 1",
    status: "in_progress",
    deadline: "2026-05-31",
    tasksCountAll: 5,
    tasksCountDone: 1
  },
  {
    id: 2,
    createdAt: "2026-05-10",
    startAt: "",
    name: "Проект № 2",
    status: "done",
    deadline: "2026-06-30",
    tasksCountAll: 1,
    tasksCountDone: 0
  },
];

const overdueHighlightStatuses: Project['status'][] = ['in_progress', 'under_threat'];

export function WidgetsDemoPage() {
  // Pages
  const navigate = useNavigate();

  // Projects
  const [menuProjectId, setMenuProjectId] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const handleProjectClick = (projectId: number) => {
    console.log(`Переход в проект № ${projectId}`);
  };

  useEffect(() => {
    if (!menuProjectId) {
      return undefined;
    }

    const handleClickOutside = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) {
        return;
      }
      setMenuProjectId(null);
    };

    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, [menuProjectId]);

  const [showDownloadFiles, setShowDownloadFiles] = useState(false);
  const {
    search,
    setSearch,
    filtersOpen,
    setFiltersOpen,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    tagFilters,
    dueFrom,
    setDueFrom,
    dueTo,
    setDueTo,
    activePriorityLabel,
    activeStatusLabel,
    toggleTagFilter,
    removeTagFilter,
  } = useTaskBoardFilters();

  const handleDownloadFilesSubmit = () => {
    setShowDownloadFiles(false);
  };

  return (
    <>
      <div className="container stack stack-gap-lg py-10">
        <header className="stack stack-gap-sm">
          <Link to="/" className="inline-flex items-center gap-2 text-body-sm text-[color:var(--color-text-secondary)]">
            <ChevronDownIcon className="h-4 w-4 rotate-90" />
            Назад
          </Link>
          <div className="stack stack-gap-sm">
            <h1 className="text-h1">Галерея виджетов</h1>
            <p className="text-body">Составные UI-блоки: модалки, сайдбары и другие виджеты приложения.</p>
          </div>
        </header>

        {/* Секция модальных окон */}
        <section className="stack stack-gap-md">
          <h2 className="text-h2 border-b pb-2">Modals</h2>
          <p className="text-body-sm text-[color:var(--color-text-secondary)]">
            Секция-презентация модальных окон. Переход к отдельному окну осуществляется по клику на соответствующую кнопку.
          </p>

          <div className="grid grid--1 [--grid-columns:1] sm:[--grid-columns:3] md:[--grid-columns:4] grid-gap-md">
            <div className="surface p-6 rounded-lg stack stack-gap-sm">
              <h3 className="text-h3 truncate whitespace-break-spaces">Загрузка файлов</h3>
              <p className="text-body-sm text-[color:var(--color-text-secondary)]">
                Модальное окно для добавления файлов определенного формата.
              </p>
              <Button size='lg' onClick={() => setShowDownloadFiles(true)}>Показать</Button>
            </div>
            <DownloadFilesModal
              isOpen={showDownloadFiles}
              onClose={() => setShowDownloadFiles(false)}
              onSubmit={handleDownloadFilesSubmit}
            />

            {/* Следующее модальное окно */}
          </div>
        </section>

        {/* Секция страниц */}
        <section className="stack stack-gap-md">
          <h2 className="text-h2 border-b pb-2">Pages</h2>
          <p className="text-body-sm text-[color:var(--color-text-secondary)]">
            Секция-презентация готовых страниц. Переход на отдельную страницу по клику на соответствующую кнопку.
          </p>
          <div className="grid grid--1 [--grid-columns:1] sm:[--grid-columns:3] md:[--grid-columns:4] grid-gap-md">
            <div className="surface p-6 rounded-lg stack stack-gap-sm ">
              <h3 className="text-h3 truncate whitespace-break-spaces">Страница Profile</h3>
              <div className="stack stack-gap-sm m-auto">
                <Link
                  to="/profile"
                  role="button"
                  className="btn btn--primary btn--lg text-center"
                  onKeyDown={(e) => {
                    if (e.key === ' ') {
                      e.preventDefault();
                      navigate('/profile');
                    }
                  }}
                >
                  Показать профиль
                </Link>
              </div>
            </div>

            {/* Следующая страница */}
          </div>
        </section>

        {/* Секция проектов */}
        <section className="stack stack-gap-md">
          <div className="stack stack-gap-sm">
            <h2 className="text-h2 border-b pb-2">Projects</h2>
            <p className="text-body-sm text-[color:var(--color-text-secondary)]">
              Секция с реальными примерами карточек проектов без интеграции с API.
            </p>
          </div>

          <div className="stack stack-gap-sm">
            <h3 className="text-h3">Примеры карточек</h3>
            <p className="text-body-sm text-[color:var(--color-text-secondary)]">
              Обычная карточка, а также выполненная карточка проекта.
            </p>
          </div>

          <div className="surface p-5 project-list">
            {demoProjects.map((project) => (
              <div
                key={project.id}
                role="button"
                tabIndex={0}
                className="project-list__item"
                onClick={() => handleProjectClick(project.id)}
                onKeyDown={(e) => {
                  if (e.target !== e.currentTarget) {
                    return;
                  }
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleProjectClick(project.id);
                  }
                }}
              >
                <ProjectCard
                  name={project.name}
                  status={project.status}
                  tasksCount={project.tasksCountAll ?? 0}
                  tasksDone={project.tasksCountDone}
                  deadline={formatDate(project.deadline)}
                  createdAt={formatDate(project.createdAt)}
                  isOverdue={isProjectDeadlineOverdue(project.deadline, project.status, {
                    overdueStatuses: overdueHighlightStatuses,
                  })}
                  menu={
                    <ProjectActionsMenu
                      project={project}
                      isOpen={menuProjectId === project.id}
                      menuRef={menuRef}
                      onToggle={() =>
                        setMenuProjectId((prev) => (prev === project.id ? null : project.id))
                      }
                      onEdit={(item) => {
                        console.log(`Редактировать проект id № ${item.id}`);
                        setMenuProjectId(null);
                      }}
                      onArchive={(item) => {
                        console.log(`Добавить в архив проект id № ${item.id}`);
                        setMenuProjectId(null);
                      }
                      }
                      onRestore={(item) => {
                        console.log(`Восстановить из архива проект id № ${item.id}`);
                        setMenuProjectId(null);
                      }
                      }
                      onDelete={(item) => {
                        console.log(`Удалить проект id № ${item.id}`);
                        setMenuProjectId(null);
                      }
                      }
                    />
                  }
                />
              </div>
            ))}
          </div>
        </section>

        {/* Секция задач */}
        <section className="stack stack-gap-md">
          <div className="stack stack-gap-sm">
            <h2 className="text-h2 border-b pb-2">Tasks</h2>
            <p className="text-body-sm text-[color:var(--color-text-secondary)]">
              Демо секция с реальными примерами фильтров и карточек задачи без интеграции с API.
            </p>
          </div>
          <div className="surface p-5 project-board">
            <div className="project-board__toolbar">
              <TaskBoardFilters
                search={search}
                onSearchChange={setSearch}
                filtersOpen={filtersOpen}
                onFiltersOpenChange={setFiltersOpen}
                priorityDateFiltersEnabled
                statusFilterEnabled
                priorityFilter={priorityFilter}
                onPriorityFilterChange={setPriorityFilter}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                tagFilters={tagFilters}
                tags={demoTags}
                onToggleTagFilter={toggleTagFilter}
                onRemoveTagFilter={removeTagFilter}
                dueFrom={dueFrom}
                onDueFromChange={setDueFrom}
                dueTo={dueTo}
                onDueToChange={setDueTo}
                activePriorityLabel={activePriorityLabel}
                activeStatusLabel={activeStatusLabel}
              />
            </div>
            <div className="flex flex-col gap-4">
              <div className="kanban-column__header">
                <div className="stack stack-gap-xs">
                  <h3 className="text-h3">Примеры карточек</h3>
                  <p className="text-body-sm text-[color:var(--color-text-secondary)]">
                    Обычная карточка, карточка с тегами и подзадачами, а также выполненная задача.
                  </p>
                </div>
              </div>
              <div className="kanban-column__cards max-w-73.25 sm:m-auto">
                {demoBoardItems.map((item) => (
                  <TaskBoardCard
                    key={item.task.id}
                    task={item.task}
                    subtasks={item.subtasks}
                    attachments={item.attachments}
                    tagLookup={demoTagLookup}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
