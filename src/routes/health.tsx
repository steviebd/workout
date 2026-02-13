'use client'

import { useState, useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Heart, Moon, Activity, Zap, RefreshCw, Loader2, Link, Link2Off } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface WhoopStatus {
  connected: boolean
  lastSyncAt: string | null
  syncInProgress: boolean
  syncStatus: string | null
  whoopUserId: string | null
}

interface WhoopData {
  recoveries: Array<{
    id: string
    date: string
    score: number | null
    status: 'red' | 'yellow' | 'green' | null
    restingHeartRate: number | null
    hrv: number | null
  }>
  sleeps: Array<{
    id: string
    sleepDate: string
    qualityScore: number | null
    asleepDurationMs: number | null
    isNap: boolean
  }>
  cycles: Array<{
    id: string
    date: string
    score: number | null
    totalStrain: number | null
  }>
  workouts: Array<{
    id: string
    startTime: string
    name: string | null
    strain: number | null
    durationMs: number | null
  }>
}

function HealthPage() {
  const [status, setStatus] = useState<WhoopStatus | null>(null)
  const [data, setData] = useState<WhoopData | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'sleep' | 'recovery' | 'strain' | 'workouts'>('overview')

  async function fetchWhoopData() {
    try {
      const [statusRes, dataRes] = await Promise.all([
        fetch('/api/integrations/whoop/status'),
        fetch('/api/health/data'),
      ])

      if (statusRes.ok) {
        setStatus(await statusRes.json())
      }
      if (dataRes.ok) {
        setData(await dataRes.json())
      }
    } catch (error) {
      console.error('Failed to fetch Whoop data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchWhoopData()
  }, [])

  const handleSync = async () => {
    setSyncing(true)
    try {
      const response = await fetch('/api/integrations/whoop/sync', { method: 'POST' })
      if (response.ok) {
        await fetchWhoopData()
      }
    } catch (error) {
      console.error('Sync failed:', error)
    } finally {
      setSyncing(false)
    }
  }

  const handleConnect = () => {
    window.location.href = '/api/integrations/whoop/connect'
  }

  const handleDisconnect = async () => {
    // eslint-disable-next-line no-alert
    if (!confirm('Are you sure you want to disconnect Whoop?')) return

    try {
      await fetch('/api/integrations/whoop/disconnect', { method: 'POST' })
      await fetchWhoopData()
    } catch (error) {
      console.error('Disconnect failed:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!status?.connected) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-md">
        <div className="text-center mb-8">
          <Heart className="h-12 w-12 mx-auto mb-4 text-primary" />
          <h1 className="text-2xl font-bold mb-2">Connect Whoop</h1>
          <p className="text-muted-foreground">
            Link your Whoop account to track your recovery, sleep, and strain metrics.
          </p>
        </div>
        <Button onClick={handleConnect} className="w-full" size="lg">
          <Link className="h-4 w-4 mr-2" />
          Connect Whoop Account
        </Button>
      </div>
    )
  }

  const todayRecovery = data?.recoveries[0]
  const todaySleep = data?.sleeps[0]
  const todayCycle = data?.cycles[0]

  return (
    <div className="container mx-auto px-4 py-6 pb-24 max-w-md">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Health</h1>
        <Button
          onClick={() => void handleSync()}
          disabled={syncing}
          variant="outline"
          size="sm"
        >
          {syncing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="ml-2">{syncing ? 'Syncing...' : 'Sync'}</span>
        </Button>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {(['overview', 'sleep', 'recovery', 'strain', 'workouts'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card rounded-xl p-4 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">Recovery</span>
              </div>
              <div className={`text-3xl font-bold ${
                todayRecovery?.status === 'green' ? 'text-green-500' :
                todayRecovery?.status === 'yellow' ? 'text-yellow-500' :
                todayRecovery?.status === 'red' ? 'text-red-500' : 'text-foreground'
              }`}
              >
                {todayRecovery?.score ?? '--'}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {todayRecovery?.status ?? 'No data'}
              </div>
            </div>

            <div className="bg-card rounded-xl p-4 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">Strain</span>
              </div>
              <div className="text-3xl font-bold text-foreground">
                {todayCycle?.score ?? '--'}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {todayCycle?.totalStrain ? `Effort: ${todayCycle.totalStrain}` : 'No data'}
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Moon className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">Sleep</span>
            </div>
            <div className="text-3xl font-bold text-foreground">
              {todaySleep?.asleepDurationMs
                ? `${Math.round(todaySleep.asleepDurationMs / 3600000 * 10) / 10  }h`
                : '--'}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Quality: {todaySleep?.qualityScore ?? '--'}%
            </div>
          </div>

          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Key Metrics</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">HRV</span>
                <span className="text-sm font-medium">{todayRecovery?.hrv ?? '--'} ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Resting HR</span>
                <span className="text-sm font-medium">{todayRecovery?.restingHeartRate ?? '--'} bpm</span>
              </div>
            </div>
          </div>

          <Button onClick={() => void handleDisconnect()} variant="outline" className="w-full" size="lg">
            <Link2Off className="h-4 w-4 mr-2" />
            Disconnect Whoop
          </Button>
        </div>
      )}

      {activeTab === 'recovery' && (
        <div className="space-y-3">
          {data?.recoveries.map((recovery) => (
            <div key={recovery.id} className="bg-card rounded-xl p-4 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{new Date(recovery.date).toLocaleDateString()}</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  recovery.status === 'green' ? 'bg-green-500/20 text-green-500' :
                  recovery.status === 'yellow' ? 'bg-yellow-500/20 text-yellow-500' :
                  recovery.status === 'red' ? 'bg-red-500/20 text-red-500' : 'bg-muted text-muted-foreground'
                }`}
                >
                  {recovery.status ?? 'N/A'}
                </span>
              </div>
              <div className="text-2xl font-bold mb-2">{recovery.score ?? '--'}</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">HRV</span>
                  <div className="font-medium">{recovery.hrv ?? '--'} ms</div>
                </div>
                <div>
                  <span className="text-muted-foreground">RHR</span>
                  <div className="font-medium">{recovery.restingHeartRate ?? '--'} bpm</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'sleep' && (
        <div className="space-y-3">
          {data?.sleeps.map((sleep) => (
            <div key={sleep.id} className="bg-card rounded-xl p-4 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{new Date(sleep.sleepDate).toLocaleDateString()}</span>
                {sleep.isNap ? <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-500 text-xs font-medium">
                    Nap
                               </span> : null}
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm mb-2">
                <div>
                  <span className="text-muted-foreground">Quality</span>
                  <div className="font-medium">{sleep.qualityScore ?? '--'}%</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Duration</span>
                  <div className="font-medium">
                    {sleep.asleepDurationMs
                      ? `${Math.round(sleep.asleepDurationMs / 3600000 * 10) / 10  }h`
                      : '--'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'strain' && (
        <div className="space-y-3">
          {data?.cycles.map((cycle) => (
            <div key={cycle.id} className="bg-card rounded-xl p-4 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{new Date(cycle.date).toLocaleDateString()}</span>
                <span className="text-2xl font-bold text-primary">{cycle.score ?? '--'}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Strain Score</span>
                  <div className="font-medium">{cycle.totalStrain ?? '--'}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'workouts' && (
        <div className="space-y-3">
          {data?.workouts.map((workout) => (
            <div key={workout.id} className="bg-card rounded-xl p-4 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">
                  {workout.name ?? 'Workout'}
                </span>
                <span className="text-lg font-bold text-primary">{workout.strain ?? '--'}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {new Date(workout.startTime).toLocaleDateString()}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {workout.durationMs
                  ? `${Math.round(workout.durationMs / 60000)  } min`
                  : '--'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export const Route = createFileRoute('/health')({
  component: HealthPage,
})
