'use client'

import { useState, useEffect, useRef } from 'react'
import { WifiOff, Flame, User, LogOut, Settings, Loader2, CloudUpload, Target, Heart } from 'lucide-react'
import { Button } from '../ui/Button'
import { ThemeToggleCompact } from '../ui/ThemeToggle'
import { useAuth } from '@/routes/__root'
import { useUnit, useDateFormat } from '@/lib/context/UserPreferencesContext'
import { useStreak } from '@/lib/context/StreakContext'

export function Header() {
  const { user, loading: authLoading, signOut, isOnline, isSyncing, pendingCount } = useAuth()
  const [showMenu, setShowMenu] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const settingsRef = useRef<HTMLDivElement>(null)
  const { weightUnit, setWeightUnit } = useUnit()
  const { dateFormat, loading: dateLoading, setDateFormat } = useDateFormat()
  const { weeklyCount, weeklyTarget, loading: streakLoading, refetch: refetchStreak } = useStreak()
  const [savingTarget, setSavingTarget] = useState(false)

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

  const handleDateFormatChange = (format: 'dd/mm/yyyy' | 'mm/dd/yyyy') => {
    void setDateFormat(format)
  }

  const handleWeeklyTargetChange = async (target: number) => {
    if (target < 1 || target > 7) return
    setSavingTarget(true)
    try {
      await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weeklyWorkoutTarget: target }),
      })
      await refetchStreak()
    } catch (error) {
      console.error('Failed to save weekly target:', error)
    } finally {
      setSavingTarget(false)
    }
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
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-between px-4 relative">
          <div className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Flame className="h-5 w-5 text-primary" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-foreground">Fit Workout</span>
          </div>

          <div className="flex items-center gap-2.5">
            {streakLoading ? (
              <div className="flex items-center gap-1.5 rounded-full bg-secondary border border-border px-3 py-1.5">
                <Target className="h-4 w-4 text-primary animate-pulse" />
                <span className="text-sm font-semibold text-muted-foreground">...</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 rounded-full bg-secondary border border-border px-3 py-1.5">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">{weeklyCount}/{weeklyTarget}</span>
              </div>
            )}

          {!isOnline && (
            <div className="flex items-center gap-1.5 rounded-full bg-warning/10 border border-warning/20 px-2.5 py-1 text-warning">
              <WifiOff className="h-3.5 w-3.5" />
              <span className="text-xs font-semibold">Offline</span>
            </div>
          )}

          {isSyncing ? (
            <div className="flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-1 text-primary">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span className="text-xs font-semibold">Syncing...</span>
            </div>
          ) : null}

            {isOnline && pendingCount > 0 ? (
            <div className="flex items-center gap-1.5 rounded-full bg-secondary border border-border px-2.5 py-1 text-muted-foreground hover:text-foreground transition-colors">
              <CloudUpload className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">{pendingCount} pending</span>
            </div>
          ) : null}

          <ThemeToggleCompact />

          <a
              href="/health"
              className="flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all duration-200 hover:shadow-sm"
          >
              <Heart className="h-4 w-4" />
              <span className="hidden sm:inline">Health</span>
          </a>

          <div className="relative" ref={settingsRef}>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all duration-200 hover:shadow-sm pressable"
              >
                <Settings className={`h-5 w-5 transition-transform duration-300 ${showSettings ? 'rotate-90' : ''}`} />
              </button>

            {showSettings ? (
              <div className="absolute right-0 top-full mt-2 w-64 rounded-xl bg-popover border border-border py-2 shadow-md animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200">
                <div className="px-4 py-3 border-b border-border/60">
                  <p className="font-semibold text-foreground">Settings</p>
                </div>
                <div className="px-4 py-3 border-b border-border/60">
                  <p className="text-sm text-muted-foreground mb-2.5">Weight Unit</p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleUnitToggle}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 pressable ${
                        weightUnit === 'kg'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-muted-foreground hover:text-foreground'
                          }`}
                          >
                          Kilograms (kg)
                          </button>
                          <button
                          onClick={handleUnitToggle}
                          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 pressable ${
                          weightUnit === 'lbs'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Pounds (lbs)
                    </button>
                  </div>
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm text-muted-foreground mb-2.5">Date Format</p>
                  {dateLoading ? (
                    <div className="flex items-center justify-center py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDateFormatChange('dd/mm/yyyy')}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 pressable ${
                          dateFormat === 'dd/mm/yyyy'
                             ? 'bg-primary text-primary-foreground'
                             : 'bg-secondary text-muted-foreground hover:text-foreground'
                          }`}
                          >
                          DD/MM/YY
                          </button>
                          <button
                          onClick={() => handleDateFormatChange('mm/dd/yyyy')}
                          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 pressable ${
                           dateFormat === 'mm/dd/yyyy'
                             ? 'bg-primary text-primary-foreground'
                             : 'bg-secondary text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        MM/DD/YY
                      </button>
                    </div>
                  )}
                </div>
                <div className="px-4 py-3 border-t border-border/60">
                  <p className="text-sm text-muted-foreground mb-2.5">Weekly Workout Target</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => void handleWeeklyTargetChange(weeklyTarget - 1)}
                      disabled={weeklyTarget <= 1 || savingTarget}
                      className="h-9 w-9 flex items-center justify-center rounded-lg bg-secondary/80 text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 pressable"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="7"
                      value={weeklyTarget}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10)
                        if (val >= 1 && val <= 7) {
                          void handleWeeklyTargetChange(val)
                        }
                      }}
                      className="w-16 h-9 text-center rounded-lg border border-border/60 bg-background/80 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200"
                    />
                    <button
                      onClick={() => void handleWeeklyTargetChange(weeklyTarget + 1)}
                      disabled={weeklyTarget >= 7 || savingTarget}
                      className="h-9 w-9 flex items-center justify-center rounded-lg bg-secondary/80 text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 pressable"
                    >
                      +
                    </button>
                    <span className="text-sm text-muted-foreground">per week</span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="relative" ref={menuRef}>
            {authLoading ? (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/80 border border-border/50">
                <div className="h-5 w-5 animate-pulse rounded-full bg-muted skeleton-shimmer" />
              </div>
            ) : user ? (
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="relative flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground transition-colors duration-150"
              >
                {user.name ? (
                  <span className="text-sm font-semibold">
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
                onClick={() => { window.location.href = '/auth/signin' }}
                className="rounded-xl"
              >
                Sign In
              </Button>
            )}

            {showMenu && user ? (
              <div className="absolute right-0 top-full mt-2 w-64 rounded-xl bg-popover border border-border py-2 shadow-md animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200">
                <div className="px-4 py-3 border-b border-border/60">
                  <p className="font-semibold text-foreground truncate">{user.name || 'User'}</p>
                  <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-all duration-200 pressable"
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
