import { memo, useState } from 'react';
import { Node, Edge } from 'reactflow';
import { Sparkles, Loader2, Check, X, Wand2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AiFlowGeneratorProps {
  onGenerate: (nodes: Node[], edges: Edge[]) => void;
}

interface GeneratedPlan {
  steps: { id: string; name: string; type: string }[];
  decisions: { id: string; name: string; condition: string }[];
  connections: { from: string; to: string; label?: string }[];
  preview: {
    nodeCount: number;
    edgeCount: number;
    hasGateways: boolean;
  };
}

export const AiFlowGenerator = memo(function AiFlowGenerator({
  onGenerate,
}: AiFlowGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [plan, setPlan] = useState<GeneratedPlan | null>(null);
  const [generatedNodes, setGeneratedNodes] = useState<Node[]>([]);
  const [generatedEdges, setGeneratedEdges] = useState<Edge[]>([]);
  
  const handleAnalyze = async () => {
    if (!description.trim()) {
      toast.error('Por favor, descreva o processo que deseja criar');
      return;
    }
    
    setIsAnalyzing(true);
    setPlan(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-bpmn-flow', {
        body: { 
          description, 
          action: 'analyze' 
        }
      });
      
      if (error) throw error;
      
      if (data?.plan) {
        setPlan(data.plan);
        toast.success('Plano gerado com sucesso!');
      } else {
        throw new Error('Resposta inválida da IA');
      }
    } catch (error: any) {
      console.error('Error analyzing:', error);
      toast.error(error.message || 'Erro ao analisar o processo');
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  const handleGenerate = async () => {
    if (!plan) return;
    
    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-bpmn-flow', {
        body: { 
          description, 
          plan,
          action: 'generate' 
        }
      });
      
      if (error) throw error;
      
      if (data?.nodes && data?.edges) {
        setGeneratedNodes(data.nodes);
        setGeneratedEdges(data.edges);
        onGenerate(data.nodes, data.edges);
        toast.success('Fluxo gerado com sucesso!');
        setIsOpen(false);
        resetState();
      } else {
        throw new Error('Resposta inválida da IA');
      }
    } catch (error: any) {
      console.error('Error generating:', error);
      toast.error(error.message || 'Erro ao gerar o fluxo');
    } finally {
      setIsGenerating(false);
    }
  };
  
  const resetState = () => {
    setDescription('');
    setPlan(null);
    setGeneratedNodes([]);
    setGeneratedEdges([]);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetState();
    }}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2 rounded-xl h-9"
        >
          <Sparkles className="w-4 h-4" />
          <span>Gerar com IA</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" />
            Gerar Fluxo com IA
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 pt-4">
          {/* Description input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Descreva seu processo
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={`Exemplo:
Processo de contratação:
1. Definir requisitos da vaga
2. Publicar vaga
3. Revisar candidatos
4. Se aprovado, fazer entrevista
5. Se passou, enviar proposta
6. Se aceito, enviar email de boas-vindas`}
              className="min-h-[180px] resize-none"
              disabled={isAnalyzing || isGenerating}
            />
            <p className="text-xs text-muted-foreground">
              💡 Dica: Use "se/quando" para indicar decisões e ramificações
            </p>
          </div>
          
          {/* Analyze button */}
          {!plan && (
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !description.trim()}
              className="w-full gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Analisar e Gerar Plano
                </>
              )}
            </Button>
          )}
          
          {/* Plan preview */}
          {plan && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500" />
                  Plano Gerado
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPlan(null)}
                  className="h-7 text-xs"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Refazer
                </Button>
              </div>
              
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <div className="text-2xl font-bold text-blue-500">
                    {plan.steps.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Etapas</div>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <div className="text-2xl font-bold text-amber-500">
                    {plan.decisions.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Decisões</div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <div className="text-2xl font-bold text-emerald-500">
                    {plan.connections.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Conexões</div>
                </div>
              </div>
              
              {/* Steps list */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">Etapas identificadas:</span>
                <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
                  {plan.steps.map((step, index) => (
                    <div 
                      key={step.id}
                      className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-sm"
                    >
                      <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-medium">
                        {index + 1}
                      </span>
                      <span>{step.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground capitalize">
                        {step.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Decisions list */}
              {plan.decisions.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">Decisões:</span>
                  <div className="space-y-1.5">
                    {plan.decisions.map((decision) => (
                      <div 
                        key={decision.id}
                        className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm"
                      >
                        <span className="w-5 h-5 rounded bg-amber-500 text-white text-xs flex items-center justify-center font-bold">
                          ?
                        </span>
                        <span>{decision.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Action buttons */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="flex-1 gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Gerando fluxo...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Aprovar e Construir
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={isGenerating}
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
});

export default AiFlowGenerator;
