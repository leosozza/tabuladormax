// Repositório para Scouters - Dados do Supabase
import { supabase } from '@/integrations/supabase/client';
import { detectMissingFields } from '@/utils/fieldValidator';
import type { LeadDataPoint } from '@/types/lead';

export interface ScouterData {
  id: string;
  scouter_name: string;
  tier_name: string;
  weekly_goal: number;
  fichas_value: number;
  total_fichas: number;
  converted_fichas: number;
  conversion_rate: number;
  taxaConversao: number;
  qualityScore: number;
  performance_status: string;
  status: string;
  active: boolean;
}

export interface ScouterSummary {
  totalScouters: number;
  activeScouters: number;
  totalLeads: number;
  averageConversion: number;
}

export interface ScouterDataResult {
  data: ScouterData[];
  missingFields: string[];
}

export async function getScoutersData(): Promise<ScouterData[]> {
  const result = await fetchScoutersFromSupabase();
  return result.data;
}

export async function getScoutersSummary(): Promise<ScouterSummary> {
  const scoutersData = await getScoutersData();

  const totalScouters = scoutersData.length;
  const activeScouters = scoutersData.filter((s) => s.active).length;
  const totalLeads = scoutersData.reduce((sum, s) => sum + s.total_fichas, 0);
  const averageConversion =
    scoutersData.length > 0
      ? scoutersData.reduce((sum, s) => sum + s.conversion_rate, 0) / scoutersData.length
      : 0;

  return {
    totalScouters,
    activeScouters,
    totalLeads,
    averageConversion,
  };
}

// Normaliza valores "positivos" para booleano
function isAffirmative(v: any): boolean {
  if (v === true || v === 1) return true;
  const s = String(v ?? '').trim().toLowerCase();
  return s === 'sim' || s === '1' || s === 'true' || s === 'yes' || s === 'confirmado';
}

async function fetchScoutersFromSupabase(): Promise<ScouterDataResult> {
  try {
    // Buscar perfis ativos
    const { data: profiles, error: profilesError } = await supabase
      .from('scouter_profiles')
      .select('*')
      .eq('ativo', true);

    if (profilesError) throw profilesError;

    // Buscar leads (fonte única)
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .or('deleted.is.false,deleted.is.null');

    if (leadsError) throw leadsError;

    // Agrupar leads por scouter
    const leadsByScouter = new Map<string, LeadDataPoint[]>();
    for (const lead of leads || []) {
      const scouterName = lead.scouter?.toString().trim();
      if (scouterName) {
        if (!leadsByScouter.has(scouterName)) leadsByScouter.set(scouterName, []);
        leadsByScouter.get(scouterName)!.push(lead as LeadDataPoint);
      }
    }

    // Converter profiles em ScouterData
    const scoutersData: ScouterData[] = [];
    for (const profile of profiles || []) {
      const scouterLeads = leadsByScouter.get(String(profile.nome)) || [];
      const totalLeads = scouterLeads.length;

      const convertedFichas = scouterLeads.filter(
        (f) => isAffirmative(f.confirmado) || isAffirmative(f.compareceu)
      ).length;

      const conversionRate = totalLeads > 0 ? (convertedFichas / totalLeads) * 100 : 0;

      // Tier e meta semanal
      const tierName = getTierFromFichas(totalLeads);
      const weeklyGoal = getWeeklyGoalFromTier(tierName);

      scoutersData.push({
        id: String(profile.id),
        scouter_name: String(profile.nome),
        tier_name: tierName,
        weekly_goal: weeklyGoal,
        fichas_value: totalLeads, // pode ser substituído por valor somado, se necessário
        total_fichas: totalLeads,
        converted_fichas: convertedFichas,
        conversion_rate: conversionRate,
        taxaConversao: conversionRate,
        qualityScore: calculateQualityScore(scouterLeads),
        performance_status: getPerformanceStatus(conversionRate),
        status: profile.ativo ? 'ativo' : 'inativo',
        active: !!profile.ativo,
      });
    }

    // Detectar campos ausentes em scouter_profiles
    const missingFields = detectMissingFields(profiles || [], 'scouter_profiles');

    return {
      data: scoutersData,
      missingFields,
    };
  } catch (error) {
    console.error('Error fetching scouters from Supabase:', error);
    return {
      data: [],
      missingFields: [],
    };
  }
}

function getTierFromFichas(totalLeads: number): string {
  if (totalLeads >= 80) return 'Scouter Coach Bronze';
  if (totalLeads >= 60) return 'Scouter Premium';
  if (totalLeads >= 40) return 'Scouter Pleno';
  return 'Scouter Iniciante';
}

function getWeeklyGoalFromTier(tier: string): number {
  if (tier.includes('Coach')) return 90;
  if (tier.includes('Premium')) return 80;
  if (tier.includes('Pleno')) return 60;
  return 40;
}

function getPerformanceStatus(conversionRate: number): string {
  if (conversionRate >= 90) return 'excelente';
  if (conversionRate >= 75) return 'bom';
  if (conversionRate >= 60) return 'regular';
  return 'baixo';
}

function calculateQualityScore(fichas: LeadDataPoint[]): number {
  if (!fichas || fichas.length === 0) return 0;

  let score = 0;
  const weights = {
    hasPhoto: 10,
    hasEmail: 5,
    hasPhone: 5,
    confirmed: 20,
    attended: 30,
  };

  for (const ficha of fichas) {
    if (ficha.foto || String(ficha.cadastro_existe_foto ?? '').trim().toLowerCase() === 'sim') {
      score += weights.hasPhoto;
    }
    if (ficha.email) score += weights.hasEmail;
    if (ficha.telefone) score += weights.hasPhone;
    if (isAffirmative(ficha.confirmado)) score += weights.confirmed;
    if (isAffirmative(ficha.compareceu)) score += weights.attended;
  }

  const maxScore =
    fichas.length *
    (weights.hasPhoto + weights.hasEmail + weights.hasPhone + weights.confirmed + weights.attended);
  return maxScore > 0 ? (score / maxScore) * 100 : 0;
}