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

  const fetchExercises = useCallback(async () => {
    if (!auth.user) return;

    try {
      setIsLoadingExercises(true);
      const response = await fetch('/api/exercises', {
        credentials: 'include',
      });

      if (response.ok) {
        const data: Exercise[] = await response.json();
        setExercises(data);
        if (data.length > 0 && !selectedExerciseId) {
          setSelectedExerciseId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch exercises:', err);
    } finally {
      setIsLoadingExercises(false);
    }
  }, [auth.user, selectedExerciseId]);

  const fetchStrengthData = useCallback(async (exerciseId: string) => {
    if (!auth.user || !exerciseId) return;

    setStrengthData([]);
    setIsLoadingStrength(true);

    try {
      const params = new URLSearchParams();
      params.set('dateRange', dateRange);
      params.set('exerciseId', exerciseId);

      const response = await fetch(`/api/progress/strength?${params.toString()}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data: { strengthData: ProgressDataPoint[] } = await response.json();
        setStrengthData(data.strengthData);
      }
    } catch (err) {
      console.error('Failed to fetch strength data:', err);
    } finally {
      setIsLoadingStrength(false);
    }
  }, [auth.user, dateRange]);

  const fetchVolumeData = useCallback(async () => {
    if (!auth.user) return;

    setIsLoadingVolume(true);

    try {
      const params = new URLSearchParams();
      params.set('dateRange', dateRange);
      params.set('volumeScope', volumeScope);
      if (selectedExerciseId) {
        params.set('exerciseId', selectedExerciseId);
      }

      const response = await fetch(`/api/progress/volume?${params.toString()}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data: { weeklyVolume: WeeklyVolume[] } = await response.json();
        setWeeklyVolume(data.weeklyVolume);
      }
    } catch (err) {
      console.error('Failed to fetch volume data:', err);
    } finally {
      setIsLoadingVolume(false);
    }
  }, [auth.user, dateRange, volumeScope, selectedExerciseId]);

  const fetchPRs = useCallback(async () => {
    if (!auth.user) return;

    setIsLoadingPRs(true);

    try {
      const params = new URLSearchParams();
      params.set('dateRange', dateRange);

      const response = await fetch(`/api/progress/prs?${params.toString()}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data: { recentPRs: PersonalRecord[] } = await response.json();
        setRecentPRs(data.recentPRs);
      }
    } catch (err) {
      console.error('Failed to fetch PRs:', err);
    } finally {
      setIsLoadingPRs(false);
    }
  }, [auth.user, dateRange]);

  useEffect(() => {
    if (auth.user) {
      void fetchExercises();
      void fetchVolumeData();
      void fetchPRs();
    }
  }, [auth.user, fetchExercises, fetchVolumeData, fetchPRs]);

  useEffect(() => {
    if (selectedExerciseId) {
      void fetchStrengthData(selectedExerciseId);
    }
  }, [selectedExerciseId, fetchStrengthData]);

  useEffect(() => {
    if (auth.user && exercises.length > 0 && !selectedExerciseId) {
      setSelectedExerciseId(exercises[0].id);
    }
  }, [exercises, selectedExerciseId, auth.user, fetchExercises, fetchPRs, fetchVolumeData]);

  useEffect(() => {
    if (auth.user) {
      void fetchVolumeData();
      void fetchStrengthData(selectedExerciseId);
      void fetchPRs();
    }
  }, [dateRange, volumeScope, auth.user, fetchVolumeData, fetchStrengthData, fetchPRs, selectedExerciseId]);

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
