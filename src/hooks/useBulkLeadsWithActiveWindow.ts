import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, subDays } from 'date-fns';

export interface LeadWithWindow {
  id: number;
  lead_name: string;
  phone_number: string;
  telemarketing_name: string | null;
  is_window_open: boolean;
  hours_remaining: number;
  minutes_remaining: number;
  last_customer_message_at: string | null;
  data_agendamento: string | null;
}

interface UseBulkLeadsOptions {
  bitrixTelemarketingId: number;
  cargo?: string;
  commercialProjectId?: string;
  teamOperatorIds?: number[];
  agendamentoFilter: string;
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('55')) {
    return digits.slice(0, 4) + '9' + digits.slice(4);
  }
  return digits;
}

function extractPhone(field: unknown): string | null {
  if (!field) return null;
  if (typeof field === 'string') {
    const trimmed = field.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed) && parsed[0]?.VALUE) {
          return normalizePhone(parsed[0].VALUE);
        }
        if (parsed?.VALUE) return normalizePhone(parsed.VALUE);
      } catch { /* ignore */ }
    }
    return normalizePhone(trimmed);
  }
  return null;
}

export function useBulkLeadsWithActiveWindow(options: UseBulkLeadsOptions) {
  const { bitrixTelemarketingId, cargo, commercialProjectId, teamOperatorIds, agendamentoFilter } = options;

  return useQuery({
    queryKey: ['bulk-leads-active-window', bitrixTelemarketingId, cargo, commercialProjectId, teamOperatorIds, agendamentoFilter],
    queryFn: async () => {
      const now = new Date();
      const offsetMs = -3 * 60 * 60 * 1000;
      const nowSP = new Date(now.getTime() + offsetMs + now.getTimezoneOffset() * 60 * 1000);
      const todayStart = startOfDay(nowSP);

      let dateFrom: Date | null = null;
      let dateTo: Date | null = null;

      switch (agendamentoFilter) {
        case 'today':
          dateFrom = todayStart;
          dateTo = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
          break;
        case 'yesterday':
          dateFrom = subDays(todayStart, 1);
          dateTo = todayStart;
          break;
        case '3days':
          dateFrom = subDays(todayStart, 3);
          dateTo = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
          break;
        case '7days':
          dateFrom = subDays(todayStart, 7);
          dateTo = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
          break;
      }

      // Build query for leads
      let query = supabase
        .from('leads')
        .select('id, name, telefone_trabalho, celular, bitrix_telemarketing_id, data_criacao_agendamento')
        .not('data_criacao_agendamento', 'is', null);

      // Apply date filter
      if (dateFrom && dateTo) {
        query = query
          .gte('data_criacao_agendamento', dateFrom.toISOString())
          .lt('data_criacao_agendamento', dateTo.toISOString());
      }

      // Apply operator filter based on cargo
      const isSupervisor = ['10620', '10626', '10627'].includes(cargo || '');
      if (!isSupervisor) {
        query = query.eq('bitrix_telemarketing_id', bitrixTelemarketingId);
      } else if (teamOperatorIds && teamOperatorIds.length > 0) {
        query = query.in('bitrix_telemarketing_id', teamOperatorIds);
      }

      const { data: leads, error } = await query.limit(500);

      if (error) throw error;

      if (!leads || leads.length === 0) {
        return { leads: [], totalLeads: 0, activeWindowCount: 0 };
      }

      // Get telemarketing names
      const operatorIds = [...new Set(leads.map(l => l.bitrix_telemarketing_id).filter(Boolean))];
      const { data: mappings } = await supabase
        .from('agent_telemarketing_mapping')
        .select('bitrix_telemarketing_id, bitrix_telemarketing_name')
        .in('bitrix_telemarketing_id', operatorIds);
      
      const nameMap = new Map<number, string>();
      mappings?.forEach(m => nameMap.set(m.bitrix_telemarketing_id, m.bitrix_telemarketing_name || ''));

      const phoneMap = new Map<string, { lead: typeof leads[number]; phone: string }>();
      for (const lead of leads) {
        const phone = extractPhone(lead.telefone_trabalho) || extractPhone(lead.celular);
        if (phone && phone.length >= 10) {
          phoneMap.set(phone, { lead, phone });
        }
      }

      const phoneNumbers = Array.from(phoneMap.keys());
      if (phoneNumbers.length === 0) {
        return { leads: [], totalLeads: leads.length, activeWindowCount: 0 };
      }

      const { data: windowData, error: windowError } = await supabase.functions.invoke('gupshup-check-window-bulk', {
        body: { phone_numbers: phoneNumbers },
      });

      if (windowError) throw windowError;

      const windowsMap = new Map<string, { is_open: boolean; hours_remaining: number; minutes_remaining: number; last_customer_message_at: string | null }>();
      (windowData?.windows || []).forEach((w: any) => windowsMap.set(w.phone_number, w));

      const leadsWithWindow: LeadWithWindow[] = [];
      for (const [phone, { lead }] of phoneMap) {
        const window = windowsMap.get(phone);
        leadsWithWindow.push({
          id: lead.id,
          lead_name: lead.name || `Lead ${lead.id}`,
          phone_number: phone,
          telemarketing_name: nameMap.get(lead.bitrix_telemarketing_id || 0) || null,
          is_window_open: window?.is_open ?? false,
          hours_remaining: window?.hours_remaining ?? 0,
          minutes_remaining: window?.minutes_remaining ?? 0,
          last_customer_message_at: window?.last_customer_message_at ?? null,
          data_agendamento: lead.data_criacao_agendamento,
        });
      }

      leadsWithWindow.sort((a, b) => {
        if (a.is_window_open !== b.is_window_open) return a.is_window_open ? -1 : 1;
        return (b.hours_remaining * 60 + b.minutes_remaining) - (a.hours_remaining * 60 + a.minutes_remaining);
      });

      return {
        leads: leadsWithWindow,
        totalLeads: leads.length,
        activeWindowCount: leadsWithWindow.filter(l => l.is_window_open).length,
      };
    },
    enabled: !!bitrixTelemarketingId && agendamentoFilter !== 'all',
    staleTime: 30 * 1000,
  });
}
