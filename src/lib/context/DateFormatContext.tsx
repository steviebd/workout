'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useCallback, type ReactNode } from 'react';
import { type DateFormat } from '../db/preferences';
import { type WeightUnit } from '../units';

interface PreferencesApiData {
  weightUnit?: WeightUnit;
  dateFormat?: DateFormat;
  weeklyWorkoutTarget?: number;
}

interface DateFormatContextType {
  dateFormat: DateFormat;
  loading: boolean;
  setDateFormat: (format: DateFormat) => Promise<void>;
  formatDate: (dateString: string) => string;
  formatDateShort: (dateString: string) => string;
  formatDateLong: (dateString: string) => string;
  formatDateTimeLong: (dateString: string) => string;
}

const DateFormatContext = createContext<DateFormatContextType | null>(null);

async function fetchPreferences(): Promise<PreferencesApiData> {
  const res = await fetch('/api/preferences', { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch preferences');
  return res.json();
}

export function useDateFormat() {
  const context = useContext(DateFormatContext);
  if (!context) {
    throw new Error('useDateFormat must be used within a DateFormatProvider');
  }
  return context;
}

interface DateFormatProviderProps {
  children: ReactNode;
  userId?: string;
}

export function DateFormatProvider({ children, userId }: DateFormatProviderProps) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<PreferencesApiData>({
    queryKey: ['preferences'],
    queryFn: fetchPreferences,
    enabled: !!userId,
    staleTime: 60 * 1000,
  });

  const dateFormat = data?.dateFormat ?? 'dd/mm/yyyy';

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
    <DateFormatContext.Provider
      value={{
        dateFormat,
        loading: isLoading,
        setDateFormat,
        formatDate,
        formatDateShort,
        formatDateLong,
        formatDateTimeLong,
      }}
    >
      {children}
    </DateFormatContext.Provider>
  );
}
