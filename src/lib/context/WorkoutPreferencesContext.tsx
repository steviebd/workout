'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';

interface WorkoutPreferencesContextType {
  weeklyWorkoutTarget: number;
  setWeeklyWorkoutTarget: (target: number) => Promise<void>;
}

const WorkoutPreferencesContext = createContext<WorkoutPreferencesContextType | null>(null);

export function useWorkoutPreferences() {
  const context = useContext(WorkoutPreferencesContext);
  if (!context) {
    throw new Error('useWorkoutPreferences must be used within a WorkoutPreferencesProvider');
  }
  return context;
}

interface WorkoutPreferencesProviderProps {
  children: ReactNode;
  initialTarget?: number;
  userId?: string;
}

export function WorkoutPreferencesProvider({ children, initialTarget = 3, userId }: WorkoutPreferencesProviderProps) {
  const [weeklyWorkoutTarget, setWeeklyWorkoutTargetState] = useState<number>(initialTarget);

  useEffect(() => {
    async function fetchPreferences() {
      if (!userId) return;
      
      try {
        const res = await fetch('/api/preferences', {
          credentials: 'include',
        });
        if (res.ok) {
          const prefs: { weeklyWorkoutTarget?: number } = await res.json();
          if (prefs.weeklyWorkoutTarget) {
            setWeeklyWorkoutTargetState(prefs.weeklyWorkoutTarget);
          }
        }
      } catch {
        console.error('Failed to fetch workout preferences');
      }
    }

    void fetchPreferences();
  }, [userId]);

  const setWeeklyWorkoutTarget = useCallback(async (target: number) => {
    try {
      const res = await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ weeklyWorkoutTarget: target }),
      });
      if (res.ok) {
        setWeeklyWorkoutTargetState(target);
      }
    } catch (err) {
      console.error('Failed to update weekly workout target:', err);
    }
  }, []);

  return (
    <WorkoutPreferencesContext.Provider
      value={{
        weeklyWorkoutTarget,
        setWeeklyWorkoutTarget,
      }}
    >
      {children}
    </WorkoutPreferencesContext.Provider>
  );
}
