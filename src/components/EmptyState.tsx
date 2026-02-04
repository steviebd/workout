import { ComponentType, ReactNode } from 'react';
import { Button } from './ui/Button';

interface EmptyStateProps {
  icon?: ComponentType<{ readonly size?: number; readonly className?: string }>;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps): ReactNode {
  const IconComponent = icon;

  return (
    <div className={`text-center py-12 ${className}`}>
      <div className="flex items-center justify-center mb-6">
        {IconComponent ? (
          <IconComponent size={56} className="text-muted-foreground/50" />
        ) : (
          <svg
            width={56}
            height={56}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-muted-foreground/50"
          >
            <path d="M6.5 6.5a2.121 2.121 0 1 0 4.242 0 2.121 2.121 0 1 0-4.242 0Z" />
            <path d="M15.5 6.5a2.121 2.121 0 1 0 4.242 0 2.121 2.121 0 1 0-4.242 0Z" />
            <path d="M5 12h14" />
          </svg>
        )}
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      {description ? (
        <p className="text-muted-foreground mb-6 max-w-sm mx-auto text-sm">{description}</p>
      ) : null}
      {actionLabel && onAction ? (
        <Button onClick={onAction} size="lg">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

export function EmptyExercises({ onCreate }: { readonly onCreate?: () => void }): ReactNode {
  return (
    <EmptyState
      title="No Exercises Yet"
      description="Start building your exercise library by adding your first exercise."
      actionLabel="Add Exercise"
      onAction={onCreate}
    />
  );
}

export function EmptyTemplates({ onCreate }: { readonly onCreate?: () => void }): ReactNode {
  return (
    <EmptyState
      title="No Templates Yet"
      description="Create your first workout template to organize your exercises."
      actionLabel="Create Template"
      onAction={onCreate}
    />
  );
}

export function EmptyWorkouts({ onStart }: { readonly onStart?: () => void }): ReactNode {
  return (
    <EmptyState
      title="Ready to Train?"
      description="You haven't completed any workouts yet. Start your fitness journey by beginning your first workout."
      actionLabel="Start Workout"
      onAction={onStart}
    />
  );
}
