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
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-pb bg-background/95 backdrop-blur-sm border-t border-border">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href !== '/' && location.pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 rounded-lg px-3 py-2 text-[11px] leading-none min-w-[60px]',
                'transition-colors duration-150',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <item.icon className={cn(
                'h-5 w-5',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )} />
              <span className={cn(
                'font-medium truncate max-w-full',
                isActive ? 'text-primary' : ''
              )}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
