import { useState, useCallback, useEffect, useRef } from 'react';

export interface UndoAction {
  id: string;
  description: string;
  before: unknown;
  after: unknown;
  timestamp: number;
}

interface UseUndoOptions {
  maxHistory?: number;
  onUndo?: (action: UndoAction) => void;
  onRedo?: (action: UndoAction) => void;
}

export function useUndo<T = unknown>(options: UseUndoOptions = {}) {
  const { maxHistory = 20, onUndo, onRedo } = options;

  const [history, setHistory] = useState<UndoAction[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const currentDataRef = useRef<T | null>(null);

  const push = useCallback((action: Omit<UndoAction, 'id' | 'timestamp'>, currentState: T) => {
    const newAction: UndoAction = {
      ...action,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      const limited = newHistory.slice(-maxHistory + 1);
      return [...limited, newAction];
    });

    setHistoryIndex(prev => Math.min(prev + 1, maxHistory - 1));
    currentDataRef.current = currentState;
  }, [historyIndex, maxHistory]);

  const undo = useCallback((): T | null => {
    if (historyIndex < 0 || history.length === 0) return null;

    const action = history[historyIndex];
    onUndo?.(action);

    const previousState = action.before as T;
    setHistoryIndex(prev => prev - 1);
    currentDataRef.current = previousState;

    return previousState;
  }, [history, historyIndex, onUndo]);

  const redo = useCallback((): T | null => {
    if (historyIndex >= history.length - 1) return null;

    const action = history[historyIndex + 1];
    onRedo?.(action);

    const nextState = action.after as T;
    setHistoryIndex(prev => prev + 1);
    currentDataRef.current = nextState;

    return nextState;
  }, [history, historyIndex, onRedo]);

  const reset = useCallback(() => {
    setHistory([]);
    setHistoryIndex(-1);
    currentDataRef.current = null;
  }, []);

  const canUndo = historyIndex >= 0 && history.length > 0;
  const canRedo = historyIndex < history.length - 1;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return {
    push,
    undo,
    redo,
    reset,
    canUndo,
    canRedo,
    history,
    historyIndex,
  };
}

export function useUndoStack() {
  const [stack, setStack] = useState<UndoAction[]>([]);
  const [index, setIndex] = useState(-1);

  const push = useCallback((action: UndoAction) => {
    setStack(prev => {
      const newStack = prev.slice(0, index + 1);
      return [...newStack, action];
    });
    setIndex(prev => prev + 1);
  }, [index]);

  const undo = useCallback(() => {
    if (index < 0) return null;
    const action = stack[index];
    setIndex(prev => prev - 1);
    return action;
  }, [stack, index]);

  const redo = useCallback(() => {
    if (index >= stack.length - 1) return null;
    const action = stack[index + 1];
    setIndex(prev => prev + 1);
    return action;
  }, [stack, index]);

  const clear = useCallback(() => {
    setStack([]);
    setIndex(-1);
  }, []);

  return {
    push,
    undo,
    redo,
    clear,
    canUndo: index >= 0,
    canRedo: index < stack.length - 1,
    history: stack,
    position: index,
  };
}
