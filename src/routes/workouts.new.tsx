'use client'

import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Plus, Search, Loader2, ChevronLeft, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from './__root'
import { Button } from '~/components/ui/Button'
import { Input } from '~/components/ui/Input'
import { Card, CardContent } from '~/components/ui/Card'
import { useToast } from '~/components/app/ToastProvider'

interface Exercise {
  id: string
  name: string
  muscleGroup: string | null
}

function BuildWorkoutPage() {
  const auth = useAuth()
  const router = useRouter()
  const toast = useToast()
  
  const [workoutName, setWorkoutName] = useState('')
  const [exerciseSearch, setExerciseSearch] = useState('')
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([])
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showCreateExercise, setShowCreateExercise] = useState(false)
  const [newExercise, setNewExercise] = useState({ name: '', muscleGroup: '' })
  const [creatingExercise, setCreatingExercise] = useState(false)
  const [errors, setErrors] = useState<{ name?: string }>({})

  const MUSCLE_GROUPS = [
    'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Forearms',
    'Core', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Full Body', 'Cardio', 'Other'
  ] as const

  const fetchExercises = useCallback(async () => {
    try {
      const url = exerciseSearch
        ? `/api/exercises?search=${encodeURIComponent(exerciseSearch)}`
        : '/api/exercises'
      const res = await fetch(url, { credentials: 'include' })
      if (res.ok) {
        const data: Exercise[] = await res.json()
        setAvailableExercises(data.filter(e => !selectedExercises.some(se => se.id === e.id)))
      }
    } catch (error) {
      console.error('Failed to fetch exercises:', error)
    }
  }, [exerciseSearch, selectedExercises])

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      window.location.href = '/auth/signin'
      return
    }

    if (auth.user) {
      setLoading(false)
      void fetchExercises()
    }
  }, [auth.loading, auth.user, fetchExercises])

  const handleAddExercise = useCallback((exercise: Exercise) => {
    setSelectedExercises(prev => [...prev, exercise])
    setAvailableExercises(prev => prev.filter(e => e.id !== exercise.id))
    setExerciseSearch('')
  }, [])

  const handleRemoveExercise = useCallback((exerciseId: string) => {
    const exercise = selectedExercises.find(e => e.id === exerciseId)
    if (exercise) {
      setSelectedExercises(prev => prev.filter(e => e.id !== exerciseId))
      setAvailableExercises(prev => [...prev, exercise])
    }
  }, [selectedExercises])

  const handleCreateExercise = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    if (!newExercise.name.trim()) {
      setErrors({ name: 'Name is required' })
      return
    }
    if (!newExercise.muscleGroup) {
      setErrors({ name: 'Muscle group is required' })
      return
    }

    setCreatingExercise(true)

    try {
      const response = await fetch('/api/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newExercise.name,
          muscleGroup: newExercise.muscleGroup,
        }),
      })

      if (response.ok) {
        const exercise: Exercise = await response.json()
        handleAddExercise(exercise)
        setShowCreateExercise(false)
        setNewExercise({ name: '', muscleGroup: '' })
        toast.success('Exercise created')
      } else {
        const data: { error?: string } = await response.json()
        toast.error(data.error ?? 'Failed to create exercise')
      }
    } catch {
      toast.error('Failed to create exercise')
    } finally {
      setCreatingExercise(false)
    }
  }, [newExercise, handleAddExercise, toast])

  const handleStartWorkout = useCallback(async () => {
    if (!workoutName.trim()) {
      toast.error('Please enter a workout name')
      return
    }

    if (selectedExercises.length === 0) {
      toast.error('Please add at least one exercise')
      return
    }

    setCreating(true)

    try {
      const res = await fetch('/api/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: workoutName.trim(),
          exerciseIds: selectedExercises.map(e => e.id),
        }),
      })

      if (res.ok) {
        const workout: { id: string } = await res.json()
        await router.navigate({ to: '/workouts/$id', params: { id: workout.id } })
      } else {
        const data: { error?: string } = await res.json()
        toast.error(data.error ?? 'Failed to create workout')
      }
    } catch {
      toast.error('Failed to create workout')
    } finally {
      setCreating(false)
    }
  }, [workoutName, selectedExercises, router, toast])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-6 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.history.back()}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Build Workout</h1>
      </div>

      <div className="space-y-6">
        <div>
          <label htmlFor="workout-name" className="block text-sm font-medium mb-2">Workout Name</label>
          <Input
            id="workout-name"
            value={workoutName}
            onChange={(e) => setWorkoutName(e.target.value)}
            placeholder="e.g., Push Day, Leg Day, Full Body"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="block text-sm font-medium">Exercises</span>
            <span className="text-sm text-muted-foreground">{selectedExercises.length} added</span>
          </div>

          {selectedExercises.length > 0 && (
            <div className="space-y-2 mb-4">
              {selectedExercises.map((exercise, index) => (
                <Card key={exercise.id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground w-6">
                        {index + 1}.
                      </span>
                      <div>
                        <p className="font-medium">{exercise.name}</p>
                        {exercise.muscleGroup ? <p className="text-xs text-muted-foreground">{exercise.muscleGroup}</p> : null}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveExercise(exercise.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              className="pl-10"
              value={exerciseSearch}
              onChange={(e) => setExerciseSearch(e.target.value)}
              placeholder="Search exercises..."
            />
          </div>

          {exerciseSearch && availableExercises.length > 0 ? <div className="mt-2 border rounded-lg divide-y max-h-60 overflow-auto">
              {availableExercises.slice(0, 8).map((exercise) => (
                <button
                  key={exercise.id}
                  onClick={() => handleAddExercise(exercise)}
                  className="w-full p-3 text-left hover:bg-secondary transition-colors flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium">{exercise.name}</p>
                    {exercise.muscleGroup ? <p className="text-xs text-muted-foreground">{exercise.muscleGroup}</p> : null}
                  </div>
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
                                                             </div> : null}

          {exerciseSearch && availableExercises.length === 0 ? <div className="mt-2 p-4 border rounded-lg text-center">
              <p className="text-muted-foreground mb-3">No exercises found</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCreateExercise(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create "{exerciseSearch}"
              </Button>
                                                               </div> : null}

          {!exerciseSearch && selectedExercises.length === 0 && (
            <p className="mt-2 text-sm text-muted-foreground text-center">
              Search for exercises to add to your workout
            </p>
          )}
        </div>

        {showCreateExercise ? <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-medium">Create New Exercise</h3>
            <div>
              <label htmlFor="exercise-name" className="block text-sm font-medium mb-1">Name</label>
              <Input
                id="exercise-name"
                value={newExercise.name}
                onChange={(e) => setNewExercise(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Exercise name"
              />
              {errors.name ? <p className="text-sm text-destructive mt-1">{errors.name}</p> : null}
            </div>
            <div>
              <label htmlFor="muscle-group" className="block text-sm font-medium mb-1">Muscle Group</label>
              <select
                id="muscle-group"
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
                value={newExercise.muscleGroup}
                onChange={(e) => setNewExercise(prev => ({ ...prev, muscleGroup: e.target.value }))}
              >
                <option value="">Select muscle group</option>
                {MUSCLE_GROUPS.map((group) => (
                  <option key={group} value={group}>{group}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateExercise(false)
                  setNewExercise({ name: '', muscleGroup: '' })
                }}
                disabled={creatingExercise}
              >
                Cancel
              </Button>
              <Button
                onClick={(e) => { e.preventDefault(); void handleCreateExercise(e); }}
                disabled={creatingExercise}
              >
                {creatingExercise ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create
                  </>
                )}
              </Button>
            </div>
                              </div> : null}

        <Button
          className="w-full"
          size="lg"
          onClick={() => { void handleStartWorkout(); }}
          disabled={creating || !workoutName.trim() || selectedExercises.length === 0}
        >
          {creating ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Plus className="h-5 w-5 mr-2" />
              Start Workout
            </>
          )}
        </Button>
      </div>
    </main>
  )
}

export const Route = createFileRoute('/workouts/new')({
  component: BuildWorkoutPage,
})
