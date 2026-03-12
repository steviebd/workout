import * as React from 'react'

import { cn } from '~/lib/cn'

function Badge({ className, variant = 'default', ...props }: React.ComponentProps<'div'> & {
  variant?: 'default' | 'secondary' | 'success' | 'warning'
}) {
  return (
    <div
      data-slot="badge"
      className={cn(
        'inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium',
        {
          'bg-primary/10 text-primary border border-primary/30': variant === 'default',
          'bg-secondary text-secondary-foreground': variant === 'secondary',
          'bg-success/10 text-success border border-success/30': variant === 'success',
          'bg-warning/10 text-warning border border-warning/30': variant === 'warning',
        },
        className,
      )}
      {...props}
    />
  )
}

export { Badge }
