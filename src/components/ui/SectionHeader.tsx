import * as React from 'react'
import { cn } from '~/lib/cn'

interface SectionHeaderProps {
  title: string
  action?: React.ReactNode
  className?: string
}

export function SectionHeader({ title, action, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between mb-5", className)}>
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}
