import { useEffect, useState } from 'react';
import { useErrorHunt } from '@/contexts/ErrorHuntContext';
import { ErrorCaptureModal } from './ErrorCaptureModal';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ErrorBoundary } from './ErrorBoundary';

function GlobalErrorCaptureHandlerInner() {
  const { clickedElement, capturedLogs, capturedErrors, networkRequests, clearContext, modalOpen, setModalOpen } = useErrorHunt();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  // Detecta quando elemento é capturado e abre modal automaticamente
  useEffect(() => {
    if (clickedElement) {
      toast({
        title: "✅ Elemento capturado!",
        description: `Componente: ${clickedElement.react_component || 'Desconhecido'}`,
        duration: 3000,
      });
      setModalOpen(true);
    }
  }, [clickedElement, toast]);

  const handleAnalyze = async (data: {
    description: string;
    elementContext: any;
    logs: any[];
    errors: any[];
    networkRequests: any[];
  }) => {
    setIsAnalyzing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Criar análise no banco
      const { data: analysis, error: insertError } = await supabase
        .from('error_analyses')
        .insert({
          user_id: user.id,
          error_type: 'user_reported',
          error_message: data.description || 'Análise de elemento capturado',
          error_stack: null,
          route: window.location.pathname,
          element_context: data.elementContext,
          console_logs: data.logs,
          network_requests: data.networkRequests,
          error_context: {
            errors: data.errors,
            captured_at: new Date().toISOString(),
            user_agent: navigator.userAgent,
          },
          status: 'pending'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      toast({
        title: "🚀 Análise iniciada",
        description: "A IA está analisando o contexto capturado...",
      });

      // Chamar edge function para análise
      const { error: functionError } = await supabase.functions.invoke('ai-analyze-error', {
        body: { analysis_id: analysis.id }
      });

      if (functionError) throw functionError;

      toast({
        title: "✅ Análise concluída",
        description: "Vá para Configurações → IA Debug para ver os resultados",
        duration: 5000,
      });

      setModalOpen(false);
      clearContext();
    } catch (error) {
      console.error('Erro ao analisar:', error);
      toast({
        title: "❌ Erro na análise",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <ErrorCaptureModal
      open={modalOpen}
      onOpenChange={setModalOpen}
      onAnalyze={handleAnalyze}
    />
  );
}

// Safe wrapper with ErrorBoundary
export function GlobalErrorCaptureHandler() {
  return (
    <ErrorBoundary fallback={null}>
      <GlobalErrorCaptureHandlerInner />
    </ErrorBoundary>
  );
}
