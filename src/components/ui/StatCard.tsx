import type { LucideIcon } from 'lucide-react'
import { Card } from '~/components/ui/Card'
import { cn } from '~/lib/cn'

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string | number
  onClick?: () => void
  className?: string
}

export function StatCard({
  icon: Icon,
  label,
  value,
  onClick,
  className
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "p-5",
        onClick && "hover:border-primary/50 hover:shadow-pop cursor-pointer transition-all pressable",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <span className="text-sm text-muted-foreground">{label}</span>
          <p className="text-2xl font-semibold tabular-nums mt-1">{value}</p>
        </div>
      </div>
    </Card>
  )
}
