'use client';

import { type ReactNode } from 'react';
import { UnitProvider, useUnit } from '@/lib/context/UnitContext';
import { DateFormatProvider, useDateFormat } from '@/lib/context/DateFormatContext';
import { StreakProvider, useStreak } from '@/lib/context/StreakContext';
import { ThemeProvider, useTheme } from '@/lib/context/ThemeContext';

interface AppProvidersProps {
  children: ReactNode;
  userId?: string;
}

function AppProvidersInner({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <StreakProvider>
        {children}
      </StreakProvider>
    </ThemeProvider>
  );
}

export function AppProviders({ children, userId }: AppProvidersProps) {
  return (
    <UnitProvider userId={userId}>
      <DateFormatProvider userId={userId}>
        <AppProvidersInner>{children}</AppProvidersInner>
      </DateFormatProvider>
    </UnitProvider>
  );
}

export { UnitProvider, useUnit };
export { DateFormatProvider, useDateFormat };

export { StreakProvider, useStreak };

export { ThemeProvider, useTheme };
