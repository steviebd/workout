'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface StreakContextValue {
  currentStreak: number;
  longestStreak: number;
  weeklyWorkouts: number;
  totalWorkouts: number;
  loading: boolean;
  refetch: () => Promise<void>;
}

const StreakContext = createContext<StreakContextValue | null>(null);

export function StreakProvider({ children, workosId }: { children: ReactNode; workosId: string }) {
  const [data, setData] = useState<StreakContextValue>({
    currentStreak: 0,
    longestStreak: 0,
    weeklyWorkouts: 0,
    totalWorkouts: 0,
    loading: true,
    refetch: async () => {},
  });

  const fetchStreak = useCallback(async () => {
    try {
      const response = await fetch(`/api/streaks?workosId=${workosId}`);
      if (response.ok) {
        const streakData: StreakContextValue = await response.json();
        setData({ ...streakData, loading: false });
      }
    } catch (error) {
      console.error('Failed to fetch streak:', error);
      setData(prev => ({ ...prev, loading: false }));
    }
  }, [workosId]);

  useEffect(() => {
    if (workosId) {
      void fetchStreak();
    }
  }, [workosId, fetchStreak]);

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
      currentStreak: 0,
      longestStreak: 0,
      weeklyWorkouts: 0,
      totalWorkouts: 0,
      loading: true,
      refetch: async () => {},
    };
  }
  return context;
}
