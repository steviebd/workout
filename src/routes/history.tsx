import { createFileRoute } from '@tanstack/react-router'
import { Clock, Calendar } from 'lucide-react'
import { Card, CardContent } from '~/components/ui/Card'
import { useUnit } from '@/lib/context/UnitContext'

const mockWorkouts = [
  {
    id: '1',
    name: 'Upper Body Power',
    date: '2024-01-29',
    duration: 45,
    volume: 12500,
    exercises: ['Bench Press', 'Pull-ups', 'Overhead Press'],
  },
  {
    id: '2',
    name: 'Leg Day',
    date: '2024-01-27',
    duration: 60,
    volume: 18000,
    exercises: ['Squat', 'Deadlift', 'Lunges'],
  },
  {
    id: '3',
    name: 'Push Day',
    date: '2024-01-25',
    duration: 40,
    volume: 10000,
    exercises: ['Bench Press', 'Overhead Press', 'Tricep Pushdowns'],
  },
]

function HistoryPage() {
  const { formatVolume } = useUnit()

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Workout History</h1>
        
        <div className="space-y-4">
          {mockWorkouts.map((workout) => (
            <Card key={workout.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{workout.name}</h3>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(workout.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {workout.duration} min
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-accent">
                      {formatVolume(workout.volume)}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Volume</p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-1.5">
                  {workout.exercises.map((exercise) => (
                    <span
                      key={exercise}
                      className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground"
                    >
                      {exercise}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
    </main>
  )
}

export const Route = createFileRoute('/history')({
  component: HistoryPage,
})
