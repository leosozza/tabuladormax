export type DateFilterPreset = 'today' | 'week' | 'month' | 'custom';

export interface DateFilter {
  preset: DateFilterPreset;
  startDate: Date;
  endDate: Date;
}

export interface GestaoFilters {
  dateFilter: DateFilter;
  projectId: string | null;
  scouterId: string | null;
}

export interface DashboardFilters {
  dateFilter: DateFilter;
  operatorId: string | null;
}

export interface LeadWithDetails {
  id: number;
  name: string | null;
  age: number | null;
  address: string | null;
  photo_url: string | null;
  updated_at: string | null;
  responsible: string | null;
  scouter: string | null;
  action_label?: string | null;
  action_created_at?: string | null;
}
