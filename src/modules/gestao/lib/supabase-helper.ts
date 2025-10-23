// Gestão Scouter usa o MESMO cliente Supabase do TabuladorMax
// Re-exporta o cliente unificado mantendo compatibilidade
import { supabase as tabuladorSupabase } from '@/integrations/supabase/client';

console.log('🔌 [Gestão Scouter] Usando cliente Supabase compartilhado (TabuladorMax)');

export const supabase = tabuladorSupabase;

// Test connection on initialization
(async () => {
  try {
    console.log('🧪 [Gestão Scouter] Testando conexão...');
    
    const { data, error, count } = await supabase
      .from('leads')
      .select('id', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ [Gestão Scouter] Erro no teste de conexão:', error);
    } else {
      console.log('✅ [Gestão Scouter] Conexão estabelecida com sucesso');
      console.log(`📊 [Gestão Scouter] Total de registros na tabela "leads": ${count ?? 0}`);
    }
  } catch (err) {
    console.error('❌ [Gestão Scouter] Exceção ao testar conexão:', err);
  }
})();
