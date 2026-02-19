import * as React from 'react'

import { cn } from '~/lib/cn'

function Badge({ className, variant = 'default', ...props }: React.ComponentProps<'div'> & {
  variant?: 'default' | 'secondary' | 'success' | 'warning'
}) {
  return (
    <div
      data-slot="badge"
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        {
          'bg-primary/10 text-primary border border-primary/20': variant === 'default',
          'bg-secondary text-secondary-foreground': variant === 'secondary',
          'bg-success/10 text-success border border-success/20': variant === 'success',
          'bg-warning/10 text-warning border border-warning/20': variant === 'warning',
        },
        className,
      )}
      {...props}
    />
  )
}

export { Badge }
