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
        onClick && "hover:border-primary/50 hover:shadow-md cursor-pointer active:scale-95 transition-all",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className={cn("h-4 w-4", variantStyles[variant])} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-xl font-bold">{value}</p>
    </Card>
  )
}
