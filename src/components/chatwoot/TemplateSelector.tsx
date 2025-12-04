import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Send, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface GupshupTemplate {
  id: string;
  template_id: string;
  element_name: string;
  display_name: string;
  category: string;
  template_body: string;
  variables: Array<{
    index: number;
    name: string;
    example: string;
  }>;
}

interface TemplateSelectorProps {
  onSendTemplate: (params: {
    templateId: string;
    variables: string[];
  }) => Promise<boolean>;
  disabled?: boolean;
}

export const TemplateSelector = ({ onSendTemplate, disabled }: TemplateSelectorProps) => {
  const [selectedTemplate, setSelectedTemplate] = useState<GupshupTemplate | null>(null);
  const [variables, setVariables] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  // Buscar usuário logado
  useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
      return user;
    }
  });

  // Buscar templates permitidos para o usuário
  const { data: templates, isLoading, refetch } = useQuery({
    queryKey: ['gupshup-templates', userId],
    queryFn: async () => {
      if (!userId) {
        // Se não tem userId, buscar todos os templates aprovados (modo admin)
        const { data, error } = await supabase
          .from('gupshup_templates')
          .select('*')
          .eq('status', 'APPROVED')
          .order('display_name');

        if (error) throw error;
        return data as unknown as GupshupTemplate[];
      }

      // Buscar apenas templates permitidos para este usuário
      const { data, error } = await supabase
        .from('gupshup_templates')
        .select(`
          *,
          agent_template_permissions!inner(user_id)
        `)
        .eq('agent_template_permissions.user_id', userId)
        .eq('status', 'APPROVED')
        .order('display_name');

      if (error) throw error;
      return data as unknown as GupshupTemplate[];
    },
    enabled: true
  });

  // Renderizar preview do template substituindo variáveis
  const renderTemplatePreview = (body: string, vars: string[]) => {
    let preview = body;
    vars.forEach((value, index) => {
      const placeholder = `{{${index + 1}}}`;
      preview = preview.replace(placeholder, value || `[${index + 1}]`);
    });
    return preview;
  };

  // Verificar se todas as variáveis foram preenchidas
  const allVariablesFilled = () => {
    if (!selectedTemplate) return false;
    return selectedTemplate.variables.every((_, index) => {
      return variables[index] && variables[index].trim() !== '';
    });
  };

  const handleSend = async () => {
    if (!selectedTemplate || !allVariablesFilled()) return;

    const success = await onSendTemplate({
      templateId: selectedTemplate.template_id,
      variables,
    });

    if (success) {
      setVariables([]);
      setSelectedTemplate(null);
      toast.success('Template enviado com sucesso!');
    }
  };

  const handleTemplateSelect = (template: GupshupTemplate) => {
    setSelectedTemplate(template);
    // Inicializar array de variáveis com valores vazios
    setVariables(new Array(template.variables.length).fill(''));
  };

  return (
    <div className="flex flex-col h-full p-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-sm">📱 Templates WhatsApp</h3>
        <Button
          onClick={() => refetch()}
          size="sm"
          variant="ghost"
          disabled={disabled || isLoading}
        >
          <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
        </Button>
      </div>

      {/* Lista de templates */}
      {!selectedTemplate && (
        <ScrollArea className="flex-1 pr-4 mt-4">
          {isLoading ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              Carregando templates...
            </div>
          ) : templates && templates.length > 0 ? (
            <div className="space-y-2">
              {templates.map((template) => (
                <Card
                  key={template.id}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => handleTemplateSelect(template)}
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm font-medium">
                        {template.display_name}
                      </CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {template.category}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-2">
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {template.template_body}
                    </p>
                    {template.variables.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        📝 {template.variables.length} variáveis
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center text-sm text-muted-foreground py-8">
              Nenhum template disponível
            </div>
          )}
        </ScrollArea>
      )}

      {/* Preview e formulário de variáveis */}
      {selectedTemplate && (
        <ScrollArea className="flex-1 pr-4 mt-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">{selectedTemplate.display_name}</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedTemplate(null);
                  setVariables([]);
                }}
              >
                Voltar
              </Button>
            </div>

            <Separator />

            {/* Preview */}
            <div className="bg-muted p-4 rounded-lg">
              <Label className="text-xs text-muted-foreground mb-2 block">
                Preview:
              </Label>
              <p className="text-sm font-mono whitespace-pre-wrap">
                {renderTemplatePreview(selectedTemplate.template_body, variables)}
              </p>
            </div>

            {/* Campos de variáveis */}
            {selectedTemplate.variables.length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm">Preencha as variáveis:</Label>
                {selectedTemplate.variables.map((variable, index) => (
                  <div key={index} className="space-y-2">
                    <Label htmlFor={`var-${index}`} className="text-xs">
                      {variable.name || `Variável ${index + 1}`}
                      {variable.example && (
                        <span className="text-muted-foreground ml-1">
                          (ex: {variable.example})
                        </span>
                      )}
                    </Label>
                    <Input
                      id={`var-${index}`}
                      placeholder={variable.example || `Digite ${variable.name || `variável ${index + 1}`}`}
                      value={variables[index] || ''}
                      onChange={(e) => {
                        const newVars = [...variables];
                        newVars[index] = e.target.value;
                        setVariables(newVars);
                      }}
                      disabled={disabled}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Botão enviar */}
            <Button
              onClick={handleSend}
              disabled={disabled || !allVariablesFilled()}
              className="w-full"
            >
              <Send className="w-4 h-4 mr-2" />
              Enviar Template
            </Button>
          </div>
        </ScrollArea>
      )}
    </div>
  );
};