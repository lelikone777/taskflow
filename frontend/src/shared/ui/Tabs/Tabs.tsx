import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

export type TabItem = {
  value: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
};

type TabsOrientation = 'horizontal' | 'vertical';
type TabsVariant = 'underline';
type TabsSize = 'sm' | 'md';

export type TabsProps = {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  orientation?: TabsOrientation;
  variant?: TabsVariant;
  size?: TabsSize;
  className?: string;
};

export function Tabs({
  items,
  value,
  onChange,
  orientation = 'horizontal',
  variant = 'underline',
  size = 'md',
  className,
}: TabsProps) {
  return (
    <div
      className={cn('tabs', orientation === 'vertical' && 'tabs--vertical', `tabs--${variant}`, className)}
      role="tablist"
      aria-orientation={orientation}
    >
      {items.map((item) => {
        const isActive = item.value === value;
        return (
          <TabTrigger
            key={item.value}
            active={isActive}
            disabled={item.disabled}
            size={size}
            onClick={() => onChange(item.value)}
          >
            {item.icon ? <span className="tab__icon">{item.icon}</span> : null}
            {item.label}
          </TabTrigger>
        );
      })}
    </div>
  );
}

type TabTriggerProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  size?: TabsSize;
};

function TabTrigger({ active, size = 'md', className, ...props }: TabTriggerProps) {
  return (
    <button
      className={cn('tab', `tab--${size}`, className)}
      type="button"
      role="tab"
      aria-selected={active}
      data-active={active}
      {...props}
    />
  );
}
