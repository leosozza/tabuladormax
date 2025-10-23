/**
 * Leads Data Module
 * Handles loading and parsing of leads data
 * 
 * ⚠️ FONTE ÚNICA: Tabela 'leads' do Supabase
 * Este módulo busca dados exclusivamente da tabela 'leads'.
 * A tabela 'fichas' foi deprecated.
 */

import { supabase } from '@/integrations/supabase/client';
import type { LeadDataPoint as FichaDataPointBase } from '@/types/lead';

export type LeadDataPoint = FichaDataPointBase;

export interface LeadsDataResult {
  fichas: LeadDataPoint[];
  total: number;
  loaded: Date;
}

/**
 * Load leads data from Supabase table 'leads'
 * Returns array of leads with lat/lng coordinates
 * 
 * @returns Promise with leads data from 'leads' table
 */
export async function loadLeadsData(): Promise<LeadsDataResult> {
  try {
    console.log('📥 [Leads Data] Loading leads from Supabase...');
    
    const { data: fichas, error } = await supabase
      .from('leads')
      .select('*')
      .eq('deleted', false)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);
    
    if (error) throw error;
    
    console.log(`✅ [Leads Data] Loaded ${fichas?.length || 0} leads with coordinates`);
    
    return {
      fichas: (fichas || []) as LeadDataPoint[],
      total: fichas?.length || 0,
      loaded: new Date(),
    };
  } catch (error) {
    console.error('❌ [Fichas Data] Error loading fichas:', error);
    throw error;
  }
}

/**
 * Filter fichas by bounding box
 * Used internally by selection module
 */
export function filterLeadsByBounds(
  fichas: LeadDataPoint[],
  bounds: { north: number; south: number; east: number; west: number }
): LeadDataPoint[] {
  return fichas.filter(ficha => {
    const lat = ficha.lat || ficha.latitude;
    const lng = ficha.lng || ficha.longitude;
    return (
      lat !== undefined &&
      lng !== undefined &&
      lat >= bounds.south &&
      lat <= bounds.north &&
      lng >= bounds.west &&
      lng <= bounds.east
    );
  });
}

/**
 * Group fichas by projeto
 */
export function groupByProjeto(fichas: LeadDataPoint[]): Map<string, LeadDataPoint[]> {
  const groups = new Map<string, LeadDataPoint[]>();
  
  fichas.forEach(ficha => {
    const projeto = ficha.projeto || 'Sem Projeto';
    if (!groups.has(projeto)) {
      groups.set(projeto, []);
    }
    const arr = groups.get(projeto);
    if (arr) {
      arr.push(ficha);
    } else {
      // This should not happen, but handle gracefully
      groups.set(projeto, [ficha]);
    }
  });
  
  return groups;
}

/**
 * Group fichas by scouter
 */
export function groupByScouter(fichas: LeadDataPoint[]): Map<string, LeadDataPoint[]> {
  const groups = new Map<string, LeadDataPoint[]>();
  
  fichas.forEach(ficha => {
    const scouter = ficha.scouter || 'Sem Scouter';
    if (!groups.has(scouter)) {
      groups.set(scouter, []);
    }
    groups.get(scouter)!.push(ficha);
  });
  
  return groups;
}
