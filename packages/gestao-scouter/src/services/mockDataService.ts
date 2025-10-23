// Mock data service - DEPRECATED
// Use leadsRepo.ts instead

import type { Lead, Project } from '@/repositories/types';

export class MockDataService {
  static async fetchFichas(): Promise<Lead[]> {
    console.warn('MockDataService: DEPRECATED - Use leadsRepo.ts');
    return [];
  }

  static async fetchProjetos(): Promise<Project[]> {
    console.warn('MockDataService: DEPRECATED');
    return [];
  }

  static async fetchMetasScouter(): Promise<Record<string, unknown>[]> {
    return [];
  }

  static async testConnection(): Promise<{ success: boolean; message: string; data?: unknown }> {
    return {
      success: false,
      message: 'MockDataService está deprecated. Use Supabase.',
    };
  }
}
