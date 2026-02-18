'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from 'react';
import { type WeightUnit, type DateFormat, type Theme } from '../db/preferences';

interface PreferencesApiData {
  weightUnit?: WeightUnit;
  dateFormat?: DateFormat;
  theme?: Theme;
  weeklyWorkoutTarget?: number;
}

interface UserPreferencesContextType {
  weightUnit: WeightUnit;
  setWeightUnit: (unit: WeightUnit) => Promise<void>;
  convertWeight: (weight: number, toUnit?: WeightUnit) => number;
  formatWeight: (weight: number) => string;
  formatVolume: (volumeKg: number) => string;
  dateFormat: DateFormat;
  setDateFormat: (format: DateFormat) => Promise<void>;
  formatDate: (dateString: string) => string;
  formatDateShort: (dateString: string) => string;
  formatDateLong: (dateString: string) => string;
  formatDateTimeLong: (dateString: string) => string;
  theme: Theme | 'system';
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme | 'system') => void;
  weeklyWorkoutTarget: number;
  setWeeklyWorkoutTarget: (target: number) => Promise<void>;
  loading: boolean;
}

const UserPreferencesContext = createContext<UserPreferencesContextType | null>(null);

async function fetchPreferences(): Promise<PreferencesApiData> {
  const res = await fetch('/api/preferences', { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch preferences');
  return res.json();
}

export function useUserPreferences() {
  const context = useContext(UserPreferencesContext);
  if (!context) {
    throw new Error('useUserPreferences must be used within a UserPreferencesProvider');
  }
  return context;
}

export function useUnit() {
  const { weightUnit, setWeightUnit, convertWeight, formatWeight, formatVolume, loading } = useUserPreferences();
  return { weightUnit, setWeightUnit, convertWeight, formatWeight, formatVolume, loading };
}

export function useDateFormat() {
  const { dateFormat, setDateFormat, formatDate, formatDateShort, formatDateLong, formatDateTimeLong, loading } = useUserPreferences();
  return { dateFormat, setDateFormat, formatDate, formatDateShort, formatDateLong, formatDateTimeLong, loading };
}

export function useTheme() {
  const { theme, resolvedTheme, setTheme } = useUserPreferences();
  return { theme, resolvedTheme, setTheme };
}

export function useWorkoutPreferences() {
  const { weeklyWorkoutTarget, setWeeklyWorkoutTarget } = useUserPreferences();
  return { weeklyWorkoutTarget, setWeeklyWorkoutTarget };
}

interface UserPreferencesProviderProps {
  children: ReactNode;
  initialUnit?: WeightUnit;
  userId?: string;
}

export function UserPreferencesProvider({ children, initialUnit = 'kg', userId }: UserPreferencesProviderProps) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<PreferencesApiData>({
    queryKey: ['preferences'],
    queryFn: fetchPreferences,
    enabled: !!userId,
    staleTime: 60 * 1000,
  });

  const weightUnit = data?.weightUnit ?? initialUnit;
  const dateFormat = data?.dateFormat ?? 'dd/mm/yyyy';
  const weeklyWorkoutTarget = data?.weeklyWorkoutTarget ?? 3;

  const [theme, setThemeState] = useState<Theme | 'system'>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme') as Theme | 'system' | null;
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system')) {
      setThemeState(savedTheme);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    let resolved: 'light' | 'dark';

    if (theme === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      resolved = theme;
    }

    setResolvedTheme(resolved);
    root.classList.remove('light', 'dark');
    root.classList.add(resolved);
    localStorage.setItem('theme', theme);
  }, [theme, mounted]);

  useEffect(() => {
    if (!mounted || theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const resolved = mediaQuery.matches ? 'dark' : 'light';
      setResolvedTheme(resolved);
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(resolved);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, mounted]);

  const setWeightUnit = useCallback(async (unit: WeightUnit) => {
    try {
      const res = await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ weightUnit: unit }),
      });
      if (res.ok) {
        queryClient.setQueryData<PreferencesApiData>(['preferences'], (old) => ({
          ...old,
          weightUnit: unit,
        }));
      }
    } catch (err) {
      console.error('Failed to update weight unit:', err);
    }
  }, [queryClient]);

  const setDateFormat = useCallback(async (format: DateFormat) => {
    try {
      const res = await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ dateFormat: format }),
      });
      if (res.ok) {
        queryClient.setQueryData<PreferencesApiData>(['preferences'], (old) => ({
          ...old,
          dateFormat: format,
        }));
      }
    } catch (err) {
      console.error('Failed to update date format:', err);
    }
  }, [queryClient]);

  const setWeeklyWorkoutTarget = useCallback(async (target: number) => {
    try {
      const res = await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ weeklyWorkoutTarget: target }),
      });
      if (res.ok) {
        queryClient.setQueryData<PreferencesApiData>(['preferences'], (old) => ({
          ...old,
          weeklyWorkoutTarget: target,
        }));
      }
    } catch (err) {
      console.error('Failed to update weekly workout target:', err);
    }
  }, [queryClient]);

  const setTheme = useCallback((newTheme: Theme | 'system') => {
    setThemeState(newTheme);
  }, []);

  const convertWeight = useCallback((weight: number, toUnit?: WeightUnit): number => {
    const target = toUnit ?? weightUnit;
    if (target === 'lbs') {
      return weight * 2.20462;
    }
    return weight;
  }, [weightUnit]);

  const formatWeight = useCallback((weight: number): string => {
    const converted = weightUnit === 'lbs' ? weight * 2.20462 : weight;
    return `${converted.toFixed(1)} ${weightUnit}`;
  }, [weightUnit]);

  const formatVolume = useCallback((volumeKg: number): string => {
    const converted = weightUnit === 'lbs' ? volumeKg * 2.20462 : volumeKg;
    const formatted = new Intl.NumberFormat('en-US').format(Math.round(converted));
    return `${formatted} ${weightUnit}`;
  }, [weightUnit]);

  const formatDate = useCallback((dateString: string): string => {
    const date = new Date(dateString);
    if (dateFormat === 'dd/mm/yyyy') {
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
      });
    }
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: '2-digit',
    });
  }, [dateFormat]);

  const formatDateShort = useCallback((dateString: string): string => {
    const date = new Date(dateString);
    if (dateFormat === 'dd/mm/yyyy') {
      return date.toLocaleDateString('en-GB', {
        month: 'short',
        day: 'numeric',
      });
    }
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }, [dateFormat]);

  const formatDateLong = useCallback((dateString: string): string => {
    const date = new Date(dateString);
    if (dateFormat === 'dd/mm/yyyy') {
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    }
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: '2-digit',
      year: 'numeric',
    });
  }, [dateFormat]);

  const formatDateTimeLong = useCallback((dateString: string): string => {
    const date = new Date(dateString);
    if (dateFormat === 'dd/mm/yyyy') {
      return date.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [dateFormat]);

  return (
    <UserPreferencesContext.Provider
      value={{
        weightUnit,
        setWeightUnit,
        convertWeight,
        formatWeight,
        formatVolume,
        dateFormat,
        setDateFormat,
        formatDate,
        formatDateShort,
        formatDateLong,
        formatDateTimeLong,
        theme,
        resolvedTheme,
        setTheme,
        weeklyWorkoutTarget,
        setWeeklyWorkoutTarget,
        loading: isLoading,
      }}
    >
      {children}
    </UserPreferencesContext.Provider>
  );
}
