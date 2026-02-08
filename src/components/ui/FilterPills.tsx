import { cn } from '~/lib/cn'

interface FilterOption<T extends string> {
  value: T
  label: string
  count?: number
}

interface FilterPillsProps<T extends string> {
  options: Array<FilterOption<T>>
  value: T
  onChange: (value: T) => void
  className?: string
}

export function FilterPills<T extends string>({
  options,
  value,
  onChange,
  className
}: FilterPillsProps<T>) {
  return (
    <div className={cn("flex gap-1 p-1 bg-surface-2 ring-1 ring-border rounded-lg scrollbar-hide", className)}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "whitespace-nowrap flex-shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
            value === option.value
              ? "bg-surface-3 shadow-xs text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option.label}
          {option.count !== undefined && ` (${option.count})`}
        </button>
      ))}
    </div>
  )
}
