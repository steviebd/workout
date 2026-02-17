import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'

import { cn } from '~/lib/cn'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 ease-out disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          'relative overflow-hidden bg-gradient-to-b from-primary to-primary/90 text-primary-foreground shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 hover:brightness-110 active:scale-[0.97] active:shadow-sm before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/0 before:via-white/20 before:to-white/0 before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-500 before:ease-out',
        cta: 'relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30 ring-1 ring-white/10 hover:shadow-xl hover:shadow-primary/40 hover:brightness-110 active:scale-[0.97] active:shadow-md before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/0 before:via-white/25 before:to-white/0 before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-500 before:ease-out',
        destructive:
          'relative overflow-hidden bg-gradient-to-b from-destructive to-destructive/90 text-white shadow-md shadow-destructive/25 hover:shadow-lg hover:shadow-destructive/30 hover:brightness-110 focus-visible:ring-destructive/50 dark:from-destructive/80 dark:to-destructive/70 active:scale-[0.97] active:shadow-sm',
        outline:
          'border border-input bg-background/80 backdrop-blur-sm shadow-sm hover:bg-accent/80 hover:text-accent-foreground hover:border-accent-foreground/20 hover:shadow-md dark:bg-background/50 dark:border-white/10 dark:hover:bg-white/10 dark:hover:border-white/20 active:scale-[0.98]',
        secondary:
          'bg-secondary/90 text-secondary-foreground shadow-sm hover:bg-secondary hover:shadow-md active:scale-[0.98] active:shadow-sm',
        ghost:
          'hover:bg-accent/80 hover:text-accent-foreground dark:hover:bg-white/10 active:scale-[0.98] active:bg-accent',
        link: 'text-primary underline-offset-4 hover:underline decoration-primary/50 hover:decoration-primary',
      },
      size: {
        default: 'h-10 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5 text-xs',
        lg: 'h-11 rounded-lg px-6 has-[>svg]:px-4 text-base',
        icon: 'size-10 active:scale-[0.97]',
        'icon-sm': 'size-9 active:scale-[0.97]',
        'icon-lg': 'size-12 active:scale-[0.97]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

type ButtonVariants = Parameters<typeof buttonVariants>[0];

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> & {
  asChild?: boolean
} & ButtonVariants) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
