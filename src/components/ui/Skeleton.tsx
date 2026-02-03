import type { ReactNode } from 'react'
import { cn } from '~/lib/cn'

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  )
}

export { Skeleton }

export function SkeletonCard(): ReactNode {
  return (
    <div className="bg-card border border-border rounded-lg p-4 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-5 w-16" />
      </div>
      <Skeleton className="h-3 w-full mb-4" />
      <Skeleton className="h-3 w-2/3 mb-2" />
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <Skeleton className="h-3 w-20" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-6 rounded" />
          <Skeleton className="h-6 w-6 rounded" />
          <Skeleton className="h-6 w-6 rounded" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonList({ count = 3 }: { readonly count?: number }): ReactNode {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonButton(): ReactNode {
  return (
    <Skeleton className="h-10 w-24 rounded-lg" />
  );
}

export function SkeletonInput(): ReactNode {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
  );
}

export function SkeletonForm(): ReactNode {
  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-6 animate-pulse">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <div className="space-y-2">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Skeleton className="h-10 w-20 rounded-lg" />
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>
    </div>
  );
}

export function SkeletonExerciseCard(): ReactNode {
  return (
    <div className="bg-card border border-border rounded-lg p-4 animate-pulse">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-4 w-1/2 mb-2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between p-2 bg-secondary rounded">
          <Skeleton className="h-4 w-20" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-12 rounded" />
            <Skeleton className="h-6 w-12 rounded" />
            <Skeleton className="h-6 w-8 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonWorkoutCard(): ReactNode {
  return (
    <div className="bg-card border border-border rounded-lg p-4 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div>
          <Skeleton className="h-5 w-40 mb-2" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
      <div className="flex justify-between pt-3 mt-3 border-t border-border">
        <Skeleton className="h-3 w-16" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonTemplateCard(): ReactNode {
  return (
    <div className="bg-card border border-border rounded-lg p-4 animate-pulse">
      <div className="flex items-start justify-between mb-2">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="h-3 w-full mb-3" />
      <Skeleton className="h-3 w-2/3 mb-3" />
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="flex gap-1">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
