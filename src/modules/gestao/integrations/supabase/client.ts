// Gestão Scouter usa o MESMO cliente Supabase do TabuladorMax
// Re-exporta o cliente unificado para manter compatibilidade de imports
export { supabase } from '@/integrations/supabase/client';
export type { Database } from '@/integrations/supabase/types';
