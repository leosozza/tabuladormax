import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  Bug, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  AlertTriangle,
  Code,
  Play,
  RotateCcw,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AIProviderConfig } from './AIProviderConfig';
import { FixSuggestionCard } from './FixSuggestionCard';
import { ErrorCaptureModal } from './ErrorCaptureModal';
import { AIContextViewer } from './AIContextViewer';
import { useErrorHunt } from '@/contexts/ErrorHuntContext';

interface ErrorAnalysis {
  id: string;
  error_type: string;
  error_message: string;
  error_stack?: string;
  status: string;
  ai_provider: string;
  ai_model?: string;
  analysis_result?: any;
  created_at: string;
  analyzed_at?: string;
}

interface FixSuggestion {
  id: string;
  fix_title: string;
  fix_description: string;
  fix_type: string;
  file_path?: string;
  suggested_code?: string;
  status: string;
  snapshot_id?: string;
}

export function AIDebugPanel() {
  const { clickedElement } = useErrorHunt();
  const [analyses, setAnalyses] = useState<ErrorAnalysis[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<ErrorAnalysis | null>(null);
  const [fixes, setFixes] = useState<FixSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showCaptureModal, setShowCaptureModal] = useState(false);

  // Form para nova análise
  const [errorMessage, setErrorMessage] = useState('');
  const [errorStack, setErrorStack] = useState('');
  
  // Abrir modal quando elemento é capturado
  useEffect(() => {
    if (clickedElement) {
      setShowCaptureModal(true);
    }
  }, [clickedElement]);

  useEffect(() => {
    fetchAnalyses();
  }, []);

  useEffect(() => {
    if (selectedAnalysis) {
      fetchFixes(selectedAnalysis.id);
    }
  }, [selectedAnalysis]);

  const fetchAnalyses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('error_analyses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnalyses(data || []);
    } catch (error) {
      console.error('Erro ao buscar análises:', error);
      toast.error('Erro ao carregar análises');
    } finally {
      setLoading(false);
    }
  };

  const fetchFixes = async (analysisId: string) => {
    try {
      const { data, error } = await supabase
        .from('fix_suggestions')
        .select('*')
        .eq('analysis_id', analysisId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFixes(data || []);
    } catch (error) {
      console.error('Erro ao buscar correções:', error);
    }
  };

  const createAnalysis = async () => {
    if (!errorMessage.trim()) {
      toast.error('Digite uma mensagem de erro');
      return;
    }

    try {
      setAnalyzing(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      // Criar análise
      const { data: analysis, error: analysisError } = await supabase
        .from('error_analyses')
        .insert({
          user_id: user.id,
          error_type: 'manual',
          error_message: errorMessage,
          error_stack: errorStack || null,
          error_context: {},
          console_logs: [],
          network_requests: [],
          status: 'pending'
        })
        .select()
        .single();

      if (analysisError) throw analysisError;

      toast.success('Análise criada! Aguarde enquanto a IA analisa...');

      // Chamar edge function para análise
      const { error: analyzeError } = await supabase.functions.invoke('ai-analyze-error', {
        body: { analysis_id: analysis.id }
      });

      if (analyzeError) throw analyzeError;

      // Limpar form
      setErrorMessage('');
      setErrorStack('');

      // Atualizar lista
      await fetchAnalyses();

      toast.success('Análise concluída!');
    } catch (error: any) {
      console.error('Erro ao criar análise:', error);
      toast.error(error.message || 'Erro ao analisar');
    } finally {
      setAnalyzing(false);
    }
  };

  const createAnalysisFromCapture = async (captureData: any) => {
    try {
      setAnalyzing(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { data: analysis, error: analysisError } = await supabase
        .from('error_analyses')
        .insert({
          user_id: user.id,
          error_type: 'captured',
          error_message: captureData.description || 'Erro capturado via modo Caça Erro',
          error_context: captureData.element_context || {},
          element_context: captureData.element_context || {},
          console_logs: captureData.console_logs || [],
          network_requests: captureData.network_requests || [],
          status: 'pending'
        })
        .select()
        .single();

      if (analysisError) throw analysisError;

      toast.success('Análise em andamento...');

      const { error: analyzeError } = await supabase.functions.invoke('ai-analyze-error', {
        body: { analysis_id: analysis.id }
      });

      if (analyzeError) throw analyzeError;

      await fetchAnalyses();
      toast.success('Análise concluída!');
    } catch (error: any) {
      console.error('Erro:', error);
      toast.error(error.message || 'Erro ao analisar');
    } finally {
      setAnalyzing(false);
    }
  };

  const applyFix = async (fixId: string) => {
    try {
      const { error } = await supabase.functions.invoke('apply-fix', {
        body: { fix_id: fixId, create_snapshot: true }
      });

      if (error) throw error;

      toast.success('Correção aplicada! Um snapshot foi criado para rollback.');
      
      if (selectedAnalysis) {
        await fetchFixes(selectedAnalysis.id);
      }
      await fetchAnalyses();
    } catch (error: any) {
      console.error('Erro ao aplicar correção:', error);
      toast.error(error.message || 'Erro ao aplicar correção');
    }
  };

  const rollbackFix = async (fixId: string) => {
    try {
      const { error } = await supabase.functions.invoke('rollback-fix', {
        body: { fix_id: fixId }
      });

      if (error) throw error;

      toast.success('Correção revertida com sucesso!');
      
      if (selectedAnalysis) {
        await fetchFixes(selectedAnalysis.id);
      }
      await fetchAnalyses();
    } catch (error: any) {
      console.error('Erro ao reverter correção:', error);
      toast.error(error.message || 'Erro ao reverter correção');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default"><CheckCircle2 className="h-3 w-3 mr-1" /> Concluída</Badge>;
      case 'analyzing':
        return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Analisando</Badge>;
      case 'pending':
        return <Badge variant="outline"><AlertTriangle className="h-3 w-3 mr-1" /> Pendente</Badge>;
      case 'applied':
        return <Badge variant="default"><Play className="h-3 w-3 mr-1" /> Aplicada</Badge>;
      case 'rolled_back':
        return <Badge variant="secondary"><RotateCcw className="h-3 w-3 mr-1" /> Revertida</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Falhou</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (showConfig) {
    return (
      <AIProviderConfig onClose={() => setShowConfig(false)} />
    );
  }

  return (
    <>
      <ErrorCaptureModal
        open={showCaptureModal}
        onOpenChange={setShowCaptureModal}
        onAnalyze={createAnalysisFromCapture}
      />
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8 text-primary" />
            IA de Auto-Análise
          </h1>
          <p className="text-muted-foreground mt-1">
            Sistema inteligente de debug e correção de erros
          </p>
        </div>
        <Button variant="outline" onClick={() => setShowConfig(true)}>
          <Settings className="h-4 w-4 mr-2" />
          Configurar IA
        </Button>
      </div>

      <Tabs defaultValue="new" className="space-y-4">
        <TabsList>
          <TabsTrigger value="new">Nova Análise</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analisar Erro</CardTitle>
              <CardDescription>
                Cole o erro abaixo e deixe a IA analisar e sugerir correções
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Mensagem de Erro *</label>
                <Textarea
                  placeholder="Cole a mensagem de erro aqui..."
                  value={errorMessage}
                  onChange={(e) => setErrorMessage(e.target.value)}
                  rows={3}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Stack Trace (opcional)</label>
                <Textarea
                  placeholder="Cole o stack trace completo aqui..."
                  value={errorStack}
                  onChange={(e) => setErrorStack(e.target.value)}
                  rows={6}
                  className="font-mono text-xs"
                />
              </div>

              <Button 
                onClick={createAnalysis} 
                disabled={analyzing || !errorMessage.trim()}
                className="w-full"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analisando com IA...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Analisar com IA
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="text-muted-foreground mt-2">Carregando...</p>
            </div>
          ) : analyses.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bug className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhuma análise realizada ainda</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <h3 className="font-medium">Análises Recentes</h3>
                <ScrollArea className="h-[600px]">
                  <div className="space-y-2 pr-4">
                    {analyses.map((analysis) => (
                      <Card 
                        key={analysis.id}
                        className={`cursor-pointer transition-colors ${
                          selectedAnalysis?.id === analysis.id ? 'border-primary' : ''
                        }`}
                        onClick={() => setSelectedAnalysis(analysis)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate text-sm">
                                {analysis.error_message}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {format(new Date(analysis.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </div>
                            </div>
                            {getStatusBadge(analysis.status)}
                          </div>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <div>
                {selectedAnalysis ? (
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <CardTitle className="text-base">Detalhes da Análise</CardTitle>
                            <CardDescription className="mt-1">
                              {format(new Date(selectedAnalysis.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                            </CardDescription>
                          </div>
                          {getStatusBadge(selectedAnalysis.status)}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <div className="text-sm font-medium mb-1">Erro:</div>
                          <div className="text-sm bg-muted p-3 rounded-lg">
                            {selectedAnalysis.error_message}
                          </div>
                        </div>

                        {selectedAnalysis.error_stack && (
                          <div>
                            <div className="text-sm font-medium mb-1">Stack Trace:</div>
                            <ScrollArea className="h-32">
                              <pre className="text-xs bg-muted p-3 rounded-lg">
                                {selectedAnalysis.error_stack}
                              </pre>
                            </ScrollArea>
                          </div>
                        )}

                        {selectedAnalysis.analysis_result && (
                          <div>
                            <div className="text-sm font-medium mb-1">Análise da IA:</div>
                            <div className="text-sm bg-muted p-3 rounded-lg">
                              {selectedAnalysis.analysis_result.root_cause || 'Análise em andamento...'}
                            </div>
                          </div>
                        )}

                        <div className="text-xs text-muted-foreground">
                          Provider: {selectedAnalysis.ai_provider} 
                          {selectedAnalysis.ai_model && ` (${selectedAnalysis.ai_model})`}
                        </div>
                      </CardContent>
                    </Card>

                    <div className="space-y-2">
                      <h4 className="font-medium">Correções Sugeridas</h4>
                      {fixes.length === 0 ? (
                        <Card>
                          <CardContent className="py-8 text-center text-muted-foreground text-sm">
                            Nenhuma correção sugerida ainda
                          </CardContent>
                        </Card>
                      ) : (
                        <div className="space-y-2">
                          {fixes.map((fix) => (
                            <FixSuggestionCard
                              key={fix.id}
                              fix={fix}
                              onApply={() => applyFix(fix.id)}
                              onRollback={() => rollbackFix(fix.id)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Code className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        Selecione uma análise para ver os detalhes
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
      </div>
    </>
  );
}
