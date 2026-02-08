'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useCallback, ReactNode } from 'react';

export interface WeeklyWorkoutCount {
  weekStart: string;
  count: number;
  meetsTarget: boolean;
}

export interface ThirtyDayStreakResult {
  current: number;
  target: number;
  progress: number;
  maxConsecutive: number;
  weeklyDetails: WeeklyWorkoutCount[];
}

interface StreakApiData {
  weeklyCount: number;
  weeklyTarget: number;
  thirtyDayStreak: ThirtyDayStreakResult;
  totalWorkouts: number;
  rolling30Days: number;
}

export interface StreakContextValue {
  weeklyCount: number;
  weeklyTarget: number;
  thirtyDayStreak: ThirtyDayStreakResult;
  totalWorkouts: number;
  rolling30Days: number;
  loading: boolean;
  refetch: () => Promise<void>;
}

const StreakContext = createContext<StreakContextValue | null>(null);

async function fetchStreakData(): Promise<StreakApiData> {
  const response = await fetch('/api/streaks', { credentials: 'include' });
  if (!response.ok) throw new Error('Failed to fetch streak');
  return response.json();
}

export function StreakProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<StreakApiData>({
    queryKey: ['streak'],
    queryFn: fetchStreakData,
    staleTime: 5 * 60 * 1000,
  });

  const refetch = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['streak'] });
  }, [queryClient]);

  const value: StreakContextValue = {
    weeklyCount: data?.weeklyCount ?? 0,
    weeklyTarget: data?.weeklyTarget ?? 3,
    thirtyDayStreak: data?.thirtyDayStreak ?? {
      current: 0,
      target: 4,
      progress: 0,
      maxConsecutive: 0,
      weeklyDetails: [],
    },
    totalWorkouts: data?.totalWorkouts ?? 0,
    rolling30Days: data?.rolling30Days ?? 0,
    loading: isLoading,
    refetch,
  };

  return (
    <StreakContext.Provider value={value}>
      {children}
    </StreakContext.Provider>
  );
}

export function useStreak() {
  const context = useContext(StreakContext);
  if (!context) {
    return {
      weeklyCount: 0,
      weeklyTarget: 3,
      thirtyDayStreak: {
        current: 0,
        target: 4,
        progress: 0,
        maxConsecutive: 0,
        weeklyDetails: [],
      },
      totalWorkouts: 0,
      rolling30Days: 0,
      loading: true,
      refetch: async () => {},
    };
  }
  return context;
}
