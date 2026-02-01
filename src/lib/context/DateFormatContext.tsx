'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { type DateFormat } from '../db/preferences';
import { useAuth } from '../../routes/__root';

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

export function useDateFormat() {
  const context = useContext(DateFormatContext);
  if (!context) {
    throw new Error('useDateFormat must be used within a DateFormatProvider');
  }
  return context;
}

interface DateFormatProviderProps {
  children: ReactNode;
}

export function DateFormatProvider({ children }: DateFormatProviderProps) {
  const [dateFormat, setDateFormatState] = useState<DateFormat>('dd/mm/yyyy');
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    async function fetchPreferences() {
      if (authLoading || !user) return;
      
      try {
        const res = await fetch('/api/preferences', {
          credentials: 'include',
        });
        if (res.ok) {
          const prefs: { dateFormat?: DateFormat } = await res.json();
          if (prefs.dateFormat) {
            setDateFormatState(prefs.dateFormat);
          }
        }
      } catch {
        console.error('Failed to fetch date format preferences');
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading && user) {
      void fetchPreferences();
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [user, authLoading]);

  const setDateFormat = useCallback(async (format: DateFormat) => {
    setLoading(true);
    try {
      const res = await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ dateFormat: format }),
      });
      if (res.ok) {
        const updatedPrefs: { dateFormat?: DateFormat } = await res.json();
        if (updatedPrefs.dateFormat) {
          setDateFormatState(updatedPrefs.dateFormat);
        }
      }
    } catch (err) {
      console.error('Failed to update date format:', err);
    } finally {
      setLoading(false);
    }
  }, []);

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
        loading,
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
