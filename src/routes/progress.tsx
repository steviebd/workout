import { createFileRoute } from '@tanstack/react-router'
import { StrengthChart } from '~/components/progress/StrengthChart'
import { WeeklyVolumeChart } from '~/components/progress/WeeklyVolumeChart'
import { ExerciseSelector } from '~/components/progress/ExerciseSelector'
import { PRBoard } from '~/components/progress/PRBoard'

const mockExercises = [
  { id: '1', name: 'Bench Press' },
  { id: '2', name: 'Squat' },
  { id: '3', name: 'Deadlift' },
  { id: '4', name: 'Overhead Press' },
  { id: '5', name: 'Pull-ups' },
]

const mockStrengthData = [
  { date: '2024-01-01', weight: 135 },
  { date: '2024-01-08', weight: 140 },
  { date: '2024-01-15', weight: 145 },
  { date: '2024-01-22', weight: 150 },
  { date: '2024-01-29', weight: 155 },
]

const mockVolumeData = [
  { week: 'Week 1', volume: 12000 },
  { week: 'Week 2', volume: 15000 },
  { week: 'Week 3', volume: 13500 },
  { week: 'Week 4', volume: 18000 },
]

const mockPRs = [
  { id: '1', exerciseName: 'Bench Press', date: '2024-01-29', weight: 155, reps: 5, previousRecord: 150 },
  { id: '2', exerciseName: 'Squat', date: '2024-01-27', weight: 225, reps: 3 },
  { id: '3', exerciseName: 'Deadlift', date: '2024-01-25', weight: 315, reps: 1, previousRecord: 295 },
]

function ProgressPage() {
  function handleSelect() {
    // Placeholder handler
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Progress</h1>
        
        <ExerciseSelector
          exercises={mockExercises}
          selectedId="1"
          onSelect={handleSelect}
        />
        
        <div className="mt-6 space-y-6">
          <StrengthChart data={mockStrengthData} exerciseName="Bench Press" />
          
          <WeeklyVolumeChart data={mockVolumeData} />
          
          <PRBoard records={mockPRs} />
        </div>
    </main>
  )
}

export const Route = createFileRoute('/progress')({
  component: ProgressPage,
})
