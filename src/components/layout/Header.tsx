import { useState, useEffect, useRef } from 'react'
import { WifiOff, Flame, User, LogOut, Settings, Loader2, CloudUpload, Target, Heart, Scale } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { ThemeToggleCompact } from '../ui/ThemeToggle'
import { useAuth } from '@/routes/__root'
import { useUnit, useDateFormat, useUserPreferences } from '@/lib/context/UserPreferencesContext'
import { useStreak } from '@/lib/context/StreakContext'

export function Header() {
  const navigate = useNavigate()
  const { user, loading: authLoading, signOut, isOnline, isSyncing, pendingCount } = useAuth()
  const [showMenu, setShowMenu] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const settingsRef = useRef<HTMLDivElement>(null)
  const { weightUnit, setWeightUnit } = useUnit()
  const { dateFormat, loading: dateLoading, setDateFormat } = useDateFormat()
  const { energyUnit, setEnergyUnit } = useUserPreferences()
  const { weeklyCount, weeklyTarget, loading: streakLoading, refetch: refetchStreak } = useStreak()
  const queryClient = useQueryClient()
  const [savingTarget, setSavingTarget] = useState(false)
  const [bodyweight, setBodyweight] = useState('')
  const [savingBodyweight, setSavingBodyweight] = useState(false)

  const { data: bodyStats } = useQuery<{ bodyweightKg: number | null }>({
    queryKey: ['body-stats'],
    queryFn: async () => {
      const res = await fetch('/api/nutrition/body-stats', { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch body stats')
      return res.json()
    },
    enabled: !!user,
  })

  useEffect(() => {
    if (bodyStats?.bodyweightKg) {
      setBodyweight(String(bodyStats.bodyweightKg))
    }
  }, [bodyStats])

  const saveBodyweight = async () => {
    const weight = parseFloat(bodyweight)
    if (isNaN(weight) || weight <= 0) return
    setSavingBodyweight(true)
    try {
      await fetch('/api/nutrition/body-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bodyweight_kg: weight,
          recorded_at: new Date().toISOString(),
        }),
      })
      await queryClient.invalidateQueries({ queryKey: ['body-stats'] })
    } catch (error) {
      console.error('Failed to save bodyweight:', error)
    } finally {
      setSavingBodyweight(false)
    }
  }

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

  const handleEnergyUnitToggle = () => {
    const newUnit = energyUnit === 'kcal' ? 'kj' : 'kcal'
    void setEnergyUnit(newUnit)
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
    <header className="sticky top-0 z-50 bg-background/98 backdrop-blur-sm border-b border-border/50">
      <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4 relative">
          <div className="flex items-center gap-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
              <Flame className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-base font-semibold tracking-tight text-foreground">Workout</span>
          </div>

          <div className="flex items-center gap-2">
            {!isOnline && (
              <div className="flex sm:hidden items-center justify-center" title="Offline">
                <div className="h-2 w-2 rounded-full bg-warning" />
              </div>
            )}

            {streakLoading ? (
              <div className="hidden sm:flex items-center gap-2 rounded-md bg-secondary border border-border px-3 py-1.5">
                <Target className="h-4 w-4 text-primary animate-pulse" />
                <span className="text-sm font-medium text-muted-foreground">...</span>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2 rounded-md bg-secondary border border-border px-3 py-1.5">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{weeklyCount}/{weeklyTarget}</span>
              </div>
            )}

          {!isOnline && (
            <div className="hidden sm:flex items-center gap-1.5 rounded-md bg-warning/10 border border-warning/30 px-2.5 py-1.5 text-warning">
              <WifiOff className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Offline</span>
            </div>
          )}

          {isSyncing ? (
            <div className="hidden sm:flex items-center gap-1.5 rounded-md bg-primary/10 border border-primary/30 px-2.5 py-1.5 text-primary">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span className="text-xs font-medium">Syncing...</span>
            </div>
          ) : null}

            {isOnline && pendingCount > 0 ? (
            <div className="hidden sm:flex items-center gap-1.5 rounded-md bg-secondary border border-border px-2.5 py-1.5 text-muted-foreground hover:text-foreground transition-colors">
              <CloudUpload className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">{pendingCount} pending</span>
            </div>
          ) : null}

          <ThemeToggleCompact />

          <a
              href="/health"
              className="hidden md:flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200"
          >
              <Heart className="h-4 w-4" />
              <span className="hidden sm:inline">Health</span>
          </a>

          <div className="relative" ref={settingsRef}>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200 pressable"
              >
                <Settings className={`h-5 w-5 transition-transform duration-300 ${showSettings ? 'rotate-90' : ''}`} />
              </button>

            {showSettings ? (
              <div className="absolute right-0 top-full mt-2 w-72 rounded-lg bg-popover border border-border py-2 shadow-lg animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200">
                <div className="px-4 py-3 border-b border-border/50">
                  <p className="font-semibold text-foreground text-sm">Settings</p>
                </div>
                <div className="px-4 py-3 border-b border-border/50">
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
                  <p className="text-sm text-muted-foreground mb-2.5">Energy Unit</p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleEnergyUnitToggle}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 pressable ${
                        energyUnit === 'kcal'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-muted-foreground hover:text-foreground'
                          }`}
                    >
                          Kilocalories (kcal)
                    </button>
                          <button
                          onClick={handleEnergyUnitToggle}
                          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 pressable ${
                          energyUnit === 'kj'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-muted-foreground hover:text-foreground'
                      }`}
                          >
                      Kilojoules (kJ)
                          </button>
                  </div>
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
                <div className="px-4 py-3 border-t border-border/60">
                  <p className="text-sm text-muted-foreground mb-2.5 flex items-center gap-2">
                    <Scale className="h-4 w-4" />
                    Bodyweight
                  </p>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="kg"
                      value={bodyweight}
                      onChange={(e) => setBodyweight(e.target.value)}
                      className="w-24 h-9 text-center"
                    />
                    <Button
                      size="sm"
                      onClick={() => void saveBodyweight()}
                      disabled={!bodyweight || savingBodyweight}
                    >
                      {savingBodyweight ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : 'Save'}
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="relative" ref={menuRef}>
            {authLoading ? (
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary border border-border">
                <div className="h-5 w-5 animate-pulse rounded-md bg-muted skeleton-shimmer" />
              </div>
            ) : user ? (
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="relative flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-200"
              >
                {user.name ? (
                  <span className="text-xs font-semibold">
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
                className="rounded-xl"
              >
                Sign In
              </Button>
            )}

            {showMenu && user ? (
              <div className="absolute right-0 top-full mt-2 w-72 rounded-lg bg-popover border border-border py-2 shadow-lg animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200">
                <div className="px-4 py-3 border-b border-border/50">
                  <p className="font-semibold text-foreground text-sm truncate">{user.name || 'User'}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
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
