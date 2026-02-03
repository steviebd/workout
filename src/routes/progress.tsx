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
import { Skeleton } from '~/components/ui/Skeleton';

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

function ProgressPage() {
  const auth = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [weeklyVolume, setWeeklyVolume] = useState<WeeklyVolume[]>([]);
  const [strengthData, setStrengthData] = useState<ProgressDataPoint[]>([]);
  const [recentPRs, setRecentPRs] = useState<PersonalRecord[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange>('3m');
  const [volumeScope, setVolumeScope] = useState<VolumeScope>('all');
  const [isLoadingExercises, setIsLoadingExercises] = useState(true);
  const [isLoadingStrength, setIsLoadingStrength] = useState(false);
  const [isLoadingVolume, setIsLoadingVolume] = useState(false);
  const [isLoadingPRs, setIsLoadingPRs] = useState(false);

  const fetchAllData = useCallback(async (exerciseId?: string) => {
    if (!auth.user) return;

    const id = exerciseId ?? selectedExerciseId;

    try {
      setIsLoadingExercises(true);
      setIsLoadingStrength(true);
      setIsLoadingVolume(true);
      setIsLoadingPRs(true);

      const [exercisesRes, strengthRes, volumeRes, prsRes] = await Promise.all([
        fetch('/api/exercises', { credentials: 'include' }),
        id ? fetch(`/api/progress/strength?dateRange=${dateRange}&exerciseId=${id}`, { credentials: 'include' }) : Promise.resolve(null),
        fetch(`/api/progress/volume?dateRange=${dateRange}&volumeScope=${volumeScope}${selectedExerciseId ? `&exerciseId=${selectedExerciseId}` : ''}`, { credentials: 'include' }),
        fetch(`/api/progress/prs?dateRange=${dateRange}`, { credentials: 'include' }),
      ]);

      if (exercisesRes.ok) {
        const data: Exercise[] = await exercisesRes.json();
        setExercises(data);
        if (data.length > 0 && !selectedExerciseId && !id) {
          setSelectedExerciseId(data[0].id);
        }
      }

      if (strengthRes?.ok) {
        const data: { strengthData: ProgressDataPoint[] } = await strengthRes.json();
        setStrengthData(data.strengthData);
      }

      if (volumeRes.ok) {
        const data: { weeklyVolume: WeeklyVolume[] } = await volumeRes.json();
        setWeeklyVolume(data.weeklyVolume);
      }

      if (prsRes.ok) {
        const data: { recentPRs: PersonalRecord[] } = await prsRes.json();
        setRecentPRs(data.recentPRs);
      }
    } catch (err) {
      console.error('Failed to fetch progress data:', err);
    } finally {
      setIsLoadingExercises(false);
      setIsLoadingStrength(false);
      setIsLoadingVolume(false);
      setIsLoadingPRs(false);
    }
  }, [auth.user, dateRange, volumeScope, selectedExerciseId]);

  useEffect(() => {
    if (auth.user) {
      void fetchAllData();
    }
  }, [auth.user, fetchAllData]);

  useEffect(() => {
    if (auth.user && exercises.length > 0 && !selectedExerciseId) {
      setSelectedExerciseId(exercises[0].id);
    }
  }, [exercises, selectedExerciseId, auth.user]);

  useEffect(() => {
    if (auth.user) {
      void fetchAllData();
    }
  }, [dateRange, volumeScope, auth.user, fetchAllData]);

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

      {isLoadingExercises ? (
        <div className="space-y-6">
          <div className="h-10 bg-secondary rounded-full animate-pulse" />
          <Skeleton className="h-[200px] rounded-lg" />
          <Skeleton className="h-[200px] rounded-lg" />
          <Skeleton className="h-[200px] rounded-lg" />
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
            {isLoadingStrength ? (
              <Skeleton className="h-[200px] rounded-lg" />
            ) : strengthData.length > 0 ? (
              <StrengthChart
                data={strengthData}
                exerciseName={selectedExercise?.name ?? ''}
              />
            ) : (
              <Card className="p-6 text-center">
                <p className="text-muted-foreground">
                  No workout data yet for {selectedExercise?.name ?? 'selected exercise'}
                </p>
              </Card>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-muted-foreground">Weekly Volume</h2>
                <VolumeScopeToggle
                  value={volumeScope}
                  onChange={handleVolumeScopeChange}
                  disabled={exercises.length === 0}
                />
              </div>
              {isLoadingVolume ? (
                <Skeleton className="h-[200px] rounded-lg" />
              ) : weeklyVolume.length > 0 ? (
                <WeeklyVolumeChart data={weeklyVolume} />
              ) : (
                <Card className="p-6 text-center">
                  <p className="text-muted-foreground">No volume data for the selected period</p>
                </Card>
              )}
            </div>

            {isLoadingPRs ? (
              <Skeleton className="h-[200px] rounded-lg" />
            ) : recentPRs.length > 0 ? (
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
