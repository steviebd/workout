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
  gradientTitle?: boolean
}

export function PageLayout({
  title,
  subtitle,
  action,
  children,
  className,
  extraPadding = false,
  gradientTitle = false
}: PageLayoutProps) {
  return (
    <main 
      className={cn(
        "relative mx-auto w-full max-w-full sm:max-w-lg px-4 py-8 pb-24 min-h-[calc(100vh-3.5rem-4rem)] flex flex-col",
        extraPadding && "sm:pb-32 pb-28",
        className
      )}
    >
      <div 
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute top-1/4 -left-32 h-48 w-48 rounded-full bg-primary/3 blur-2xl" />
      </div>

      <header className="relative flex-shrink-0 mb-8">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 
              className={cn(
                "text-[28px] font-bold tracking-tight leading-tight",
                gradientTitle 
                  ? "bg-gradient-to-r from-foreground via-foreground/90 to-primary bg-clip-text text-transparent"
                  : "text-foreground"
              )}
            >
              {title}
            </h1>
            {subtitle ? <p className="text-sm text-muted-foreground/80 leading-relaxed max-w-[280px]">
                {subtitle}
                        </p> : null}
          </div>
          {action ? <div className="flex-shrink-0 pt-1">
              {action}
                    </div> : null}
        </div>
        <div className="mt-6 h-px bg-gradient-to-r from-border via-border/50 to-transparent" />
      </header>

      <div className="relative flex-1 overflow-auto">
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
