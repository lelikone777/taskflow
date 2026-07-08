import { useMemo, useState } from 'react';

import { taskPriorityOptions, taskStatusOptions } from '@/entities/task';
import type { TaskPriority, TaskStatus } from '@/shared/api';

export function useTaskBoardFilters() {
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | ''>('');
  const [tagFilters, setTagFilters] = useState<number[]>([]);
  const [dueFrom, setDueFrom] = useState('');
  const [dueTo, setDueTo] = useState('');

  const activePriorityLabel = useMemo(
    () => taskPriorityOptions.find((item) => item.value === priorityFilter)?.label,
    [priorityFilter],
  );
  const activeStatusLabel = useMemo(
    () => taskStatusOptions.find((item) => item.value === statusFilter)?.label,
    [statusFilter],
  );

  const toggleTagFilter = (tagId: number) => {
    setTagFilters((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    );
  };

  const removeTagFilter = (tagId: number) => {
    setTagFilters((prev) => prev.filter((id) => id !== tagId));
  };

  return {
    search,
    setSearch,
    filtersOpen,
    setFiltersOpen,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    tagFilters,
    setTagFilters,
    dueFrom,
    setDueFrom,
    dueTo,
    setDueTo,
    activePriorityLabel,
    activeStatusLabel,
    toggleTagFilter,
    removeTagFilter,
  };
}
