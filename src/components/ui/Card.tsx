import * as React from 'react'

import { cn } from '~/lib/cn'

function Card({ className, variant = 'surface', overflow = 'hidden', interactive = false, ...props }: React.ComponentProps<'div'> & { variant?: 'surface' | 'elevated' | 'tinted' | 'glass'; overflow?: 'visible' | 'hidden' | 'auto' | 'clip' | 'scroll'; interactive?: boolean }) {
  const variantStyles = {
    surface: 'bg-card border border-border shadow-sm',
    elevated: 'bg-card border border-border shadow-md',
    tinted: 'bg-primary/5 border border-primary/15',
    glass: 'bg-card border border-border shadow-sm',
  }

  const interactiveStyles = interactive
    ? 'hover:border-border-strong hover:shadow-md cursor-pointer transition-[border-color,box-shadow] duration-150'
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
