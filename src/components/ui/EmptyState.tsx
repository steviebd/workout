import { Button } from './Button';
import type { ReactNode } from 'react';
import { cn } from '~/lib/cn';

interface EmptyStateProps {
  icon?: (props: { readonly size?: number; readonly className?: string }) => ReactNode;
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
    <div className={cn("text-center py-12", className)}>
      <div className="flex items-center justify-center mb-6">
        <div className="rounded-2xl bg-muted/50 p-5">
          {IconComponent ? (
            <IconComponent size={44} className="text-muted-foreground/50" />
          ) : (
            <svg
              width={44}
              height={44}
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
      </div>
      <h3 className="text-[18px] font-semibold tracking-tight text-foreground mb-2">{title}</h3>
      {description ? (
        <p className="text-muted-foreground/90 mb-6 max-w-sm mx-auto text-[13px] leading-relaxed">{description}</p>
      ) : null}
      {actionLabel && onAction ? (
        <Button onClick={onAction} size="lg" variant="cta">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

const DumbbellIcon = ({ size = 44, className = '' }: { readonly size?: number; readonly className?: string }): ReactNode => (
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

const FileTextIcon = ({ size = 44, className = '' }: { readonly size?: number; readonly className?: string }): ReactNode => (
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

const ActivityIcon = ({ size = 44, className = '' }: { readonly size?: number; readonly className?: string }): ReactNode => (
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

const CalendarIcon = ({ size = 44, className = '' }: { readonly size?: number; readonly className?: string }): ReactNode => (
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
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

export function EmptyExercises({ onCreate }: { readonly onCreate?: () => void }): ReactNode {
  return (
    <EmptyState
      icon={DumbbellIcon}
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
      icon={FileTextIcon}
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
      icon={ActivityIcon}
      title="Ready to Train?"
      description="You haven't completed any workouts yet. Start your fitness journey by beginning your first workout."
      actionLabel="Start Workout"
      onAction={onStart}
    />
  );
}

export function EmptyExerciseHistory(): ReactNode {
  return (
    <EmptyState
      icon={CalendarIcon}
      title="No Workout History"
      description="Complete workouts with this exercise to track your progress over time and see your strength gains."
    />
  );
}
