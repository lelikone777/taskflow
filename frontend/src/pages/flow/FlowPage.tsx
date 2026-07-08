import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createFlowNote,
  deleteFlowNote,
  fetchFlowNotesByDate,
  queryKeys,
  updateFlowNote,
  updateFlowNoteStatus,
  type FlowNote,
} from '@/shared/api';
import { cn } from '@/shared/lib/cn';
import { Button, EmptyState, Progress } from '@/shared/ui';
import { Calendar } from '@/shared/ui/Calendar';
import { CalendarIcon, ChevronDownIcon, DeleteIcon, EditIcon, PlusIcon } from '@/shared/ui/icons';
import { DashboardBottomNav, DashboardSidebar } from '@/widgets/dashboard';
import { toast } from 'sonner';

import './flow.css';

function toIsoDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseIsoDate(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

function formatSelectedDate(value: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  }).format(parseIsoDate(value));
}

function formatTimestamp(value?: string): string {
  if (!value) {
    return '';
  }

  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function FlowPage() {
  const queryClient = useQueryClient();
  const listRef = useRef<HTMLDivElement | null>(null);
  const composerInputRef = useRef<HTMLInputElement | null>(null);
  const calendarWrapRef = useRef<HTMLDivElement | null>(null);
  const today = useMemo(() => new Date(), []);

  const [selectedDate, setSelectedDate] = useState(() => toIsoDate(today));
  const [draftContent, setDraftContent] = useState('');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [editingDate, setEditingDate] = useState('');

  const selectedDateObject = useMemo(() => parseIsoDate(selectedDate), [selectedDate]);

  useEffect(() => {
    if (!isCalendarOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (calendarWrapRef.current?.contains(target)) return;
      setIsCalendarOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isCalendarOpen]);

  const notesQuery = useQuery({
    queryKey: queryKeys.flow.byDate(selectedDate),
    queryFn: () => fetchFlowNotesByDate(selectedDate),
  });

  const invalidateFlow = async (datesToRefresh: string[] = []) => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.flow.all() });
    await Promise.all(
      Array.from(new Set([selectedDate, ...datesToRefresh])).map((date) =>
        queryClient.invalidateQueries({ queryKey: queryKeys.flow.byDate(date) }),
      ),
    );
  };

  const createNoteMutation = useMutation({
    mutationFn: createFlowNote,
    onSuccess: async (note) => {
      setDraftContent('');
      await invalidateFlow([note.noteDate]);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Не удалось создать заметку.');
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: ({ noteId, note }: { noteId: number; note: { content?: string; noteDate?: string } }) =>
      updateFlowNote(noteId, note),
    onSuccess: async (note) => {
      setEditingNoteId(null);
      setEditingContent('');
      setEditingDate('');
      await invalidateFlow([note.noteDate]);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Не удалось обновить заметку.');
    },
  });

  const toggleNoteMutation = useMutation({
    mutationFn: ({ noteId, isCompleted }: { noteId: number; isCompleted: boolean }) =>
      updateFlowNoteStatus(noteId, isCompleted),
    onSuccess: async (note) => {
      await invalidateFlow([note.noteDate]);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Не удалось обновить статус заметки.');
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: deleteFlowNote,
    onSuccess: async () => {
      await invalidateFlow();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Не удалось удалить заметку.');
    },
  });

  const notes = useMemo(() => {
    return [...(notesQuery.data ?? [])].sort((left, right) => {
      if (left.isCompleted !== right.isCompleted) {
        return Number(left.isCompleted) - Number(right.isCompleted);
      }

      return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
    });
  }, [notesQuery.data]);

  const pendingNotes = useMemo(() => notes.filter((note) => !note.isCompleted), [notes]);
  const completedCount = notes.length - pendingNotes.length;
  const progressValue = notes.length === 0 ? 0 : Math.round((completedCount / notes.length) * 100);
  const focusNote = pendingNotes[0] ?? notes[0] ?? null;

  const isMutating =
    createNoteMutation.isPending ||
    updateNoteMutation.isPending ||
    toggleNoteMutation.isPending ||
    deleteNoteMutation.isPending;

  const startEditing = (note: FlowNote) => {
    setEditingNoteId(note.id);
    setEditingContent(note.content);
    setEditingDate(note.noteDate);
  };

  const cancelEditing = () => {
    setEditingNoteId(null);
    setEditingContent('');
    setEditingDate('');
  };

  const handleCreate = async () => {
    const content = draftContent.trim();
    if (!content) return;

    await createNoteMutation.mutateAsync({
      content,
      noteDate: selectedDate,
    });
  };

  const handleSaveEdit = async (noteId: number) => {
    const content = editingContent.trim();
    if (!content || !editingDate) return;

    await updateNoteMutation.mutateAsync({
      noteId,
      note: {
        content,
        noteDate: editingDate,
      },
    });
  };

  const handleDelete = async (noteId: number) => {
    await deleteNoteMutation.mutateAsync(noteId);
  };

  const handleScrollTop = () => {
    listRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCalendarSelect = (date: Date) => {
    setSelectedDate(toIsoDate(date));
    setIsCalendarOpen(false);
  };

  const focusComposer = () => {
    composerInputRef.current?.focus();
  };

  return (
    <>
      <div className="dashboard-layout">
        <DashboardSidebar />
        <div className="dashboard-main">
          <div className="container py-6">
            <div className="flow-mode-wrap">
              <section className="flow-mode-board">
                <header className="flow-mode-hero">
                  <div className="flow-mode-hero__eyebrow">Режим Flow</div>
                  <div className="flow-mode-hero__heading">
                    <h1 className="flow-mode-hero__title">Фокус на {formatSelectedDate(selectedDate)}</h1>
                    <p className="flow-mode-hero__subtitle">
                      Экран помогает быстро зафиксировать главное на день, увидеть прогресс и не потерять заметки.
                    </p>
                  </div>
                </header>

                <section className="flow-mode-summary" aria-label="Сводка дня">
                  <article className="flow-mode-card">
                    <div className="flow-mode-card__label">Фокус дня</div>
                    <div className="flow-mode-card__title">
                      {focusNote ? focusNote.content : 'Пока нет активной заметки'}
                    </div>
                    <p className="flow-mode-card__text">
                      {focusNote
                        ? focusNote.isCompleted
                          ? 'Все задачи на выбранную дату завершены.'
                          : 'Это первая незавершенная заметка на выбранную дату.'
                        : 'Добавьте первую заметку, чтобы зафиксировать главный фокус дня.'}
                    </p>
                  </article>

                  <article className="flow-mode-card">
                    <div className="flow-mode-card__label">Прогресс</div>
                    <div className="flow-mode-card__title">{progressValue}% выполнено</div>
                    <Progress value={progressValue} color="brand" className="flow-mode-card__progress" />
                    <p className="flow-mode-card__text">
                      Выполнено {completedCount} из {notes.length || 0} заметок.
                    </p>
                  </article>

                  <article className="flow-mode-card">
                    <div className="flow-mode-card__label">Сводка</div>
                    <div className="flow-mode-card__metrics">
                      <span className="flow-mode-card__metric">
                        <strong>{pendingNotes.length}</strong>
                        <span>в работе</span>
                      </span>
                      <span className="flow-mode-card__metric">
                        <strong>{completedCount}</strong>
                        <span>готово</span>
                      </span>
                    </div>
                    <p className="flow-mode-card__text">
                      {notes.length === 0
                        ? 'На выбранную дату заметок пока нет.'
                        : pendingNotes.length === 0
                          ? 'Отлично: все заметки на выбранную дату закрыты.'
                          : 'Продолжайте с ближайшей незавершенной заметки.'}
                    </p>
                  </article>
                </section>

                <header className="flow-mode-composer">
                  <span className="flow-mode-avatar" />
                  <input
                    ref={composerInputRef}
                    type="text"
                    className="flow-mode-input"
                    placeholder="Опишите фокус дня или короткую задачу..."
                    value={draftContent}
                    onChange={(event) => setDraftContent(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        void handleCreate();
                      }
                    }}
                  />
                  <div className="flow-mode-actions">
                    <div ref={calendarWrapRef} className="flow-mode-calendar-wrap">
                      <button
                        type="button"
                        className="flow-mode-icon-btn"
                        aria-label="Выбрать дату"
                        onClick={() => setIsCalendarOpen((prev) => !prev)}
                      >
                        <CalendarIcon className="h-4 w-4" />
                      </button>
                      {isCalendarOpen ? (
                        <div className="flow-mode-calendar-popover">
                          <Calendar
                            size="compact"
                            showTimeBlock={false}
                            value={selectedDateObject}
                            onDateSelect={handleCalendarSelect}
                          />
                        </div>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="flow-mode-icon-btn"
                      aria-label="Создать заметку"
                      disabled={!draftContent.trim() || isMutating}
                      onClick={() => void handleCreate()}
                    >
                      <PlusIcon className="h-4 w-4" />
                    </button>
                  </div>
                </header>

                <div className="flow-mode-subhead">
                  <span className="flow-mode-date-label">Заметки на {formatSelectedDate(selectedDate)}</span>
                  <span className="flow-mode-count">{notes.length}</span>
                </div>

                <div ref={listRef} className="flow-mode-list">
                  {notesQuery.isLoading ? (
                    <div className="flow-mode-empty">Загрузка заметок...</div>
                  ) : notesQuery.isError ? (
                    <div className="flow-mode-empty">Не удалось загрузить заметки.</div>
                  ) : notes.length === 0 ? (
                    <EmptyState
                      title="На выбранную дату заметок пока нет"
                      description="Добавьте первую заметку, чтобы заполнить фокус дня и увидеть прогресс."
                      action={
                        <Button type="button" size="sm" onClick={focusComposer}>
                          Добавить заметку
                        </Button>
                      }
                      className="flow-mode-empty-state"
                    />
                  ) : (
                    notes.map((note) => {
                      const isEditing = editingNoteId === note.id;

                      return (
                        <article key={note.id} className={cn('flow-mode-row', note.isCompleted && 'is-completed')}>
                          <button
                            type="button"
                            className={cn('flow-mode-state-dot', note.isCompleted && 'is-completed')}
                            aria-label="Переключить статус"
                            onClick={() =>
                              void toggleNoteMutation.mutateAsync({
                                noteId: note.id,
                                isCompleted: !note.isCompleted,
                              })
                            }
                          />
                          {isEditing ? (
                            <div className="flow-mode-editor">
                              <input
                                type="text"
                                className="flow-mode-edit-input"
                                value={editingContent}
                                onChange={(event) => setEditingContent(event.target.value)}
                              />
                              <input
                                type="date"
                                className="flow-mode-edit-date"
                                value={editingDate}
                                onChange={(event) => setEditingDate(event.target.value)}
                              />
                              <button
                                type="button"
                                className="flow-mode-text-btn"
                                disabled={!editingContent.trim() || !editingDate || isMutating}
                                onClick={() => void handleSaveEdit(note.id)}
                              >
                                Сохранить
                              </button>
                              <button type="button" className="flow-mode-text-btn" onClick={cancelEditing}>
                                Отмена
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flow-mode-row-content">
                                <p className="flow-mode-row-text">{note.content}</p>
                                <span className="flow-mode-row-meta">
                                  {formatTimestamp(note.updatedAt)}{note.isCompleted ? ' • выполнено' : ''}
                                </span>
                              </div>
                              <div className="flow-mode-row-actions">
                                <button
                                  type="button"
                                  className="flow-mode-icon-btn"
                                  aria-label="Редактировать заметку"
                                  onClick={() => startEditing(note)}
                                >
                                  <EditIcon className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  className="flow-mode-icon-btn"
                                  aria-label="Удалить заметку"
                                  onClick={() => void handleDelete(note.id)}
                                >
                                  <DeleteIcon className="h-4 w-4" />
                                </button>
                              </div>
                            </>
                          )}
                        </article>
                      );
                    })
                  )}
                </div>

                <button type="button" className="flow-mode-scroll-btn" aria-label="Наверх" onClick={handleScrollTop}>
                  <ChevronDownIcon className="h-4 w-4 -rotate-180" />
                </button>
              </section>
            </div>
          </div>
        </div>
      </div>
      <DashboardBottomNav />
    </>
  );
}
