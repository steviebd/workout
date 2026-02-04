'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

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

export function StreakProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<StreakContextValue>({
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
  });

  const fetchStreak = useCallback(async () => {
    try {
      const response = await fetch('/api/streaks', { credentials: 'include' });
      
      if (response.ok) {
        const streakData = await response.json() as { currentStreak: number; longestStreak: number };
        setData(prev => ({ ...prev, ...streakData, loading: false }));
      } else {
        setData(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error('Failed to fetch streak:', error);
      setData(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    void fetchStreak();
  }, [fetchStreak]);

  return (
    <StreakContext.Provider value={{ ...data, refetch: fetchStreak }}>
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
