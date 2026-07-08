import type { ChangeEvent } from 'react';

import { Button, IconButton, Input, FilterIcon, SearchIcon, PlusIcon } from '@/shared/ui';

export type ProjectToolbarProps = {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onCreate?: () => void;
  onFilter?: () => void;
  placeholder?: string;
};

export function ProjectToolbar({
  searchValue = '',
  onSearchChange,
  onCreate,
  onFilter,
  placeholder = 'Поиск проекта',
}: ProjectToolbarProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onSearchChange?.(event.target.value);
  };

  return (
    <div className="surface surface--sm flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 flex-1">
        <div className="w-full max-w-[320px]">
          <Input
            value={searchValue}
            onChange={handleChange}
            placeholder={placeholder}
            rightSlot={<SearchIcon className="h-4 w-4" />}
          />
        </div>
        <IconButton type="button" variant="outlined" onClick={onFilter} aria-label="Фильтры">
          <FilterIcon className="h-4 w-4" />
        </IconButton>
      </div>
      <Button type="button" onClick={onCreate}>
        Создать проект
        <PlusIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}
