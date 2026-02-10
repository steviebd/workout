'use client'

import { useState, useEffect, useRef } from 'react'
import { WifiOff, Flame, User, LogOut, Settings, Loader2, CloudUpload, Target, Heart } from 'lucide-react'
import { Button } from './ui/Button'
import { ThemeToggleCompact } from './ui/ThemeToggle'
import { useAuth } from '@/routes/__root'
import { useUnit } from '@/lib/context/UnitContext'
import { useDateFormat } from '@/lib/context/DateFormatContext'
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
  const [whoopConnected, setWhoopConnected] = useState(false)
  const [whoopLoading, setWhoopLoading] = useState(true)

  useEffect(() => {
    async function checkWhoopStatus() {
      if (!user) {
        setWhoopConnected(false)
        setWhoopLoading(false)
        return
      }
      try {
        const response = await fetch('/api/integrations/whoop/status')
        if (response.ok) {
          const data = await response.json() as { connected: boolean }
          setWhoopConnected(data.connected)
        }
      } catch {
        setWhoopConnected(false)
      } finally {
        setWhoopLoading(false)
      }
    }
    void checkWhoopStatus()
  }, [user])

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
      <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
              <Flame className="h-5 w-5 text-primary" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-primary">Fit Workout</span>
          </div>

          <div className="flex items-center gap-3">
            {streakLoading ? (
              <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5">
                <Target className="h-4 w-4 text-primary animate-pulse" />
                <span className="text-sm font-semibold">...</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">{weeklyCount}/{weeklyTarget}</span>
              </div>
            )}

          {!isOnline && (
            <div className="flex items-center gap-1 rounded-full bg-warning/20 px-2 py-1 text-warning">
              <WifiOff className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Offline</span>
            </div>
          )}

          {isSyncing ? (
            <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-primary">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span className="text-xs font-medium">Syncing...</span>
            </div>
          ) : null}

            {isOnline && pendingCount > 0 ? (
            <div className="flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-muted-foreground">
              <CloudUpload className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">{pendingCount} pending</span>
            </div>
          ) : null}

          <ThemeToggleCompact />

          {!whoopLoading && whoopConnected ? <a
              href="/health"
              className="flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
              <Heart className="h-4 w-4" />
              <span className="hidden sm:inline">Health</span>
                                             </a> : null}

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
                <div className="px-4 py-3">
                  <p className="text-sm text-muted-foreground mb-2">Date Format</p>
                  {dateLoading ? (
                    <div className="flex items-center justify-center py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDateFormatChange('dd/mm/yyyy')}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                          dateFormat === 'dd/mm/yyyy'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        DD/MM/YY
                      </button>
                      <button
                        onClick={() => handleDateFormatChange('mm/dd/yyyy')}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
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
                <div className="px-4 py-3 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-2">Weekly Workout Target</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => void handleWeeklyTargetChange(weeklyTarget - 1)}
                      disabled={weeklyTarget <= 1 || savingTarget}
                      className="h-9 w-9 flex items-center justify-center rounded-lg bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                      className="w-16 h-9 text-center rounded-lg border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      onClick={() => void handleWeeklyTargetChange(weeklyTarget + 1)}
                      disabled={weeklyTarget >= 7 || savingTarget}
                      className="h-9 w-9 flex items-center justify-center rounded-lg bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                onClick={() => { window.location.href = '/auth/signin' }}
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
