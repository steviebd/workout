'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useCallback, type ReactNode } from 'react';
import { type WeightUnit } from '../units';

interface PreferencesApiData {
  weightUnit?: WeightUnit;
  dateFormat?: 'dd/mm/yyyy' | 'mm/dd/yyyy';
  weeklyWorkoutTarget?: number;
}

interface UnitContextType {
  weightUnit: WeightUnit;
  setWeightUnit: (unit: WeightUnit) => Promise<void>;
  convertWeight: (weight: number, toUnit?: WeightUnit) => number;
  formatWeight: (weight: number) => string;
  formatVolume: (volumeKg: number) => string;
  loading: boolean;
}

const UnitContext = createContext<UnitContextType | null>(null);

async function fetchPreferences(): Promise<PreferencesApiData> {
  const res = await fetch('/api/preferences', { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch preferences');
  return res.json();
}

export function useUnit() {
  const context = useContext(UnitContext);
  if (!context) {
    throw new Error('useUnit must be used within a UnitProvider');
  }
  return context;
}

interface UnitProviderProps {
  children: ReactNode;
  initialUnit?: WeightUnit;
  userId?: string;
}

export function UnitProvider({ children, initialUnit = 'kg', userId }: UnitProviderProps) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<PreferencesApiData>({
    queryKey: ['preferences'],
    queryFn: fetchPreferences,
    enabled: !!userId,
    staleTime: 60 * 1000,
  });

  const weightUnit = data?.weightUnit ?? initialUnit;

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

  return (
    <UnitContext.Provider
      value={{
        weightUnit,
        setWeightUnit,
        convertWeight,
        formatWeight,
        formatVolume,
        loading: isLoading,
      }}
    >
      {children}
    </UnitContext.Provider>
  );
}
