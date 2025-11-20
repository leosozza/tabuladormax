import { useState, useEffect, createContext, useContext, ReactNode, useMemo } from 'react';
import { useGestaoFieldMappings } from './useGestaoFieldMappings';

const STORAGE_KEY = 'leads_visible_columns';
const MIN_COLUMNS = 1;
const MAX_COLUMNS = 50;

// Campos sensíveis que devem ser ocultados para Scouters
const SENSITIVE_FIELDS = [
  'celular',
  'telefone',
  'telefone_casa', 
  'telefone_trabalho',
  'email'
];

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
  // Filtrar campos sensíveis para Scouters
  useEffect(() => {
    if (allFields && visibleColumns.length === 0) {
      const defaults = allFields
        .filter(f => f.defaultVisible)
        .filter(f => !SENSITIVE_FIELDS.includes(f.key))
        .map(f => f.key);
      setVisibleColumns(defaults);
    }
  }, [allFields, visibleColumns.length]);

  // Limpar campos sensíveis do localStorage (caso tenham sido salvos anteriormente)
  useEffect(() => {
    const hasSensitiveFields = visibleColumns.some(key => SENSITIVE_FIELDS.includes(key));
    if (hasSensitiveFields) {
      setVisibleColumns(prev => prev.filter(key => !SENSITIVE_FIELDS.includes(key)));
    }
  }, [visibleColumns]);

  // Persistir no localStorage
  useEffect(() => {
    if (visibleColumns.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleColumns));
    }
  }, [visibleColumns]);

  const toggleColumn = (key: string) => {
    setVisibleColumns(prev => {
      if (prev.includes(key)) {
        if (key === 'name') return prev; // name é obrigatório
        if (prev.length <= MIN_COLUMNS) return prev;
        return prev.filter(k => k !== key);
      } else {
        // sem limite prático de máximo
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
    // Manter apenas campos essenciais: name, scouter e projeto comercial
    setVisibleColumns(['name', 'scouter', 'commercial_projects.name']);
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
