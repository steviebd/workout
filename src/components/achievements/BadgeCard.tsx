'use client'

import React from "react"

import { Flame, Crown, Trophy, Dumbbell, Medal, Star, Zap, Footprints, Lock } from 'lucide-react'
import { Card, CardContent } from '~/components/ui/Card'
import { cn } from '~/lib/cn'
import { useDateFormat } from '@/lib/context/DateFormatContext'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  flame: Flame,
  crown: Crown,
  trophy: Trophy,
  dumbbell: Dumbbell,
  medal: Medal,
  star: Star,
  zap: Zap,
  footprints: Footprints,
}

const categoryColors: Record<string, string> = {
  streak: 'from-primary/20 to-primary/5 border-primary/30',
  volume: 'from-accent/20 to-accent/5 border-accent/30',
  pr: 'from-chart-4/20 to-chart-4/5 border-chart-4/30',
  consistency: 'from-success/20 to-success/5 border-success/30',
}

const categoryIconColors: Record<string, string> = {
  streak: 'text-primary bg-primary/20',
  volume: 'text-accent bg-accent/20',
  pr: 'text-chart-4 bg-chart-4/20',
  consistency: 'text-success bg-success/20',
}

interface Badge {
  id: string
  name: string
  description: string
  icon: string
  category: string
  unlocked: boolean
  progress: number
  requirement: number
  unlockedAt?: string
}

interface BadgeCardProps {
  badge: Badge
}

export function BadgeCard({ badge }: BadgeCardProps) {
  const Icon = iconMap[badge.icon] ?? Trophy
  const progressPercent = Math.min((badge.progress / badge.requirement) * 100, 100)
  const { formatDateLong } = useDateFormat()

  return (
    <Card
      className={cn(
        'relative overflow-hidden border transition-all',
        badge.unlocked
          ? `bg-gradient-to-br ${categoryColors[badge.category]}`
          : 'bg-secondary/30 border-border opacity-60'
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-xl',
              badge.unlocked
                ? categoryIconColors[badge.category]
                : 'bg-muted text-muted-foreground'
            )}
          >
            {badge.unlocked ? (
              <Icon className="h-6 w-6" />
            ) : (
              <Lock className="h-5 w-5" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold truncate">{badge.name}</p>
              {badge.unlocked ? <span className="flex-shrink-0 text-xs text-success font-medium">Unlocked</span> : null}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {badge.description}
            </p>
          </div>
        </div>

        {!badge.unlocked && (
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">
                {badge.progress.toLocaleString()} / {badge.requirement.toLocaleString()}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  badge.category === 'streak' && 'bg-primary',
                  badge.category === 'volume' && 'bg-accent',
                  badge.category === 'pr' && 'bg-chart-4',
                  badge.category === 'consistency' && 'bg-success'
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {badge.unlocked && badge.unlockedAt ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Earned{' '}
            {formatDateLong(badge.unlockedAt)}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
