import * as React from 'react'

import { cn } from '~/lib/cn'

function Card({ className, variant = 'surface', overflow = 'hidden', interactive = false, ...props }: React.ComponentProps<'div'> & { variant?: 'surface' | 'elevated' | 'tinted' | 'glass'; overflow?: 'visible' | 'hidden' | 'auto' | 'clip' | 'scroll'; interactive?: boolean }) {
  const variantStyles = {
    surface: [
      'bg-card',
      'border border-border/50',
      'shadow-[0_1px_2px_0_rgb(0_0_0/0.03),0_4px_12px_-2px_rgb(0_0_0/0.06)]',
      'dark:shadow-[0_1px_2px_0_rgb(0_0_0/0.15),0_4px_16px_-2px_rgb(0_0_0/0.25)]',
      'dark:border-border/40',
    ].join(' '),
    elevated: [
      'bg-card border-gradient',
      'border border-transparent',
      'shadow-[0_1px_3px_0_rgb(0_0_0/0.04),0_8px_24px_-4px_rgb(0_0_0/0.08),0_20px_48px_-12px_rgb(0_0_0/0.06)]',
      'dark:shadow-[0_1px_3px_0_rgb(0_0_0/0.2),0_8px_28px_-4px_rgb(0_0_0/0.35),0_24px_56px_-12px_rgb(0_0_0/0.25)]',
      'ring-1 ring-border/30 dark:ring-border/20',
    ].join(' '),
    tinted: [
      'bg-gradient-to-br from-primary/12 via-primary/6 to-accent/4',
      'border border-primary/25 dark:border-primary/20',
      'shadow-[0_1px_2px_0_rgb(0_0_0/0.03),0_4px_16px_-4px_var(--tw-shadow-color)]',
      'shadow-primary/10 dark:shadow-primary/15',
      'ring-1 ring-inset ring-primary/10',
    ].join(' '),
    glass: [
      'glass',
      'border-0',
      'shadow-[0_4px_24px_-4px_rgb(0_0_0/0.08),0_12px_32px_-8px_rgb(0_0_0/0.06)]',
      'dark:shadow-[0_4px_24px_-4px_rgb(0_0_0/0.3),0_12px_40px_-8px_rgb(0_0_0/0.35)]',
      'ring-1 ring-white/20 dark:ring-white/10',
    ].join(' '),
  }

  const interactiveStyles = interactive
    ? 'hover-lift cursor-pointer hover:shadow-[0_4px_16px_-2px_rgb(0_0_0/0.1),0_20px_40px_-8px_rgb(0_0_0/0.12)] dark:hover:shadow-[0_4px_20px_-2px_rgb(0_0_0/0.35),0_24px_48px_-8px_rgb(0_0_0/0.4)]'
    : ''

  return (
    <div
      data-slot="card"
      className={cn(
        'flex flex-col rounded-xl transition-all duration-200',
        variantStyles[variant],
        interactiveStyles,
        className,
      )}
      style={{ overflow }}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        '@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-5 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-5',
        className,
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-title"
      className={cn('leading-tight font-semibold text-base', className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={cn('text-muted-foreground text-sm leading-relaxed', className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        'col-start-2 row-span-2 row-start-1 self-start justify-self-end',
        className,
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-content"
        className={cn('px-5 overflow-hidden', className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
        className={cn('flex items-center px-5 [.border-t]:pt-5', className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
