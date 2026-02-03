'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { type WeightUnit } from '../units';

interface UnitContextType {
  weightUnit: WeightUnit;
  setWeightUnit: (unit: WeightUnit) => Promise<void>;
  convertWeight: (weight: number, toUnit?: WeightUnit) => number;
  formatWeight: (weight: number) => string;
  formatVolume: (volumeKg: number) => string;
}

const UnitContext = createContext<UnitContextType | null>(null);

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
  const [weightUnit, setWeightUnitState] = useState<WeightUnit>(initialUnit);

  useEffect(() => {
    async function fetchPreferences() {
      if (!userId) return;
      
      try {
        const res = await fetch('/api/preferences', {
          credentials: 'include',
        });
        if (res.ok) {
          const prefs: { weightUnit?: WeightUnit } = await res.json();
          if (prefs.weightUnit) {
            setWeightUnitState(prefs.weightUnit);
          }
        }
      } catch {
        console.error('Failed to fetch unit preferences');
      }
    }

    void fetchPreferences();
  }, [userId]);

  const setWeightUnit = useCallback(async (unit: WeightUnit) => {
    try {
      const res = await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ weightUnit: unit }),
      });
      if (res.ok) {
        setWeightUnitState(unit);
      }
    } catch (err) {
      console.error('Failed to update weight unit:', err);
    }
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

  return (
    <UnitContext.Provider
      value={{
        weightUnit,
        setWeightUnit,
        convertWeight,
        formatWeight,
        formatVolume,
      }}
    >
      {children}
    </UnitContext.Provider>
  );
}
