import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

export function LoadingSpinner({ className = '' }: { readonly className?: string }): ReactNode {
  return <Loader2 className={`animate-spin ${className}`} />;
}

export function LoadingPage(): ReactNode {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingSpinner className="h-8 w-8 text-primary" />
    </div>
  );
}
