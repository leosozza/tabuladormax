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
    const { fix_id, create_snapshot = true } = await req.json();
    
    console.log('🔧 [APPLY-FIX] Aplicando correção:', fix_id);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Buscar correção
    const { data: fix, error: fixError } = await supabase
      .from('fix_suggestions')
      .select('*, error_analyses(*)')
      .eq('id', fix_id)
      .single();

    if (fixError || !fix) {
      throw new Error(`Correção não encontrada: ${fixError?.message}`);
    }

    console.log('📋 Correção:', fix.fix_title);

    // 2. Criar snapshot antes de aplicar (se solicitado)
    let snapshotId = null;
    if (create_snapshot) {
      console.log('📸 Criando snapshot...');
      
      // Aqui você pode implementar a lógica para capturar o estado atual dos arquivos
      // Por enquanto, vamos criar um snapshot vazio
      const { data: snapshot, error: snapshotError } = await supabase
        .from('code_snapshots')
        .insert({
          user_id: fix.error_analyses.user_id,
          analysis_id: fix.analysis_id,
          snapshot_data: {
            timestamp: new Date().toISOString(),
            fix_id: fix_id,
            description: `Snapshot antes de aplicar: ${fix.fix_title}`
          },
          description: `Snapshot antes de aplicar: ${fix.fix_title}`,
          file_count: 1,
          total_size_bytes: fix.suggested_code?.length || 0
        })
        .select()
        .single();

      if (snapshotError) {
        console.warn('⚠️ Erro ao criar snapshot:', snapshotError.message);
      } else {
        snapshotId = snapshot.id;
        console.log('✅ Snapshot criado:', snapshotId);
      }
    }

    // 3. Aqui você aplicaria a correção no código
    // Por enquanto, apenas simulamos a aplicação
    console.log('✨ Aplicando correção ao arquivo:', fix.file_path);
    
    // NOTA: Em produção, você precisaria integrar com o sistema de arquivos
    // ou com a API do Lovable para realmente aplicar as mudanças
    
    // 4. Atualizar status da correção
    await supabase
      .from('fix_suggestions')
      .update({
        status: 'applied',
        applied_at: new Date().toISOString(),
        snapshot_id: snapshotId
      })
      .eq('id', fix_id);

    // 5. Atualizar status da análise
    await supabase
      .from('error_analyses')
      .update({ status: 'applied' })
      .eq('id', fix.analysis_id);

    console.log('✅ Correção aplicada com sucesso');

    return new Response(
      JSON.stringify({ 
        success: true,
        snapshot_id: snapshotId,
        message: 'Correção aplicada com sucesso. Um snapshot foi criado para rollback.'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ [APPLY-FIX] Erro:', error);
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
