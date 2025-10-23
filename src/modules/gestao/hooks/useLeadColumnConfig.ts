import { useState, useEffect } from 'react';
import { ALL_LEAD_FIELDS } from '@/config/leadFields';

const STORAGE_KEY = 'leads_visible_columns';
const MIN_COLUMNS = 3;
const MAX_COLUMNS = 15;

export const useLeadColumnConfig = () => {
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return ALL_LEAD_FIELDS.filter(f => f.defaultVisible).map(f => f.key);
      }
    }
    return ALL_LEAD_FIELDS.filter(f => f.defaultVisible).map(f => f.key);
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const toggleColumn = (key: string) => {
    setVisibleColumns(prev => {
      if (prev.includes(key)) {
        // Don't allow removing if at minimum or if it's 'nome' (mandatory)
        if (prev.length <= MIN_COLUMNS || key === 'nome') {
          return prev;
        }
        return prev.filter(k => k !== key);
      } else {
        // Don't allow adding if at maximum
        if (prev.length >= MAX_COLUMNS) {
          return prev;
        }
        return [...prev, key];
      }
    });
  };

  const setColumns = (columns: string[]) => {
    // Ensure 'nome' is always included
    const finalColumns = columns.includes('nome') ? columns : ['nome', ...columns];
    
    // Enforce min/max
    if (finalColumns.length < MIN_COLUMNS || finalColumns.length > MAX_COLUMNS) {
      return;
    }
    
    setVisibleColumns(finalColumns);
  };

  const resetToDefault = () => {
    const defaults = ALL_LEAD_FIELDS.filter(f => f.defaultVisible).map(f => f.key);
    setVisibleColumns(defaults);
  };

  const selectAll = () => {
    const allKeys = ALL_LEAD_FIELDS.map(f => f.key).slice(0, MAX_COLUMNS);
    setVisibleColumns(allKeys);
  };

  const clearAll = () => {
    setVisibleColumns(['nome', 'scouter', 'projetos']); // Minimum required
  };

  const reorderColumns = (oldIndex: number, newIndex: number) => {
    setVisibleColumns(prev => {
      const result = Array.from(prev);
      const [removed] = result.splice(oldIndex, 1);
      result.splice(newIndex, 0, removed);
      return result;
    });
  };

  const canToggle = (key: string) => {
    if (key === 'nome') return false; // Nome is mandatory
    if (visibleColumns.includes(key)) {
      return visibleColumns.length > MIN_COLUMNS;
    }
    return visibleColumns.length < MAX_COLUMNS;
  };

  return {
    visibleColumns,
    toggleColumn,
    setColumns,
    reorderColumns,
    resetToDefault,
    selectAll,
    clearAll,
    canToggle,
    minColumns: MIN_COLUMNS,
    maxColumns: MAX_COLUMNS
  };
};
