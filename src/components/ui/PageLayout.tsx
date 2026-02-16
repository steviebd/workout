import * as React from 'react'
import { cn } from '~/lib/cn'

interface PageLayoutProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function PageLayout({
  title,
  subtitle,
  action,
  children,
  className
}: PageLayoutProps) {
  return (
    <main className={cn("mx-auto w-full max-w-full sm:max-w-lg px-4 py-6 pb-24 min-h-[calc(100vh-3.5rem-4rem)] flex flex-col", className)}>
      <div className="flex-shrink-0 flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle ? <p className="text-muted-foreground">{subtitle}</p> : null}
        </div>
        {action ?? null}
      </div>
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </main>
  )
}
