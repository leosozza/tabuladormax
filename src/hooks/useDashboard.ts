/**
 * Hook placeholder para dashboards
 * Será implementado quando as tabelas de dashboard forem criadas
 */

import type { DashboardConfig } from '@/types/dashboard';

export function useDashboard() {
  return {
    dashboards: [] as DashboardConfig[],
    isLoading: false,
    getDashboard: async (_id: string) => null as DashboardConfig | null,
    createDashboard: (_config: Partial<DashboardConfig>) => {},
    updateDashboard: (_update: { id: string; config: Partial<DashboardConfig> }) => {},
    deleteDashboard: (_id: string) => {},
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
  };
}
