import { useState, useCallback, useRef, useEffect } from 'react';

interface UseAutoSaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  delay?: number;
  enabled?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

interface UseAutoSaveReturn<T = unknown> {
  save: () => Promise<void>;
  saving: boolean;
  saved: boolean;
  error: Error | null;
  lastSaved: Date | null;
  reset: () => void;
  scheduleSave: () => void;
  _phantom?: T;
}

export function useAutoSave<T extends Record<string, unknown>>({
  data,
  onSave,
  delay = 1000,
  enabled = true,
  onSuccess,
  onError,
}: UseAutoSaveOptions<T>): UseAutoSaveReturn<T> {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const dataRef = useRef(data);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const save = useCallback(async () => {
    if (!enabled) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave(dataRef.current);
      setSaved(true);
      setLastSaved(new Date());
      onSuccess?.();

      setTimeout(() => {
        setSaved(false);
      }, 2000);
    } catch (err) {
      const saveError = err instanceof Error ? err : new Error('Save failed');
      setError(saveError);
      onError?.(saveError);
    } finally {
      setSaving(false);
    }
  }, [enabled, onSave, onSuccess, onError]);

  const scheduleSave = useCallback(() => {
    if (!enabled) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      void save();
    }, delay);
  }, [enabled, delay, save]);

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setSaving(false);
    setSaved(false);
    setError(null);
    setLastSaved(null);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    save,
    saving,
    saved,
    error,
    lastSaved,
    reset,
    scheduleSave,
  };
}

interface AutoSaveFieldProps {
  value: unknown;
  onChange: (value: unknown) => void;
  onBlur?: () => void;
  autoSave: {
    save: () => Promise<void>;
    scheduleSave: () => void;
    saving: boolean;
    saved: boolean;
    error: Error | null;
  };
}

export function useAutoSaveField<T>({
  value,
  onChange,
  onBlur,
  autoSave,
}: AutoSaveFieldProps) {
  const handleChange = useCallback((newValue: T) => {
    onChange(newValue);
    autoSave.scheduleSave();
  }, [onChange, autoSave]);

  const handleBlur = useCallback(() => {
    onBlur?.();
    void autoSave.save();
  }, [autoSave, onBlur]);

  return {
    value,
    onChange: handleChange,
    onBlur: handleBlur,
    saving: autoSave.saving,
    saved: autoSave.saved,
    error: autoSave.error,
  };
}

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<number | null>(null);

  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]) as T;
}
