import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, Copy, Check, Loader2 } from 'lucide-react';
import { useAITrainingInstructions } from '@/hooks/useAITraining';
import { toast } from 'sonner';

export function ContextPreview() {
  const { data: instructions, isLoading } = useAITrainingInstructions();
  const [copied, setCopied] = useState(false);

  const activeInstructions = instructions?.filter((inst) => inst.is_active) || [];

  // Group by category
  const byCategory = activeInstructions.reduce((acc, inst) => {
    if (!acc[inst.category]) acc[inst.category] = [];
    acc[inst.category].push(inst);
    return acc;
  }, {} as Record<string, typeof activeInstructions>);

  // Build preview context
  const buildContext = () => {
    if (activeInstructions.length === 0) {
      return 'Nenhuma instrução ativa no momento.';
    }

    let context = '=== TREINAMENTO CUSTOMIZADO ===\n\n';
    
    const categoryLabels: Record<string, string> = {
      procedures: 'PROCEDIMENTOS',
      product_knowledge: 'CONHECIMENTO DE PRODUTO',
      responses: 'TOM DE RESPOSTA',
      business_rules: 'REGRAS DE NEGÓCIO',
      other: 'OUTROS',
    };

    for (const [category, items] of Object.entries(byCategory)) {
      context += `\n### ${categoryLabels[category] || category.toUpperCase()}\n\n`;
      
      // Sort by priority
      const sortedItems = [...items].sort((a, b) => b.priority - a.priority);
      
      sortedItems.forEach((item) => {
        context += `**${item.title}** (Prioridade: ${item.priority})\n${item.content}\n\n`;
      });
    }

    return context;
  };

  const contextText = buildContext();
  
  // Estimate tokens (rough approximation: 1 token ≈ 4 characters)
  const estimatedTokens = Math.ceil(contextText.length / 4);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(contextText);
      setCopied(true);
      toast.success('Context copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Erro ao copiar');
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Carregando preview...</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Card */}
      <Card className="p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-primary">{activeInstructions.length}</p>
            <p className="text-sm text-muted-foreground">Instruções Ativas</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-primary">{Object.keys(byCategory).length}</p>
            <p className="text-sm text-muted-foreground">Categorias</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-primary">{estimatedTokens}</p>
            <p className="text-sm text-muted-foreground">Tokens Estimados</p>
          </div>
        </div>
      </Card>

      {/* Preview Card */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Context do System Prompt</h3>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              disabled={activeInstructions.length === 0}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar
                </>
              )}
            </Button>
          </div>

          <div className="bg-muted rounded-lg p-4 max-h-[600px] overflow-auto">
            <pre className="text-sm text-foreground whitespace-pre-wrap font-mono">
              {contextText}
            </pre>
          </div>

          {activeInstructions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center">
              Ative algumas instruções para visualizar o context que será enviado para a IA
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
