'use client'

import { useState, useEffect, useRef } from 'react'
import { WifiOff, Flame, User, LogOut, Settings } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from './ui/Button'
import { useAuth } from '@/routes/__root'
import { useUnit } from '@/lib/context/UnitContext'

export function Header() {
  const [isOnline, setIsOnline] = useState(true)
  const [streak] = useState(7)
  const { user, loading, signOut } = useAuth()
  const [showMenu, setShowMenu] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const settingsRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { weightUnit, setWeightUnit } = useUnit()

  useEffect(() => {
    setIsOnline(navigator.onLine)
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = () => {
    setShowMenu(false)
    void signOut()
  }

  const handleUnitToggle = () => {
    const newUnit = weightUnit === 'kg' ? 'lbs' : 'kg'
    void setWeightUnit(newUnit)
  }

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Flame className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight">Fit Workout</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5">
            <Flame className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">{streak}</span>
          </div>
          
          {!isOnline && (
            <div className="flex items-center gap-1 rounded-full bg-warning/20 px-2 py-1 text-warning">
              <WifiOff className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Offline</span>
            </div>
          )}

          <div className="relative" ref={settingsRef}>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <Settings className="h-5 w-5" />
            </button>

            {showSettings ? (
              <div className="absolute right-0 top-full mt-2 w-64 rounded-lg border border-border bg-card py-2 shadow-lg">
                <div className="px-4 py-3 border-b border-border">
                  <p className="font-medium text-foreground">Settings</p>
                </div>
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm text-muted-foreground mb-2">Weight Unit</p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleUnitToggle}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                        weightUnit === 'kg'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Kilograms (kg)
                    </button>
                    <button
                      onClick={handleUnitToggle}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                        weightUnit === 'lbs'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Pounds (lbs)
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="relative" ref={menuRef}>
            {loading ? (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
                <div className="h-5 w-5 animate-pulse rounded-full bg-muted" />
              </div>
            ) : user ? (
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                {user.name ? (
                  <span className="text-sm font-medium">
                    {getUserInitials(user.name)}
                  </span>
                ) : (
                  <User className="h-5 w-5" />
                )}
              </button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { void navigate({ to: '/auth/signin' }) }}
              >
                Sign In
              </Button>
            )}

            {showMenu && user ? (
              <div className="absolute right-0 top-full mt-2 w-64 rounded-lg border border-border bg-card py-2 shadow-lg">
                <div className="px-4 py-3 border-b border-border">
                  <p className="font-medium text-foreground truncate">{user.name || 'User'}</p>
                  <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  )
}
