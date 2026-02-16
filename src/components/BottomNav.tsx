'use client'

import { Link, useLocation } from '@tanstack/react-router'
import { Home, Dumbbell, TrendingUp, Trophy, FileText } from 'lucide-react'
import { cn } from '~/lib/cn'

const navItems = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/workouts', icon: Dumbbell, label: 'Workouts' },
  { href: '/programs', icon: FileText, label: 'Programs' },
  { href: '/progress', icon: TrendingUp, label: 'Progress' },
  { href: '/achievements', icon: Trophy, label: 'Badges' },
]

export function BottomNav() {
  const location = useLocation()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-pb border-t border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href !== '/' && location.pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'pressable flex flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-2 text-[11px] leading-none transition-colors min-w-[68px]',
                isActive
                  ? 'text-primary bg-primary/12 shadow-soft'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
              )}
            >
              <item.icon className={cn('h-5 w-5 transition-colors', isActive ? 'text-primary' : 'text-muted-foreground')} />
              <span className="font-medium truncate max-w-full">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
