import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TelemarketingContext {
  bitrix_id: number;
  cargo: string;
  name: string;
  commercial_project_id?: string | null;
}

interface ValidationResult {
  context: TelemarketingContext | null;
  isValid: boolean;
  isLoading: boolean;
}

/**
 * Hook centralizado para validar o contexto de telemarketing.
 * Verifica se o operador existe E está ativo na tabela telemarketing_operators.
 * Se inativo ou não encontrado, limpa o localStorage e retorna isValid: false.
 */
export function useTelemarketingContextValidation(): ValidationResult {
  const [context, setContext] = useState<TelemarketingContext | null>(null);
  const [isValid, setIsValid] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const validate = async () => {
      const prefix = '[TM][ContextValidation]';
      
      try {
        // Tentar ler do telemarketing_context primeiro
        const storedContext = localStorage.getItem('telemarketing_context');
        const storedOperator = localStorage.getItem('telemarketing_operator');
        
        let parsed: TelemarketingContext | null = null;
        
        if (storedContext) {
          parsed = JSON.parse(storedContext) as TelemarketingContext;
        } else if (storedOperator) {
          const operator = JSON.parse(storedOperator);
          parsed = {
            bitrix_id: operator.bitrix_id,
            cargo: operator.cargo,
            name: operator.operator_name,
            commercial_project_id: operator.commercial_project_id,
          };
        }
        
        if (!parsed) {
          console.log(`${prefix} Nenhum contexto encontrado`);
          setIsLoading(false);
          return;
        }
        
        setContext(parsed);
        
        // Verificar se operador existe E está ativo
        const { data, error } = await supabase
          .from('telemarketing_operators')
          .select('bitrix_id, status')
          .eq('bitrix_id', parsed.bitrix_id)
          .eq('status', 'ativo')
          .maybeSingle();
        
        if (error || !data) {
          console.warn(`${prefix} Operador inativo ou não encontrado:`, parsed.bitrix_id, error);
          
          // Limpar localStorage
          localStorage.removeItem('telemarketing_context');
          localStorage.removeItem('telemarketing_operator');
          
          // Mostrar mensagem para o usuário
          toast.error('Seu acesso foi desativado. Entre em contato com a supervisão.');
          
          setIsValid(false);
        } else {
          console.log(`${prefix} Operador validado com sucesso:`, parsed.bitrix_id);
          setIsValid(true);
        }
      } catch (e) {
        console.error(`${prefix} Erro ao validar contexto:`, e);
        setIsValid(false);
      } finally {
        setIsLoading(false);
      }
    };

    validate();
  }, []);

  return { context, isValid, isLoading };
}
