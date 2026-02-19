import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { Skeleton } from './Skeleton'
import { cn } from '~/lib/cn'

interface PageLayoutProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  extraPadding?: boolean
  size?: 'default' | 'compact'
}

export function PageLayout({
  title,
  subtitle,
  action,
  children,
  className,
  extraPadding = false,
  size = 'default',
}: PageLayoutProps) {
  return (
    <main 
      className={cn(
        "mx-auto w-full max-w-lg px-5 py-8 pb-24 min-h-[calc(100vh-3.5rem-4rem)]",
        extraPadding && "sm:pb-32 pb-28",
        className
      )}
    >
      <header className={cn("mb-6", size === 'compact' && "mb-4")}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {title}
            </h1>
            {subtitle ? (
              <p className="text-sm text-muted-foreground mt-1">
                {subtitle}
              </p>
            ) : null}
          </div>
          {action ? (
            <div className="flex-shrink-0 pt-1">
              {action}
            </div>
          ) : null}
        </div>
        <div className={cn("mt-4 h-px bg-border", size === 'compact' && "mt-3")} />
      </header>

      <div className="flex-1">
        {children}
      </div>
    </main>
  )
}

interface PageLoadingProps {
  message?: string
  variant?: 'spinner' | 'skeleton'
  className?: string
}

export function PageLoading({ message = 'Loading...', variant = 'spinner', className }: PageLoadingProps) {
  if (variant === 'skeleton') {
    return (
      <div className={cn("space-y-4 animate-pulse", className)}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-20" />
        </div>
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col items-center justify-center py-12", className)}>
      <Loader2 className="animate-spin text-primary mb-4" size={32} />
      <p className="text-muted-foreground">{message}</p>
    </div>
  )
}
