import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { useGupshupTemplates } from '@/hooks/useGupshupTemplates';
import { useBulkTemplateSend } from '@/hooks/useBulkTemplateSend';
import { AgentConversation } from '@/hooks/useAgentConversations';

interface BulkTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedConversations: AgentConversation[];
  onSuccess: () => void;
}

export function BulkTemplateModal({
  open,
  onOpenChange,
  selectedConversations,
  onSuccess,
}: BulkTemplateModalProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [variables, setVariables] = useState<string[]>([]);
  
  const { data: templates = [] } = useGupshupTemplates({ enabled: true });
  const { sending, progress, results, sendBulkTemplate, reset } = useBulkTemplateSend();

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
  const templateVariables = selectedTemplate?.variables || [];

  const handleVariableChange = (index: number, value: string) => {
    const newVariables = [...variables];
    newVariables[index] = value;
    setVariables(newVariables);
  };

  const handleSend = async () => {
    if (!selectedTemplateId) return;

    const response = await sendBulkTemplate(
      selectedConversations.map(c => c.conversation_id),
      selectedTemplateId,
      variables
    );

    if (response) {
      setTimeout(() => {
        reset();
        setSelectedTemplateId('');
        setVariables([]);
        onSuccess();
        onOpenChange(false);
      }, 3000);
    }
  };

  const handleClose = () => {
    if (!sending) {
      reset();
      setSelectedTemplateId('');
      setVariables([]);
      onOpenChange(false);
    }
  };

  const canSend = selectedTemplateId && 
    variables.length === templateVariables.length &&
    variables.every(v => v.trim() !== '');

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] w-[95vw] sm:w-full flex flex-col">
        <DialogHeader className="px-4 sm:px-6">
          <DialogTitle className="text-base sm:text-lg">
            Enviar Template em Lote
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Enviar para {selectedConversations.length} conversa{selectedConversations.length !== 1 ? 's' : ''}
          </p>
        </DialogHeader>

        {results.length > 0 ? (
          // Resultados
          <div className="flex-1 space-y-4">
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                {results.every(r => r.success) ? (
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                ) : results.every(r => !r.success) ? (
                  <XCircle className="h-8 w-8 text-destructive" />
                ) : (
                  <AlertCircle className="h-8 w-8 text-orange-500" />
                )}
                <h3 className="text-lg font-semibold">
                  {results.filter(r => r.success).length} sucesso{results.filter(r => r.success).length !== 1 ? 's' : ''}
                  {' / '}
                  {results.filter(r => !r.success).length} falha{results.filter(r => !r.success).length !== 1 ? 's' : ''}
                </h3>
              </div>
            </div>

            <ScrollArea className="h-64">
              <div className="space-y-2">
                {results.map((result) => {
                  const conv = selectedConversations.find(
                    c => c.conversation_id === result.conversation_id
                  );
                  return (
                    <Card key={result.conversation_id}>
                      <CardContent className="p-3 flex items-center gap-3">
                        {result.success ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {conv?.lead_name || 'Desconhecido'}
                          </p>
                          {result.error && (
                            <p className="text-xs text-destructive">{result.error}</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        ) : sending ? (
          // Enviando
          <div className="flex-1 flex flex-col items-center justify-center space-y-4">
            <div className="animate-pulse">
              <Send className="h-12 w-12 text-primary" />
            </div>
            <p className="text-lg font-medium">Enviando templates...</p>
            <Progress value={progress} className="w-full max-w-sm" />
          </div>
        ) : (
          // Formulário
          <div className="flex-1 flex flex-col gap-4 overflow-hidden px-4 sm:px-6">
            {/* Lista de conversas selecionadas */}
            <div>
              <Label className="mb-2 block">Conversas selecionadas:</Label>
              <ScrollArea className="h-24 rounded-md border p-2">
                <div className="flex flex-wrap gap-2">
                  {selectedConversations.map((conv) => {
                    const initials = conv.lead_name
                      .split(' ')
                      .map(n => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2);
                    
                    return (
                      <div
                        key={conv.conversation_id}
                        className="flex items-center gap-2 bg-muted rounded-md px-2 py-1"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={conv.thumbnail || undefined} />
                          <AvatarFallback className="text-xs bg-primary/10">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs">{conv.lead_name}</span>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Seletor de template */}
            <div>
              <Label htmlFor="template" className="mb-2 block">Template:</Label>
              <select
                id="template"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedTemplateId}
                onChange={(e) => {
                  setSelectedTemplateId(e.target.value);
                  setVariables([]);
                }}
              >
                <option value="">Selecione um template</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.display_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Variáveis do template */}
            {templateVariables.length > 0 && (
              <div className="space-y-2">
                <Label>Variáveis do template:</Label>
                <ScrollArea className="max-h-40">
                  <div className="space-y-2">
                    {templateVariables.map((variable, index) => (
                      <div key={variable.index}>
                        <Label htmlFor={`var-${index}`} className="text-xs">
                          {variable.name} (exemplo: {variable.example})
                        </Label>
                        <Input
                          id={`var-${index}`}
                          placeholder={variable.example}
                          value={variables[index] || ''}
                          onChange={(e) => handleVariableChange(index, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Preview */}
            {selectedTemplate && (
              <Card>
                <CardContent className="p-3">
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    Preview:
                  </Label>
                  <p className="text-sm whitespace-pre-wrap">
                    {selectedTemplate.template_body.replace(
                      /\{\{(\d+)\}\}/g,
                      (_, index) => variables[parseInt(index) - 1] || `{{${index}}}`
                    )}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <DialogFooter className="px-4 sm:px-6 flex-col-reverse sm:flex-row gap-2">
          {results.length > 0 ? (
            <Button onClick={handleClose} className="w-full sm:w-auto">Fechar</Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={sending} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button onClick={handleSend} disabled={!canSend || sending} className="w-full sm:w-auto">
                <Send className="h-4 w-4 mr-2" />
                Enviar para {selectedConversations.length}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
