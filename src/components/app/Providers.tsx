'use client';

import { type ReactNode } from 'react';
import { UserPreferencesProvider, useUnit, useDateFormat, useTheme, useWorkoutPreferences } from '@/lib/context/UserPreferencesContext';
import { StreakProvider, useStreak } from '@/lib/context/StreakContext';

interface AppProvidersProps {
  children: ReactNode;
  userId?: string;
}

export function AppProviders({ children, userId }: AppProvidersProps) {
  return (
    <UserPreferencesProvider userId={userId}>
      <StreakProvider>
        {children}
      </StreakProvider>
    </UserPreferencesProvider>
  );
}

export { UserPreferencesProvider, useUnit, useDateFormat, useTheme, useWorkoutPreferences };
export { StreakProvider, useStreak };
