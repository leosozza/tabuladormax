import { useState, useCallback } from 'react';

export interface ColumnPriority {
  primary?: string;
  secondary?: string;
  tertiary?: string;
}

export type ColumnMappingWithPriority = Record<string, ColumnPriority>;

export function useColumnMapping(csvHeaders: string[], initialMapping?: ColumnMappingWithPriority) {
  const [mapping, setMapping] = useState<ColumnMappingWithPriority>(initialMapping || {});
  
  const addMapping = useCallback((targetField: string, csvColumn: string, priority: 'primary' | 'secondary' | 'tertiary' = 'primary') => {
    setMapping(prev => ({
      ...prev,
      [targetField]: {
        ...prev[targetField],
        [priority]: csvColumn
      }
    }));
  }, []);

  const removeMapping = useCallback((targetField: string, priority: 'primary' | 'secondary' | 'tertiary') => {
    setMapping(prev => {
      const updated = { ...prev };
      if (updated[targetField]) {
        const newPriority = { ...updated[targetField] };
        delete newPriority[priority];
        
        if (Object.keys(newPriority).length === 0) {
          delete updated[targetField];
        } else {
          updated[targetField] = newPriority;
        }
      }
      return updated;
    });
  }, []);

  const clearMapping = useCallback((targetField: string) => {
    setMapping(prev => {
      const updated = { ...prev };
      delete updated[targetField];
      return updated;
    });
  }, []);

  const getMappedCount = useCallback(() => {
    return Object.keys(mapping).length;
  }, [mapping]);

  const isCsvColumnMapped = useCallback((csvColumn: string) => {
    return Object.values(mapping).some(priority => 
      Object.values(priority).includes(csvColumn)
    );
  }, [mapping]);

  const getFieldMappingCount = useCallback((targetField: string) => {
    const priorities = mapping[targetField];
    if (!priorities) return 0;
    return Object.keys(priorities).length;
  }, [mapping]);

  return {
    mapping,
    setMapping,
    addMapping,
    removeMapping,
    clearMapping,
    getMappedCount,
    isCsvColumnMapped,
    getFieldMappingCount
  };
}