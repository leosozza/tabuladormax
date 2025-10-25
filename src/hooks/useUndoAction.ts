import { useState, useCallback, useRef, useEffect } from 'react';

export interface UndoableAction {
  leadId: number;
  quality: string;
  timestamp: number;
}

interface UseUndoActionOptions {
  timeoutMs?: number; // Time in milliseconds before undo is no longer available
}

export const useUndoAction = (options: UseUndoActionOptions = {}) => {
  const { timeoutMs = 5000 } = options; // Default 5 seconds
  const [lastAction, setLastAction] = useState<UndoableAction | null>(null);
  const [isUndoAvailable, setIsUndoAvailable] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearUndoTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const recordAction = useCallback((leadId: number, quality: string) => {
    // Clear any existing timeout
    clearUndoTimeout();
    
    // Record the action
    const action: UndoableAction = {
      leadId,
      quality,
      timestamp: Date.now(),
    };
    
    setLastAction(action);
    setIsUndoAvailable(true);

    // Set timeout to clear undo availability
    timeoutRef.current = setTimeout(() => {
      setIsUndoAvailable(false);
      setLastAction(null);
    }, timeoutMs);
  }, [timeoutMs, clearUndoTimeout]);

  const clearUndo = useCallback(() => {
    clearUndoTimeout();
    setLastAction(null);
    setIsUndoAvailable(false);
  }, [clearUndoTimeout]);

  const getLastAction = useCallback(() => {
    return lastAction;
  }, [lastAction]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearUndoTimeout();
    };
  }, [clearUndoTimeout]);

  return {
    recordAction,
    clearUndo,
    getLastAction,
    isUndoAvailable,
    lastAction,
  };
};
