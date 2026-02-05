import { Check, ChevronRight } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Card } from '~/components/ui/Card'
import { cn } from '~/lib/cn'

interface ListCardProps {
  title: string
  subtitle?: string
  badge?: React.ReactNode
  meta?: React.ReactNode
  onClick?: () => void
  href?: string
  selected?: boolean
  selectable?: boolean
  onSelect?: () => void
  className?: string
}

export function ListCard({
  title,
  subtitle,
  badge,
  meta,
  onClick,
  href,
  selected = false,
  selectable = false,
  onSelect,
  className,
}: ListCardProps) {
  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect?.()
  }

  const content = (
    <Card
      className={cn(
        "p-4 hover:border-primary/50 transition-colors cursor-pointer touch-manipulation",
        selected && "border-primary bg-primary/5",
        className
      )}
    >
        <div className="flex items-start gap-3">
          {selectable ? (
            <button
              onClick={handleSelect}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleSelect(e as unknown as React.MouseEvent)
                }
              }}
              className={cn(
                "flex-shrink-0 mt-0.5 h-5 w-5 rounded border-2 transition-colors",
                selected
                  ? "bg-primary border-primary text-primary-foreground"
                  : "border-muted-foreground/30 hover:border-primary"
              )}
              role="checkbox"
              aria-checked={selected}
            >
              {selected ? <Check className="h-3 w-3 m-auto" /> : null}
            </button>
          ) : null}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{title}</h3>
                {subtitle ? (
                  <p className="text-sm text-muted-foreground line-clamp-2">{subtitle}</p>
                ) : null}
              </div>
              {badge ?? null}
            </div>
            {meta ? (
              <div className="flex items-center justify-between pt-3 border-t border-border">
                {meta}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            ) : null}
          </div>
        </div>
    </Card>
  )

  if (href) {
    return <Link to={href}>{content}</Link>
  }

  if (onClick) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onClick()
          }
        }}
      >
        {content}
      </div>
    )
  }

  return content
}
