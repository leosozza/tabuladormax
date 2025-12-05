import { useState, useCallback, useRef } from 'react';
import { Node, Edge } from 'reactflow';

interface HistoryState {
  nodes: Node[];
  edges: Edge[];
}

interface UseUndoRedoOptions {
  maxHistory?: number;
}

interface UseUndoRedoReturn {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => HistoryState | null;
  redo: () => HistoryState | null;
  takeSnapshot: (nodes: Node[], edges: Edge[]) => void;
  clear: () => void;
}

export function useUndoRedo(options: UseUndoRedoOptions = {}): UseUndoRedoReturn {
  const { maxHistory = 50 } = options;
  
  const [pastStates, setPastStates] = useState<HistoryState[]>([]);
  const [futureStates, setFutureStates] = useState<HistoryState[]>([]);
  
  // Debounce to avoid too many snapshots during rapid changes
  const lastSnapshotTime = useRef<number>(0);
  const DEBOUNCE_MS = 100;
  
  const takeSnapshot = useCallback((nodes: Node[], edges: Edge[]) => {
    const now = Date.now();
    if (now - lastSnapshotTime.current < DEBOUNCE_MS) {
      return;
    }
    lastSnapshotTime.current = now;
    
    setPastStates((past) => {
      const newPast = [...past, { 
        nodes: JSON.parse(JSON.stringify(nodes)), 
        edges: JSON.parse(JSON.stringify(edges)) 
      }];
      
      // Limit history size
      if (newPast.length > maxHistory) {
        return newPast.slice(-maxHistory);
      }
      return newPast;
    });
    
    // Clear future when new action is taken
    setFutureStates([]);
  }, [maxHistory]);
  
  const undo = useCallback((): HistoryState | null => {
    if (pastStates.length === 0) return null;
    
    const newPast = [...pastStates];
    const previous = newPast.pop();
    
    if (!previous) return null;
    
    setPastStates(newPast);
    
    return previous;
  }, [pastStates]);
  
  const redo = useCallback((): HistoryState | null => {
    if (futureStates.length === 0) return null;
    
    const newFuture = [...futureStates];
    const next = newFuture.pop();
    
    if (!next) return null;
    
    setFutureStates(newFuture);
    
    return next;
  }, [futureStates]);
  
  const pushToFuture = useCallback((state: HistoryState) => {
    setFutureStates((future) => [...future, state]);
  }, []);
  
  const clear = useCallback(() => {
    setPastStates([]);
    setFutureStates([]);
  }, []);
  
  return {
    canUndo: pastStates.length > 0,
    canRedo: futureStates.length > 0,
    undo,
    redo,
    takeSnapshot,
    clear,
  };
}

export default useUndoRedo;
