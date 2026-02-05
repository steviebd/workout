import type { LucideIcon } from 'lucide-react'
import { cn } from '~/lib/cn'
import { Button } from '~/components/ui/Button'

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon
  variant?: 'default' | 'ghost' | 'destructive' | 'primary'
  size?: 'sm' | 'md' | 'lg'
  label: string
}

export function IconButton({
  icon: Icon,
  variant = 'ghost',
  size = 'md',
  label,
  className,
  ...props
}: IconButtonProps) {
  const sizeStyles = {
    sm: 'h-8 w-8',
    md: 'h-9 w-9',
    lg: 'h-10 w-10',
  }

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  }

  const variantStyles = {
    default: 'text-muted-foreground hover:text-foreground hover:bg-secondary',
    ghost: 'text-muted-foreground hover:text-foreground hover:bg-accent',
    destructive: 'text-muted-foreground hover:text-destructive hover:bg-destructive/10',
    primary: 'text-muted-foreground hover:text-primary hover:bg-primary/10',
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
      title={label}
      aria-label={label}
      {...props}
    >
      <Icon className={iconSizes[size]} />
    </Button>
  )
}
