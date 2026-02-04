import { RefreshCw, ArrowLeft, Home, AlertCircle, Wifi, FileQuestion, Lock } from 'lucide-react';
import { Button } from './Button';
import type { ReactNode } from 'react';

interface ErrorStateProps {
  title: string;
  description?: string;
  errorCode?: string;
  onRetry?: () => void;
  onGoBack?: () => void;
  onGoHome?: () => void;
  variant?: 'default' | 'network' | 'notFound' | 'forbidden' | 'server';
  className?: string;
}

const errorIcons = {
  default: AlertCircle,
  network: Wifi,
  notFound: FileQuestion,
  forbidden: Lock,
  server: AlertCircle,
};

export function ErrorState({
  title,
  description,
  errorCode,
  onRetry,
  onGoBack,
  onGoHome,
  variant = 'default',
  className = '',
}: ErrorStateProps): ReactNode {
  const IconComponent = errorIcons[variant];

  return (
    <div className={`text-center py-12 ${className}`}>
      <div className="flex items-center justify-center mb-6">
        <div className="relative">
          <div className="absolute inset-0 bg-destructive/10 rounded-full blur-xl" />
          <IconComponent
            size={56}
            className="relative text-destructive"
          />
        </div>
      </div>

      {errorCode ? <div className="inline-flex items-center px-3 py-1 rounded-full bg-destructive/10 text-destructive text-sm font-medium mb-4">
          {errorCode}
                   </div> : null}

      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>

      {description ? <p className="text-muted-foreground mb-6 max-w-sm mx-auto text-sm leading-relaxed">
          {description}
                     </p> : null}

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        {onRetry ? <Button onClick={onRetry} size="lg">
            <RefreshCw size={18} />
            Try Again
                   </Button> : null}
        {onGoBack ? <Button onClick={onGoBack} variant="outline" size="lg">
            <ArrowLeft size={18} />
            Go Back
                    </Button> : null}
        {onGoHome ? <Button onClick={onGoHome} variant="outline" size="lg">
            <Home size={18} />
            Go Home
                    </Button> : null}
      </div>
    </div>
  );
}

export function NetworkError({
  onRetry,
  onGoBack,
}: {
  readonly onRetry?: () => void;
  readonly onGoBack?: () => void;
}): ReactNode {
  return (
    <ErrorState
      variant="network"
      title="Connection Problem"
      description="We couldn't connect to the server. Please check your internet connection and try again."
      onRetry={onRetry}
      onGoBack={onGoBack}
    />
  );
}

export function NotFoundError({
  onRetry,
  onGoBack,
  onGoHome,
}: {
  readonly onRetry?: () => void;
  readonly onGoBack?: () => void;
  readonly onGoHome?: () => void;
}): ReactNode {
  return (
    <ErrorState
      variant="notFound"
      title="Page Not Found"
      description="The page you're looking for doesn't exist or has been moved. Let's get you back on track."
      errorCode="404"
      onRetry={onRetry}
      onGoBack={onGoBack}
      onGoHome={onGoHome}
    />
  );
}

export function ForbiddenError({
  onRetry,
  onGoBack,
  onGoHome,
}: {
  readonly onRetry?: () => void;
  readonly onGoBack?: () => void;
  readonly onGoHome?: () => void;
}): ReactNode {
  return (
    <ErrorState
      variant="forbidden"
      title="Access Denied"
      description="You don't have permission to access this resource. If you believe this is an error, please contact support."
      errorCode="403"
      onRetry={onRetry}
      onGoBack={onGoBack}
      onGoHome={onGoHome}
    />
  );
}

export function ServerError({
  onRetry,
  onGoBack,
}: {
  readonly onRetry?: () => void;
  readonly onGoBack?: () => void;
}): ReactNode {
  return (
    <ErrorState
      variant="server"
      title="Something Went Wrong"
      description="An unexpected error occurred on our end. Our team has been notified and we're working to fix it. Please try again later."
      errorCode="500"
      onRetry={onRetry}
      onGoBack={onGoBack}
    />
  );
}

export function InlineError({
  message,
  onRetry,
  onDismiss,
}: {
  readonly message: string;
  readonly onRetry?: () => void;
  readonly onDismiss?: () => void;
}): ReactNode {
  return (
    <div className="flex items-center justify-between gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
      <div className="flex items-center gap-3">
        <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
        <p className="text-sm text-destructive">{message}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {onRetry ? <Button variant="ghost" size="sm" onClick={onRetry}>
            <RefreshCw size={14} />
            Retry
                   </Button> : null}
        {onDismiss ? <Button variant="ghost" size="sm" onClick={onDismiss}>
            Dismiss
                     </Button> : null}
      </div>
    </div>
  );
}

export function FormError({
  message,
}: {
  readonly message?: string;
}): ReactNode {
  if (!message) return null;

  return (
    <p className="text-sm text-destructive mt-1.5 flex items-center gap-1.5">
      <AlertCircle size={14} />
      {message}
    </p>
  );
}
