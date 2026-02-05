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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl shadow-lg pb-safe">
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-around rounded-full shadow-xl border border-border/50 my-4 mb-6">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href !== '/' && location.pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              to={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 rounded-xl px-4 py-2 text-xs transition-colors active:scale-[0.95]',
                  isActive
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <item.icon className={cn('h-7 w-7', isActive && 'fill-primary/20')} />
              <span className="font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
