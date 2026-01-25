// ============================================================
// Backfill WhatsApp bitrix_id by phone (handles Brazilian 9th digit)
// Runs in small batches to avoid statement timeouts.
// Requires authenticated admin.
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function decodeJwtSub(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const payloadJson = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson);
    return typeof payload?.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

function onlyDigits(input: string): string {
  return (input || '').replace(/\D/g, '');
}

function phoneCandidates(phone: string): string[] {
  const digits = onlyDigits(phone);
  if (!digits) return [];

  const out = new Set<string>();
  out.add(digits);

  // Canonicalize to Brazil format when possible
  // 12 digits: 55 + DDD(2) + 8 digits (missing 9th digit)
  if (digits.length === 12 && digits.startsWith('55')) {
    const ddd = digits.slice(2, 4);
    const local = digits.slice(4); // 8 digits
    if (local.length === 8 && ['6', '7', '8', '9'].includes(local[0])) {
      out.add(`55${ddd}9${local}`);
    }
  }

  // 13 digits: 55 + DDD(2) + 9 + 8 digits (has 9th digit)
  // Provide fallback without the 9
  if (digits.length === 13 && /^55\d{2}9\d{8}$/.test(digits)) {
    const ddd = digits.slice(2, 4);
    const local8 = digits.slice(5); // after 55DD9
    out.add(`55${ddd}${local8}`);
  }

  return Array.from(out);
}

function isNumericBitrixId(v: string | null): boolean {
  return !!v && /^\d+$/.test(v);
}

function clampInt(n: unknown, min: number, max: number, fallback: number): number {
  const x = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(x)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(x)));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    const userId = decodeJwtSub(authHeader);
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Admin guard
    const { data: roleRow, error: roleErr } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    if (roleErr) {
      return new Response(JSON.stringify({ error: 'Failed to validate role', details: roleErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (roleRow?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const batchSize = clampInt(body?.batchSize, 50, 500, 250);
    const maxBatches = clampInt(body?.maxBatches, 1, 20, 6);
    const hardTimeLimitMs = clampInt(body?.timeLimitMs, 5_000, 55_000, 25_000);

    const startedAt = Date.now();

    let batches = 0;
    let processed = 0;
    let matched = 0;
    let updated = 0;

    while (batches < maxBatches && Date.now() - startedAt < hardTimeLimitMs) {
      batches += 1;

      const { data: msgs, error: msgsErr } = await supabase
        .from('whatsapp_messages')
        .select('id, phone_number, bitrix_id')
        .not('phone_number', 'is', null)
        .or('bitrix_id.is.null,bitrix_id.not.ilike.%') // keep broad; we'll filter in code
        .order('id', { ascending: true })
        .limit(batchSize);

      if (msgsErr) {
        return new Response(JSON.stringify({ error: 'Failed to load batch', details: msgsErr.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Filter correctly (supabase "or" limitations for regex)
      const todo = (msgs || []).filter((m) => !isNumericBitrixId(m.bitrix_id) && !!m.phone_number);
      if (todo.length === 0) break;

      processed += todo.length;

      // Build candidate set for one-shot lead lookup
      const candidatesSet = new Set<string>();
      const msgCandidates: Array<{ id: string; candidates: string[] }> = [];

      for (const m of todo) {
        const cands = phoneCandidates(String(m.phone_number));
        msgCandidates.push({ id: String(m.id), candidates: cands });
        for (const c of cands) candidatesSet.add(c);
      }

      const candidates = Array.from(candidatesSet).slice(0, 900); // safety under 1000-row limit
      const { data: leads, error: leadsErr } = await supabase
        .from('leads')
        .select('id, phone_normalized, criado')
        .in('phone_normalized', candidates)
        .order('criado', { ascending: false })
        .limit(1000);

      if (leadsErr) {
        return new Response(JSON.stringify({ error: 'Failed to lookup leads', details: leadsErr.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Pick the most recent lead per phone
      const bestByPhone = new Map<string, { id: string; criado: string | null }>();
      for (const l of leads || []) {
        const phone = String(l.phone_normalized || '');
        if (!phone) continue;
        if (!bestByPhone.has(phone)) {
          bestByPhone.set(phone, { id: String(l.id), criado: (l as any).criado ?? null });
        }
      }

      // Update rows individually (bitrix_id differs per row)
      for (const mc of msgCandidates) {
        let leadId: string | null = null;

        for (const p of mc.candidates) {
          const found = bestByPhone.get(p);
          if (found?.id) {
            leadId = found.id;
            break;
          }
        }

        if (!leadId) continue;
        matched += 1;

        const { error: updErr } = await supabase
          .from('whatsapp_messages')
          .update({ bitrix_id: leadId })
          .eq('id', mc.id);

        if (!updErr) updated += 1;
      }

      // Stop early if close to time limit
      if (Date.now() - startedAt > hardTimeLimitMs - 3_000) break;
    }

    // Remaining estimate
    const { count: remaining, error: countErr } = await supabase
      .from('whatsapp_messages')
      .select('id', { count: 'exact', head: true })
      .not('phone_number', 'is', null)
      .or('bitrix_id.is.null');

    const remainingSafe = countErr ? null : remaining;

    return new Response(
      JSON.stringify({
        success: true,
        batches,
        processed,
        matched,
        updated,
        remaining_estimate: remainingSafe,
        note: 'A lista /whatsapp deve refletir conforme a MV for atualizada (job automático a cada poucos minutos).',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
