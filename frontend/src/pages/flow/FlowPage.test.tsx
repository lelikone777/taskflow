import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FlowPage } from '@/pages/flow/FlowPage';

const fetchFlowNotesByDateMock = vi.fn();

vi.mock('@/shared/api', () => ({
  createFlowNote: vi.fn(),
  deleteFlowNote: vi.fn(),
  fetchFlowNotesByDate: (...args: unknown[]) => fetchFlowNotesByDateMock(...args),
  queryKeys: {
    flow: {
      all: () => ['flowNotes'],
      byDate: (noteDate = '') => ['flowNotesByDate', noteDate],
    },
  },
  updateFlowNote: vi.fn(),
  updateFlowNoteStatus: vi.fn(),
}));

vi.mock('@/widgets/dashboard', () => ({
  DashboardSidebar: () => null,
  DashboardBottomNav: () => null,
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

function renderFlowPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <FlowPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('FlowPage', () => {
  beforeEach(() => {
    fetchFlowNotesByDateMock.mockReset();
  });

  it('shows a structured empty state instead of a placeholder', async () => {
    fetchFlowNotesByDateMock.mockResolvedValue([]);

    renderFlowPage();

    expect(screen.getByText('Режим Flow')).toBeInTheDocument();

    expect(await screen.findByText('На выбранную дату заметок пока нет')).toBeInTheDocument();
    expect(screen.getByText('Фокус дня')).toBeInTheDocument();
    expect(screen.getByText('Прогресс')).toBeInTheDocument();
  });

  it('renders progress summary and focus note when data exists', async () => {
    fetchFlowNotesByDateMock.mockResolvedValue([
      {
        id: 1,
        content: 'Подготовить сводку по проекту',
        noteDate: '2026-06-22',
        isCompleted: false,
        createdAt: '2026-06-22T08:00:00Z',
        updatedAt: '2026-06-22T09:00:00Z',
      },
      {
        id: 2,
        content: 'Обновить чек-лист релиза',
        noteDate: '2026-06-22',
        isCompleted: true,
        createdAt: '2026-06-22T07:00:00Z',
        updatedAt: '2026-06-22T10:00:00Z',
      },
    ]);

    renderFlowPage();

    await waitFor(() => {
      expect(fetchFlowNotesByDateMock).toHaveBeenCalledTimes(1);
    });

    expect((await screen.findAllByText('Подготовить сводку по проекту')).length).toBeGreaterThan(0);
    expect(screen.getByText('50% выполнено')).toBeInTheDocument();
    expect(screen.getByText('Продолжайте с ближайшей незавершенной заметки.')).toBeInTheDocument();
  });
});
