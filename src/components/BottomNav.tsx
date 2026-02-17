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
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-pb glass-heavy border-t-0">
      {/* Gradient top border */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-primary/20 via-accent/30 to-primary/20" />
      
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href !== '/' && location.pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'group relative flex flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-2 text-[11px] leading-none min-w-[68px]',
                'transition-all duration-200 ease-out',
                'active:scale-95',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {/* Active background glow */}
              {isActive ? <div className="absolute inset-0 rounded-xl bg-primary/12 shadow-[0_0_20px_-4px] shadow-primary/40" /> : null}
              
              {/* Hover background */}
              <div className={cn(
                'absolute inset-0 rounded-xl bg-secondary/0 transition-colors duration-200',
                !isActive && 'group-hover:bg-secondary/60'
              )}
              />
              
              {/* Icon with animation */}
              <div className={cn(
                'relative z-10 transition-transform duration-200',
                'group-active:scale-90',
                isActive && 'group-hover:scale-105'
              )}
              >
                <item.icon 
                  className={cn(
                    'h-5 w-5 transition-all duration-200',
                    isActive 
                      ? 'text-primary drop-shadow-[0_0_8px_var(--primary)]' 
                      : 'text-muted-foreground group-hover:text-foreground'
                  )} 
                />
              </div>
              
              {/* Label */}
              <span className={cn(
                'relative z-10 font-medium truncate max-w-full transition-colors duration-200',
                isActive ? 'text-primary' : 'group-hover:text-foreground'
              )}
              >
                {item.label}
              </span>
              
              {/* Active indicator dot */}
              {isActive ? <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary shadow-[0_0_6px_2px] shadow-primary/50" /> : null}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
