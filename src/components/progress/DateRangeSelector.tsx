'use client';

import { Calendar } from 'lucide-react';
import { cn } from '@/lib/cn';

export type DateRange = '1m' | '3m' | '6m' | '1y' | 'all';

interface DateRangeSelectorProps {
  value: DateRange;
  onChange: (value: DateRange) => void;
}

export function DateRangeSelector({ value, onChange }: DateRangeSelectorProps) {
  const options: Array<{ value: DateRange; label: string }> = [
    { value: '1m', label: '1M' },
    { value: '3m', label: '3M' },
    { value: '6m', label: '6M' },
    { value: '1y', label: '1Y' },
    { value: 'all', label: 'All' },
  ];

  return (
    <div className="flex items-center gap-2">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <div className="flex gap-1 bg-secondary rounded-lg p-1">
        {options.map(option => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-md transition-colors',
              value === option.value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
