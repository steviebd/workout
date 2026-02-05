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
    <main className={cn("mx-auto max-w-lg px-4 py-6 pb-24", className)}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle ? <p className="text-muted-foreground">{subtitle}</p> : null}
        </div>
        {action ?? null}
      </div>
      {children}
    </main>
  )
}
