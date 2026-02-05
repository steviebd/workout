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
    <div className={cn("flex gap-2 overflow-x-auto scrollbar-hide pb-1", className)}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "whitespace-nowrap flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all active:scale-95",
            value === option.value
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          )}
        >
          {option.label}
          {option.count !== undefined && ` (${option.count})`}
        </button>
      ))}
    </div>
  )
}
