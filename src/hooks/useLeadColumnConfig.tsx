import { useState, useEffect, createContext, useContext, ReactNode, useMemo } from 'react';
import { useGestaoFieldMappings } from './useGestaoFieldMappings';

const STORAGE_KEY = 'leads_visible_columns';
const MIN_COLUMNS = 3;
const MAX_COLUMNS = 15;

interface LeadColumnConfigContextValue {
  visibleColumns: string[];
  toggleColumn: (key: string) => void;
  setColumns: (columns: string[]) => void;
  reorderColumns: (oldIndex: number, newIndex: number) => void;
  resetToDefault: () => void;
  selectAll: () => void;
  clearAll: () => void;
  canToggle: (key: string) => boolean;
  minColumns: number;
  maxColumns: number;
}

const LeadColumnConfigContext = createContext<LeadColumnConfigContextValue | undefined>(undefined);

export function LeadColumnConfigProvider({ children }: { children: ReactNode }) {
  const { data: allFields } = useGestaoFieldMappings();

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return [];
      }
    }
    return [];
  });

  // Quando os campos carregarem pela primeira vez e não houver configuração, usar os defaultVisible
  useEffect(() => {
    if (allFields && visibleColumns.length === 0) {
      const defaults = allFields.filter(f => f.defaultVisible).map(f => f.key);
      setVisibleColumns(defaults);
    }
  }, [allFields, visibleColumns.length]);

  // Persistir no localStorage
  useEffect(() => {
    if (visibleColumns.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleColumns));
    }
  }, [visibleColumns]);

  const toggleColumn = (key: string) => {
    setVisibleColumns(prev => {
      if (prev.includes(key)) {
        if (prev.length <= MIN_COLUMNS || key === 'name') return prev;
        return prev.filter(k => k !== key);
      } else {
        if (prev.length >= MAX_COLUMNS) return prev;
        return [...prev, key];
      }
    });
  };

  const setColumns = (columns: string[]) => {
    const finalColumns = columns.includes('name') ? columns : ['name', ...columns];
    if (finalColumns.length < MIN_COLUMNS || finalColumns.length > MAX_COLUMNS) return;
    setVisibleColumns(finalColumns);
  };

  const resetToDefault = () => {
    const defaults = allFields?.filter(f => f.defaultVisible).map(f => f.key) || [];
    setVisibleColumns(defaults);
  };

  const selectAll = () => {
    const allKeys = allFields?.map(f => f.key).slice(0, MAX_COLUMNS) || [];
    setVisibleColumns(allKeys);
  };

  const clearAll = () => {
    setVisibleColumns(['name', 'scouter', 'projetos']); // manter mínimo obrigatório
  };

  const reorderColumns = (oldIndex: number, newIndex: number) => {
    setVisibleColumns(prev => {
      const result = [...prev];
      const [removed] = result.splice(oldIndex, 1);
      result.splice(newIndex, 0, removed);
      return result;
    });
  };

  const canToggle = (key: string) => {
    if (key === 'name') return false;
    if (visibleColumns.includes(key)) {
      return visibleColumns.length > MIN_COLUMNS;
    }
    return visibleColumns.length < MAX_COLUMNS;
  };

  const value: LeadColumnConfigContextValue = useMemo(
    () => ({
      visibleColumns,
      toggleColumn,
      setColumns,
      reorderColumns,
      resetToDefault,
      selectAll,
      clearAll,
      canToggle,
      minColumns: MIN_COLUMNS,
      maxColumns: MAX_COLUMNS,
    }),
    [visibleColumns]
  );

  return (
    <LeadColumnConfigContext.Provider value={value}>
      {children}
    </LeadColumnConfigContext.Provider>
  );
}

export const useLeadColumnConfig = () => {
  const ctx = useContext(LeadColumnConfigContext);
  if (!ctx) {
    throw new Error("useLeadColumnConfig must be used within LeadColumnConfigProvider");
  }
  return ctx;
};
