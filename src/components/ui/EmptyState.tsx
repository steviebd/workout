import { Plus } from 'lucide-react';
import { Button } from './Button';
import type { ComponentType, ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ComponentType<{ readonly size?: number; readonly className?: string }>;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className = '',
}: EmptyStateProps): ReactNode {
  const IconComponent = icon;

  return (
    <div className={`text-center py-12 animate-in fade-in slide-in-from-bottom-4 duration-500 ${className}`}>
      <div className="flex items-center justify-center mb-6">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl" />
          {IconComponent ? (
            <IconComponent size={56} className="relative text-primary/80" />
          ) : (
            <svg
              className="relative text-primary/80"
              width={56}
              height={56}
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
          )}
        </div>
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2 tracking-tight">{title}</h3>
      {description ? (
        <p className="text-muted-foreground mb-6 max-w-sm mx-auto text-sm leading-relaxed text-muted-foreground/80">
          {description}
        </p>
      ) : null}
      {(actionLabel && onAction) || (secondaryActionLabel && onSecondaryAction) ? (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {actionLabel && onAction ? (
            <Button onClick={onAction} size="lg">
              <Plus size={18} />
              {actionLabel}
            </Button>
          ) : null}
          {secondaryActionLabel && onSecondaryAction ? (
            <Button onClick={onSecondaryAction} variant="outline" size="lg">
              {secondaryActionLabel}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function EmptyTemplates({
  searchActive,
  onCreate,
  onBrowse,
}: {
  readonly searchActive?: boolean;
  readonly onCreate?: () => void;
  readonly onBrowse?: () => void;
}): ReactNode {
  const FileTextIcon = ({ size = 56, className = '' }: { readonly size?: number; readonly className?: string }): ReactNode => (
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

  return (
    <EmptyState
      icon={FileTextIcon}
      title="No Templates Yet"
      description={
        searchActive
          ? "We couldn't find any templates matching your search. Try different keywords or clear your search."
          : "Create your first workout template to organize your exercises and streamline your training sessions."
      }
      actionLabel={!searchActive ? 'Create Template' : undefined}
      onAction={!searchActive ? onCreate : undefined}
      secondaryActionLabel={searchActive ? 'Clear Search' : undefined}
      onSecondaryAction={searchActive ? onBrowse : undefined}
    />
  );
}

export function EmptyExercises({
  searchActive,
  onCreate,
  onBrowse,
}: {
  readonly searchActive?: boolean;
  readonly onCreate?: () => void;
  readonly onBrowse?: () => void;
}): ReactNode {
  const DumbbellIcon = ({ size = 56, className = '' }: { readonly size?: number; readonly className?: string }): ReactNode => (
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

  return (
    <EmptyState
      icon={DumbbellIcon}
      title="No Exercises Yet"
      description={
        searchActive
          ? "No exercises found matching your search. Try different keywords or browse all exercises."
          : "Start building your exercise library by adding your first exercise. You can track strength, cardio, and flexibility exercises."
      }
      actionLabel={!searchActive ? 'Add Exercise' : undefined}
      onAction={!searchActive ? onCreate : undefined}
      secondaryActionLabel={searchActive ? 'View All' : undefined}
      onSecondaryAction={searchActive ? onBrowse : undefined}
    />
  );
}

export function EmptyWorkouts({
  onStart,
  onBrowseTemplates,
}: {
  readonly onStart?: () => void;
  readonly onBrowseTemplates?: () => void;
}): ReactNode {
  const ActivityIcon = ({ size = 56, className = '' }: { readonly size?: number; readonly className?: string }): ReactNode => (
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

  return (
    <EmptyState
      icon={ActivityIcon}
      title="Ready to Train?"
      description="You haven't completed any workouts yet. Start your fitness journey by beginning your first workout or choosing a template."
      actionLabel="Start Workout"
      onAction={onStart}
      secondaryActionLabel="Browse Templates"
      onSecondaryAction={onBrowseTemplates}
    />
  );
}

export function EmptyExerciseHistory(): ReactNode {
  const CalendarIcon = ({ size = 56, className = '' }: { readonly size?: number; readonly className?: string }): ReactNode => (
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

  return (
    <EmptyState
      icon={CalendarIcon}
      title="No Workout History"
      description="Complete workouts with this exercise to track your progress over time and see your strength gains."
    />
  );
}


