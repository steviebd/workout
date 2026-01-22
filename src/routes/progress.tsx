import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './__root';
import { StrengthChart } from '~/components/progress/StrengthChart';
import { WeeklyVolumeChart } from '~/components/progress/WeeklyVolumeChart';
import { ExerciseSelector } from '~/components/progress/ExerciseSelector';
import { PRBoard } from '~/components/progress/PRBoard';
import { DateRangeSelector, type DateRange } from '~/components/progress/DateRangeSelector';
import { VolumeScopeToggle, type VolumeScope } from '~/components/progress/VolumeScopeToggle';
import { Card } from '~/components/ui/Card';

interface Exercise {
  id: string;
  name: string;
}

interface ProgressDataPoint {
  date: string;
  weight: number;
}

interface WeeklyVolume {
  week: string;
  volume: number;
}

interface PersonalRecord {
  id: string;
  exerciseName: string;
  date: string;
  weight: number;
  reps: number;
  previousRecord?: number;
}

interface ProgressData {
  exercises: Exercise[];
  weeklyVolume: WeeklyVolume[];
  strengthData: ProgressDataPoint[];
  recentPRs: PersonalRecord[];
  selectedExerciseId: string | undefined;
  selectedExerciseName: string | null;
}

function ProgressPage() {
  const auth = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [weeklyVolume, setWeeklyVolume] = useState<WeeklyVolume[]>([]);
  const [strengthData, setStrengthData] = useState<ProgressDataPoint[]>([]);
  const [recentPRs, setRecentPRs] = useState<PersonalRecord[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('3m');
  const [volumeScope, setVolumeScope] = useState<VolumeScope>('all');

  const fetchProgress = useCallback(async () => {
    if (!auth.user) return;

    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('dateRange', dateRange);
      params.set('volumeScope', volumeScope);
      if (selectedExerciseId) {
        params.set('exerciseId', selectedExerciseId);
      }

      const response = await fetch(`/api/progress?${params.toString()}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data: ProgressData = await response.json();
        setExercises(data.exercises);
        setWeeklyVolume(data.weeklyVolume);
        setStrengthData(data.strengthData);
        setRecentPRs(data.recentPRs);
        if (!selectedExerciseId && data.exercises.length > 0) {
          setSelectedExerciseId(data.exercises[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch progress:', err);
    } finally {
      setLoading(false);
    }
  }, [auth.user, dateRange, volumeScope, selectedExerciseId]);

  useEffect(() => {
    if (auth.user) {
      void fetchProgress();
    }
  }, [auth.user, fetchProgress]);

  const handleExerciseSelect = useCallback((id: string) => {
    setSelectedExerciseId(id);
  }, []);

  const handleDateRangeChange = useCallback((value: DateRange) => {
    setDateRange(value);
  }, []);

  const handleVolumeScopeChange = useCallback((value: VolumeScope) => {
    setVolumeScope(value);
  }, []);

  const selectedExercise = exercises.find(e => e.id === selectedExerciseId);

  if (auth.loading) {
    return (
      <main className="mx-auto max-w-lg px-4 py-6">
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </main>
    );
  }

  if (!auth.user) {
    return null;
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Progress</h1>
        <DateRangeSelector value={dateRange} onChange={handleDateRangeChange} />
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="h-10 bg-secondary rounded-full animate-pulse" />
          <div className="h-[200px] bg-secondary rounded-lg animate-pulse" />
          <div className="h-[200px] bg-secondary rounded-lg animate-pulse" />
          <div className="h-[200px] bg-secondary rounded-lg animate-pulse" />
        </div>
      ) : exercises.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-muted-foreground">No exercises yet. Create your first exercise to track progress.</p>
        </Card>
      ) : (
        <>
          <ExerciseSelector
            exercises={exercises}
            selectedId={selectedExerciseId}
            onSelect={handleExerciseSelect}
          />

          <div className="mt-6 space-y-6">
            {selectedExercise && strengthData.length > 0 ? (
              <StrengthChart
                data={strengthData}
                exerciseName={selectedExercise.name}
              />
            ) : selectedExercise ? (
              <Card className="p-6 text-center">
                <p className="text-muted-foreground">No workout data yet for {selectedExercise.name}</p>
              </Card>
            ) : null}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-muted-foreground">Weekly Volume</h2>
                <VolumeScopeToggle
                  value={volumeScope}
                  onChange={handleVolumeScopeChange}
                  disabled={exercises.length === 0}
                />
              </div>
              {weeklyVolume.length > 0 ? (
                <WeeklyVolumeChart data={weeklyVolume} />
              ) : (
                <Card className="p-6 text-center">
                  <p className="text-muted-foreground">No volume data for the selected period</p>
                </Card>
              )}
            </div>

            {recentPRs.length > 0 ? (
              <PRBoard records={recentPRs} />
            ) : (
              <Card className="p-6 text-center">
                <p className="text-muted-foreground">No personal records yet. Complete some workouts to set PRs!</p>
              </Card>
            )}
          </div>
        </>
      )}
    </main>
  );
}

export const Route = createFileRoute('/progress')({
  component: ProgressPage,
});
