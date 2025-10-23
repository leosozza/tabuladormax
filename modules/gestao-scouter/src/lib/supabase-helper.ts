// Gestão Scouter Supabase Client
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_GESTAO_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_GESTAO_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log('🔌 [Gestão Scouter] Inicializando cliente Supabase');
console.log('📡 [Gestão Scouter] URL:', SUPABASE_URL);

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
}) as any;

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
