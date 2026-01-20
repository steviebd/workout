import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

interface LoadingSpinnerProps {
  readonly size?: 'sm' | 'md' | 'lg';
  readonly className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps): ReactNode {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-600`} />
    </div>
  );
}

export function LoadingPage(): ReactNode {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

export function LoadingCard(): ReactNode {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
      <div className="h-3 bg-gray-200 rounded w-2/3 mb-2" />
      <div className="h-3 bg-gray-200 rounded w-1/2" />
    </div>
  );
}

export function SkeletonCard(): ReactNode {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="h-5 bg-gray-200 rounded w-1/2" />
        <div className="h-5 bg-gray-200 rounded w-16" />
      </div>
      <div className="h-3 bg-gray-200 rounded w-full mb-4" />
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="h-3 bg-gray-200 rounded w-20" />
        <div className="h-3 bg-gray-200 rounded w-16" />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 3 }: { readonly count?: number }): ReactNode {
  return (
    <div className="grid grid-cols-1 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
