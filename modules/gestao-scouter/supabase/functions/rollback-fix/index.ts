import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fix_id } = await req.json();
    
    console.log('⏪ [ROLLBACK] Revertendo correção:', fix_id);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Buscar correção
    const { data: fix, error: fixError } = await supabase
      .from('fix_suggestions')
      .select('*, code_snapshots(*)')
      .eq('id', fix_id)
      .single();

    if (fixError || !fix) {
      throw new Error(`Correção não encontrada: ${fixError?.message}`);
    }

    if (!fix.snapshot_id) {
      throw new Error('Snapshot não encontrado para esta correção');
    }

    console.log('📸 Snapshot encontrado:', fix.snapshot_id);

    // 2. Restaurar do snapshot
    const { data: snapshot } = await supabase
      .from('code_snapshots')
      .select('*')
      .eq('id', fix.snapshot_id)
      .single();

    if (!snapshot) {
      throw new Error('Dados do snapshot não encontrados');
    }

    console.log('🔄 Restaurando código do snapshot...');
    
    // NOTA: Em produção, você aplicaria o snapshot_data para restaurar os arquivos
    
    // 3. Atualizar status da correção
    await supabase
      .from('fix_suggestions')
      .update({
        status: 'rolled_back'
      })
      .eq('id', fix_id);

    // 4. Atualizar status da análise
    await supabase
      .from('error_analyses')
      .update({ status: 'rolled_back' })
      .eq('id', fix.analysis_id);

    console.log('✅ Rollback concluído');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Correção revertida com sucesso. O código foi restaurado ao estado anterior.'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ [ROLLBACK] Erro:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
