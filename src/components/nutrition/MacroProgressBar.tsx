import { cn } from '~/lib/cn'

interface MacroProgressBarProps {
  label: string
  consumed: number
  target: number
  unit: string
  color: string
}

export function MacroProgressBar({ label, consumed, target, unit, color }: MacroProgressBarProps) {
  const percentage = target > 0 ? Math.min((consumed / target) * 100, 100) : 0
  const isOver = consumed > target

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className={cn('text-muted-foreground', isOver && 'text-destructive')}>
          {consumed.toFixed(0)}{unit} / {target}{unit}
        </span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={cn('h-full rounded-full transition-all', color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
