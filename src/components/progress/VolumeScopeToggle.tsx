'use client';

import { Dumbbell, Layers } from 'lucide-react';
import { cn } from '@/lib/cn';

export type VolumeScope = 'all' | 'selected';

interface VolumeScopeToggleProps {
  value: VolumeScope;
  onChange: (value: VolumeScope) => void;
  disabled?: boolean;
}

export function VolumeScopeToggle({ value, onChange, disabled }: VolumeScopeToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange('all')}
        disabled={disabled}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
          value === 'all'
            ? 'bg-accent text-accent-foreground'
            : 'bg-secondary text-muted-foreground hover:bg-secondary/80',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <Layers className="h-3.5 w-3.5" />
        All
      </button>
      <button
        onClick={() => onChange('selected')}
        disabled={disabled}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
          value === 'selected'
            ? 'bg-accent text-accent-foreground'
            : 'bg-secondary text-muted-foreground hover:bg-secondary/80',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <Dumbbell className="h-3.5 w-3.5" />
        Selected
      </button>
    </div>
  );
}
