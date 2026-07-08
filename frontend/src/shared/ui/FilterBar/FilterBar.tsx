import { type ChangeEvent, type ReactNode, useEffect, useRef } from 'react';

import { cn } from '@/shared/lib/cn';
import { FilterIcon, SearchIcon } from '@/shared/ui/icons';
import { IconButton } from '../Button';
import { Input } from '../Input';

export type FilterBarProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  filtersOpen: boolean;
  onFiltersOpenChange: (isOpen: boolean) => void;
  chips?: ReactNode;
  popover?: ReactNode;
  searchPlaceholder?: string;
  searchAriaLabel?: string;
  filterAriaLabel?: string;
  className?: string;
  searchClassName?: string;
  filterWrapClassName?: string;
  filterBarClassName?: string;
  chipsClassName?: string;
};

export function FilterBar({
  searchValue,
  onSearchChange,
  filtersOpen,
  onFiltersOpenChange,
  chips,
  popover,
  searchPlaceholder = 'Поиск',
  searchAriaLabel = 'Поиск',
  filterAriaLabel = 'Фильтры',
  className,
  searchClassName,
  filterWrapClassName,
  filterBarClassName,
  chipsClassName,
}: FilterBarProps) {
  const filterRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!filtersOpen) {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (filterRef.current?.contains(event.target as Node)) {
        return;
      }
      onFiltersOpenChange(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [filtersOpen, onFiltersOpenChange]);

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    onSearchChange(event.target.value);
  };

  return (
    <div className={cn('project-board__controls', className)}>
      <div className={cn('project-board__search', searchClassName)}>
        <Input
          aria-label={searchAriaLabel}
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={handleSearchChange}
          rightSlot={<SearchIcon className="h-4 w-4" />}
        />
      </div>

      <div className={cn('project-board__filter-wrap', filterWrapClassName)} ref={filterRef}>
        <div
          className={cn(
            'project-board__filter-bar',
            filtersOpen && 'project-board__filter-bar--active',
            filterBarClassName,
          )}
        >
          <IconButton
            type="button"
            variant="tonal"
            size="sm"
            className="project-board__filter"
            aria-label={filterAriaLabel}
            aria-expanded={filtersOpen}
            onClick={() => onFiltersOpenChange(!filtersOpen)}
          >
            <FilterIcon className="h-4 w-4" />
          </IconButton>
          <div className={cn('project-board__chips', chipsClassName)}>{chips}</div>
        </div>

        {filtersOpen ? popover : null}
      </div>
    </div>
  );
}

