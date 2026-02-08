import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Dumbbell, ArrowLeft, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react'
import { PageHeader } from '~/components/PageHeader'
import { Card } from '~/components/ui/Card'
import { Button } from '~/components/ui/Button'
import { Input } from '~/components/ui/Input'
import { useToast } from '@/components/ToastProvider'

const LIFTS = [
  { key: 'squat', name: 'Squat', description: 'Back Squat' },
  { key: 'bench', name: 'Bench Press', description: 'Barbell Bench Press' },
  { key: 'deadlift', name: 'Deadlift', description: 'Conventional Deadlift' },
  { key: 'ohp', name: 'Overhead Press', description: 'Standing Overhead Press' },
]

interface LiftTest {
  key: string
  name: string
  description: string
  tested: boolean
  weight: string
}

function OneRMTest() {
  const navigate = useNavigate()
  const toast = useToast()
  const [weightUnit, setWeightUnit] = useState('kg')
  const [lifts, setLifts] = useState<LiftTest[]>(() =>
    LIFTS.map((lift) => ({
      ...lift,
      tested: false,
      weight: '',
    }))
  )
  const [step, setStep] = useState<'intro' | 'select' | 'test' | 'complete'>('intro')
  const [selectedLifts, setSelectedLifts] = useState<Set<string>>(() =>
    new Set(LIFTS.map((l) => l.key))
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    async function loadPreferences() {
      try {
        const response = await fetch('/api/user/preferences')
        if (response.ok) {
          const prefs = await response.json() as { weightUnit?: string };
          setWeightUnit(prefs.weightUnit ?? 'kg')
        }
      } catch (error) {
        console.error('Error loading preferences:', error)
      }
    }
    void loadPreferences()
  }, [])

  const handleLiftToggle = (key: string) => {
    setSelectedLifts((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const handleWeightChange = (key: string, value: string) => {
    setLifts((prev) =>
      prev.map((lift) =>
        lift.key === key ? { ...lift, weight: value, tested: value !== '' } : lift
      )
    )
  }

  const handleSubmit = async () => {
    const testedLifts = lifts.filter((l) => l.tested && l.weight !== '')

    if (testedLifts.length === 0) {
      toast.error('Please enter at least one 1RM')
      return
    }

    setIsSubmitting(true)

    try {
      const workoutResponse = await fetch('/api/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: '1RM Test',
        }),
      })

      if (!workoutResponse.ok) {
        throw new Error('Failed to create workout')
      }

      const workout = await workoutResponse.json() as { id: string };

      for (const lift of testedLifts) {
        const weight = parseFloat(lift.weight)
        if (isNaN(weight)) continue

        const exerciseRes = await fetch(`/api/exercises?search=${encodeURIComponent(lift.name)}`, {
          method: 'GET',
          credentials: 'include',
        })

        if (!exerciseRes.ok) continue

        const exercises = await exerciseRes.json() as Array<{ id: string }>;
        if (exercises.length === 0) continue;

        const exerciseId = exercises[0].id

        const exerciseRes2 = await fetch(`/api/workouts/${workout.id}/exercises`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            exerciseId,
            orderIndex: 0,
            sets: [{ setNumber: 1, weight, reps: 1, isComplete: true }],
          }),
        })

        if (!exerciseRes2.ok) {
          console.error(`Failed to add ${lift.name} to workout`)
        }
      }

      toast.success('1RM test saved!')
      const returnTo = new URLSearchParams(window.location.search).get('returnTo')
      if (returnTo) {
        void navigate({ to: returnTo })
      } else {
        void navigate({ to: '/workouts/$id', params: { id: workout.id } })
      }
    } catch (error) {
      toast.error('Failed to save 1RM test')
      console.error('Error saving 1RM test:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (step === 'intro') {
    return (
      <div className="flex flex-col gap-6 pb-20">
        <PageHeader
          title="Test Your 1RM"
          subtitle="Find your true strength levels"
        />

        <div className="px-4 flex flex-col gap-4">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Dumbbell className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold">What is a 1RM?</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Your One-Rep Max (1RM) is the maximum weight you can lift for a single repetition with proper form.
            </p>
            <div className="flex items-start gap-3 rounded-lg bg-warning/10 p-3 text-warning">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Safety First!</p>
                <p>Always use a spotter for bench press. Test in a safe environment with proper equipment.</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-3">How to Test</h3>
            <ol className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">1</span>
                <span>Warm up with lighter weights (2-3 sets of 5-8 reps)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">2</span>
                <span>Choose a weight you can lift 3-5 times with effort</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">3</span>
                <span>Increase weight gradually until you can only do 1 rep</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">4</span>
                <span>Record that weight as your 1RM</span>
              </li>
            </ol>
          </Card>

          <div className="flex flex-col gap-3 pt-2">
            <Button onClick={() => setStep('select')} className="w-full">
              Start 1RM Test
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button onClick={() => void navigate({ to: '/' })} variant="outline" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Maybe Later
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'select') {
    return (
      <div className="flex flex-col gap-6 pb-20">
        <PageHeader
          title="Select Lifts to Test"
          subtitle="Choose which lifts you want to measure"
        />

        <div className="px-4 flex flex-col gap-4">
          <Card className="p-4">
            <div className="flex flex-col gap-2">
              {lifts.map((lift) => (
                <button
                  key={lift.key}
                  onClick={() => handleLiftToggle(lift.key)}
                  className={`flex items-center justify-between rounded-lg p-3 text-left transition-colors ${
                    selectedLifts.has(lift.key)
                      ? 'bg-primary/10 border border-primary/30'
                      : 'bg-secondary/30 border border-transparent hover:bg-secondary/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded border ${
                        selectedLifts.has(lift.key)
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'border-muted-foreground'
                      }`}
                    >
                      {selectedLifts.has(lift.key) && <CheckCircle2 className="h-3 w-3" />}
                    </div>
                    <div>
                      <p className="font-medium">{lift.name}</p>
                      <p className="text-xs text-muted-foreground">{lift.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <div className="flex flex-col gap-3 pt-2">
            <Button
              onClick={() => {
                setLifts(
                  lifts.map((l) =>
                    selectedLifts.has(l.key)
                      ? { ...l, weight: '', tested: false }
                      : { ...l, weight: '', tested: false }
                  )
                )
                setStep('test')
              }}
              disabled={selectedLifts.size === 0}
              className="w-full"
            >
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button onClick={() => setStep('intro')} variant="outline" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'test') {
    const testedCount = lifts.filter((l) => selectedLifts.has(l.key) && l.tested).length
    const totalToTest = lifts.filter((l) => selectedLifts.has(l.key)).length

    return (
      <div className="flex flex-col gap-6 pb-20">
        <PageHeader
          title="Enter Your Results"
          subtitle={`${testedCount}/${totalToTest} lifts recorded`}
        />

        <div className="px-4 flex flex-col gap-4">
          {lifts
            .filter((l) => selectedLifts.has(l.key))
            .map((lift) => (
              <Card key={lift.key} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium">{lift.name}</h4>
                    <p className="text-xs text-muted-foreground">{lift.description}</p>
                  </div>
                  {lift.tested ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : null}
                </div>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    step="0.5"
                    placeholder={`Weight in ${weightUnit}`}
                    value={lift.weight}
                    onChange={(e) => handleWeightChange(lift.key, e.target.value)}
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground w-8">{weightUnit}</span>
                </div>
              </Card>
            ))}

          <div className="flex flex-col gap-3 pt-2">
            <Button
              onClick={() => void handleSubmit()}
              disabled={testedCount === 0 || isSubmitting}
              className="w-full"
            >
              {isSubmitting ? 'Saving...' : 'Save Results'}
            </Button>
            <Button
              onClick={() => setStep('select')}
              variant="outline"
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return null
}

export const Route = createFileRoute('/1rm-test')({
  component: OneRMTest,
})

export default OneRMTest
