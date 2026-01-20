import { Plus } from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';

interface EmptyStateProps {
  readonly icon?: ComponentType<{ readonly size?: number; readonly className?: string }>;
  readonly title: string;
  readonly description?: string;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
  readonly className?: string;
}

function Dumbbell({ size = 48, className = '' }: { readonly size?: number; readonly className?: string }): ReactNode {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6.5 6.5a2.121 2.121 0 1 0 4.242 0 2.121 2.121 0 1 0-4.242 0Z" />
      <path d="M15.5 6.5a2.121 2.121 0 1 0 4.242 0 2.121 2.121 0 1 0-4.242 0Z" />
      <path d="M5 12h14" />
    </svg>
  );
}

function FileText({ size = 48, className = '' }: { readonly size?: number; readonly className?: string }): ReactNode {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" x2="8" y1="13" y2="13" />
      <line x1="16" x2="8" y1="17" y2="17" />
      <line x1="10" x2="8" y1="9" y2="9" />
    </svg>
  );
}

function Calendar({ size = 48, className = '' }: { readonly size?: number; readonly className?: string }): ReactNode {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  );
}

function Activity({ size = 48, className = '' }: { readonly size?: number; readonly className?: string }): ReactNode {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps): ReactNode {
  const IconComponent = icon ?? Dumbbell;

  return (
    <div className={`text-center py-12 ${className}`}>
      <div className="flex items-center justify-center mb-4">
        <IconComponent size={48} className="text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      {description ? <p className="text-gray-600 mb-4 max-w-sm mx-auto">{description}</p> : null}
      {actionLabel && onAction ? <button
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          onClick={onAction}
      >
          <Plus size={18} />
          {actionLabel}
                                 </button> : null}
    </div>
  );
}

export function EmptyExercises({ searchActive, onCreate }: { readonly searchActive?: boolean; readonly onCreate?: () => void }): ReactNode {
  return (
    <EmptyState
      icon={Dumbbell}
      title="No exercises found"
      description={
        searchActive
          ? 'Try adjusting your filters'
          : 'Get started by creating your first exercise'
      }
      actionLabel={!searchActive ? 'New Exercise' : undefined}
      onAction={!searchActive ? onCreate : undefined}
    />
  );
}

export function EmptyTemplates({ searchActive, onCreate }: { readonly searchActive?: boolean; readonly onCreate?: () => void }): ReactNode {
  return (
    <EmptyState
      icon={FileText}
      title="No templates found"
      description={
        searchActive
          ? 'Try adjusting your search'
          : 'Create your first workout template to get started'
      }
      actionLabel={!searchActive ? 'New Template' : undefined}
      onAction={!searchActive ? onCreate : undefined}
    />
  );
}

export function EmptyWorkouts({ onStart }: { readonly onStart?: () => void } = {}): ReactNode {
  return (
    <EmptyState
      icon={Activity}
      title="No workouts found"
      description="Complete your first workout to see history here"
      actionLabel="Start Workout"
      onAction={onStart}
    />
  );
}

export function EmptyExerciseHistory(): ReactNode {
  return (
    <EmptyState
      icon={Calendar}
      title="No workout history"
      description="Complete workouts with this exercise to see your progress here"
    />
  );
}
