import React, { createContext, useContext, useState } from 'react';
import type { LeadsFilters } from '@/repositories/types';

interface LeadsFiltersContextType {
  filters: LeadsFilters;
  setFilters: (filters: LeadsFilters) => void;
  updateFilter: (key: keyof LeadsFilters, value: string | undefined) => void;
}

const LeadsFiltersContext = createContext<LeadsFiltersContextType | undefined>(undefined);

export function LeadsFiltersProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<LeadsFilters>({});

  const updateFilter = (key: keyof LeadsFilters, value: string | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return React.createElement(
    LeadsFiltersContext.Provider,
    { value: { filters, setFilters, updateFilter } },
    children
  );
}

export function useLeadsFilters() {
  const context = useContext(LeadsFiltersContext);
  if (context === undefined) {
    throw new Error('useLeadsFilters must be used within a LeadsFiltersProvider');
  }
  return context;
}