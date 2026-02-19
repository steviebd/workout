'use client'

import React from "react"

import { Flame, Crown, Trophy, Dumbbell, Medal, Star, Zap, Footprints, Lock } from 'lucide-react'
import { Card, CardContent } from '~/components/ui/Card'
import { cn } from '~/lib/cn'
import { useDateFormat } from '@/lib/context/UserPreferencesContext'

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
  streak: 'bg-primary/5 border-primary/15',
  volume: 'bg-exercise/5 border-exercise/15',
  pr: 'bg-volume/5 border-volume/15',
  consistency: 'bg-success/5 border-success/15',
}

const categoryIconColors: Record<string, string> = {
  streak: 'text-primary bg-primary/20',
  volume: 'text-exercise bg-exercise/20',
  pr: 'text-volume bg-volume/20',
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
          ? categoryColors[badge.category]
          : 'bg-secondary/30 border-border opacity-60'
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-xl flex-shrink-0',
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
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-base font-semibold truncate">{badge.name}</p>
              {badge.unlocked ? <span className="flex-shrink-0 text-xs bg-success/20 text-success px-2 py-0.5 rounded-full font-medium">Unlocked</span> : null}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
              {badge.description}
            </p>
          </div>
        </div>

        {!badge.unlocked && (
          <div className="mt-3 ml-[3.75rem]">
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
                  badge.category === 'volume' && 'bg-exercise',
                  badge.category === 'pr' && 'bg-volume',
                  badge.category === 'consistency' && 'bg-success'
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {badge.unlocked && badge.unlockedAt ? (
          <p className="mt-2 ml-[3.75rem] text-xs text-muted-foreground">
            Earned{' '}
            {formatDateLong(badge.unlockedAt)}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
