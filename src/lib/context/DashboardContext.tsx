'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type WidgetType = 'streak' | 'volume' | 'quickActions' | 'recentPRs' | 'emptyState';

export interface WidgetConfig {
  id: WidgetType;
  enabled: boolean;
  order: number;
}

interface DashboardContextType {
  widgets: WidgetConfig[];
  setWidgets: (widgets: WidgetConfig[]) => void;
  toggleWidget: (widgetId: WidgetType) => void;
  reorderWidgets: (fromIndex: number, toIndex: number) => void;
  resetToDefault: () => void;
  isCustomizing: boolean;
  setIsCustomizing: (value: boolean) => void;
}

const defaultWidgets: WidgetConfig[] = [
  { id: 'emptyState', enabled: true, order: 0 },
  { id: 'streak', enabled: true, order: 1 },
  { id: 'volume', enabled: true, order: 2 },
  { id: 'quickActions', enabled: true, order: 3 },
  { id: 'recentPRs', enabled: true, order: 4 },
];

const DashboardContext = createContext<DashboardContextType | null>(null);

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}

interface DashboardProviderProps {
  children: ReactNode;
}

export function DashboardProvider({ children }: DashboardProviderProps) {
  const [widgets, setWidgetsState] = useState<WidgetConfig[]>(defaultWidgets);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('dashboardWidgets');
    if (saved) {
      try {
        const parsed: WidgetConfig[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setWidgetsState(parsed);
        }
      } catch {
        console.error('Failed to parse dashboard widgets');
      }
    }
  }, []);

  const setWidgets = (newWidgets: WidgetConfig[]) => {
    setWidgetsState(newWidgets);
    if (mounted) {
      localStorage.setItem('dashboardWidgets', JSON.stringify(newWidgets));
    }
  };

  const toggleWidget = (widgetId: WidgetType) => {
    const newWidgets = widgets.map((w) =>
      w.id === widgetId ? { ...w, enabled: !w.enabled } : w
    );
    setWidgets(newWidgets);
  };

  const reorderWidgets = (fromIndex: number, toIndex: number) => {
    const newWidgets = [...widgets];
    const [removed] = newWidgets.splice(fromIndex, 1);
    newWidgets.splice(toIndex, 0, removed);
    const reordered = newWidgets.map((w, index) => ({ ...w, order: index }));
    setWidgets(reordered);
  };

  const resetToDefault = () => {
    setWidgets(defaultWidgets);
  };

  const contextValue = {
    widgets: mounted ? widgets : defaultWidgets,
    setWidgets,
    toggleWidget,
    reorderWidgets,
    resetToDefault,
    isCustomizing,
    setIsCustomizing,
  };

  return (
    <DashboardContext.Provider value={contextValue}>
      {children}
    </DashboardContext.Provider>
  );
}
