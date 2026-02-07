import type { LucideIcon } from 'lucide-react'
import { Card } from '~/components/ui/Card'
import { cn } from '~/lib/cn'

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string | number
  variant?: 'default' | 'primary' | 'success' | 'warning'
  onClick?: () => void
  className?: string
}

export function StatCard({
  icon: Icon,
  label,
  value,
  variant = 'default',
  onClick,
  className
}: StatCardProps) {
  const variantStyles = {
    default: 'text-muted-foreground',
    primary: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
  }

  return (
    <Card
      className={cn(
        "p-4",
        onClick && "hover:border-primary/50 hover:shadow-md cursor-pointer transition-all",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className={cn("h-4 w-4", variantStyles[variant])} />
      </div>
      <p className="text-2xl font-semibold tabular-nums mt-1">{value}</p>
    </Card>
  )
}
