// ============================================
// N8N Workflow Picker - Select workflows from MCP
// ============================================

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Search, Workflow, RefreshCw, CheckCircle2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface N8NWorkflow {
  id: string;
  name: string;
  description?: string;
  triggerType?: string;
  active?: boolean;
  tags?: string[];
}

interface N8NWorkflowPickerProps {
  selectedWorkflowId?: string;
  onSelect: (workflow: N8NWorkflow | null) => void;
}

export function N8NWorkflowPicker({ selectedWorkflowId, onSelect }: N8NWorkflowPickerProps) {
  const [workflows, setWorkflows] = useState<N8NWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedWorkflow, setSelectedWorkflow] = useState<N8NWorkflow | null>(null);

  const fetchWorkflows = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('n8n-mcp-proxy', {
        body: { action: 'list-workflows', search }
      });

      if (fnError) {
        throw new Error(fnError.message || 'Erro ao buscar workflows');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setWorkflows(data?.workflows || []);

      // Se tiver um workflow selecionado, buscar detalhes
      if (selectedWorkflowId && !selectedWorkflow) {
        const selected = data?.workflows?.find((w: N8NWorkflow) => w.id === selectedWorkflowId);
        if (selected) {
          setSelectedWorkflow(selected);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar workflows:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const handleSelect = (workflow: N8NWorkflow) => {
    setSelectedWorkflow(workflow);
    onSelect(workflow);
    toast.success(`Workflow "${workflow.name}" selecionado`);
  };

  const handleClear = () => {
    setSelectedWorkflow(null);
    onSelect(null);
  };

  const filteredWorkflows = workflows.filter(w => 
    w.name.toLowerCase().includes(search.toLowerCase()) ||
    w.description?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-4 border-destructive">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">Erro ao conectar com n8n</p>
            <p className="text-xs text-muted-foreground mt-1">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={fetchWorkflows}>
              <RefreshCw className="h-3 w-3 mr-2" />
              Tentar novamente
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (selectedWorkflow) {
    return (
      <Card className="p-4 border-primary/50 bg-primary/5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">{selectedWorkflow.name}</p>
              {selectedWorkflow.description && (
                <p className="text-xs text-muted-foreground mt-1">{selectedWorkflow.description}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                {selectedWorkflow.triggerType && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedWorkflow.triggerType}
                  </Badge>
                )}
                {selectedWorkflow.active !== undefined && (
                  <Badge variant={selectedWorkflow.active ? 'default' : 'outline'} className="text-xs">
                    {selectedWorkflow.active ? 'Ativo' : 'Inativo'}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClear}>
            Trocar
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar workflow..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>
        <Button variant="outline" size="icon" onClick={fetchWorkflows} title="Atualizar lista">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {filteredWorkflows.length === 0 ? (
        <Card className="p-6 text-center">
          <Workflow className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            {search ? 'Nenhum workflow encontrado' : 'Nenhum workflow disponível no n8n'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Certifique-se de que os workflows estejam ativos e disponíveis via MCP
          </p>
        </Card>
      ) : (
        <ScrollArea className="h-[200px]">
          <div className="space-y-2">
            {filteredWorkflows.map((workflow) => (
              <Card
                key={workflow.id}
                className="p-3 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                onClick={() => handleSelect(workflow)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{workflow.name}</p>
                    {workflow.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {workflow.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      {workflow.triggerType && (
                        <Badge variant="outline" className="text-xs">
                          {workflow.triggerType}
                        </Badge>
                      )}
                      {workflow.tags?.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Workflow className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      <p className="text-xs text-muted-foreground">
        {filteredWorkflows.length} workflow(s) disponível(is)
      </p>
    </div>
  );
}
