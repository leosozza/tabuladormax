// ============================================
// Variable Picker - Lists available variables for flows
// ============================================

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

const commonVariables = [
  { path: 'event', description: 'Tipo do evento', example: 'message_created', category: 'Event' },
  { path: 'id', description: 'ID da mensagem', example: '123', category: 'Message' },
  { path: 'content', description: 'Conteúdo da mensagem', example: 'Hello', category: 'Message' },
  { path: 'message_type', description: 'Tipo da mensagem', example: 'incoming', category: 'Message' },
  { path: 'content_type', description: 'Tipo de conteúdo', example: 'text', category: 'Message' },
  { path: 'created_at', description: 'Data de criação', example: '1234567890', category: 'Message' },
  { path: 'private', description: 'Mensagem privada', example: 'false', category: 'Message' },
  { path: 'source_id', description: 'ID da fonte', example: 'abc123', category: 'Message' },

  { path: 'sender.id', description: 'ID do remetente', example: '1', category: 'Sender' },
  { path: 'sender.name', description: 'Nome do remetente', example: 'John Doe', category: 'Sender' },
  { path: 'sender.email', description: 'Email do remetente', example: 'john@example.com', category: 'Sender' },
  { path: 'sender.phone_number', description: 'Telefone do remetente', example: '+1234567890', category: 'Sender' },
  { path: 'sender.type', description: 'Tipo do remetente', example: 'contact', category: 'Sender' },
  { path: 'sender.thumbnail', description: 'Avatar do remetente', example: 'url', category: 'Sender' },

  { path: 'conversation.id', description: 'ID da conversa', example: '456', category: 'Conversation' },
  { path: 'conversation.inbox_id', description: 'ID da inbox', example: '1', category: 'Conversation' },
  { path: 'conversation.status', description: 'Status da conversa', example: 'open', category: 'Conversation' },
  { path: 'conversation.assignee_id', description: 'ID do agente atribuído', example: '2', category: 'Conversation' },
  { path: 'conversation.team_id', description: 'ID do time atribuído', example: '1', category: 'Conversation' },
  { path: 'conversation.unread_count', description: 'Mensagens não lidas', example: '5', category: 'Conversation' },
  { path: 'conversation.priority', description: 'Prioridade', example: 'medium', category: 'Conversation' },

  { path: 'account.id', description: 'ID da conta', example: '1', category: 'Account' },
  { path: 'account.name', description: 'Nome da conta', example: 'My Company', category: 'Account' },
];

export function VariablePicker() {
  const [search, setSearch] = useState('');
  const [copiedVar, setCopiedVar] = useState<string | null>(null);

  const filteredVariables = commonVariables.filter(
    (v) =>
      v.path.toLowerCase().includes(search.toLowerCase()) ||
      v.description.toLowerCase().includes(search.toLowerCase()) ||
      v.category.toLowerCase().includes(search.toLowerCase())
  );

  const groupedVariables = filteredVariables.reduce((acc, variable) => {
    if (!acc[variable.category]) {
      acc[variable.category] = [];
    }
    acc[variable.category].push(variable);
    return acc;
  }, {} as Record<string, typeof commonVariables>);

  const handleCopy = (variable: string) => {
    const formatted = `{{${variable}}}`;
    navigator.clipboard.writeText(formatted);
    setCopiedVar(variable);
    setTimeout(() => setCopiedVar(null), 2000);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="p-4 border-b">
        <h3 className="font-semibold mb-3">Variáveis</h3>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {Object.entries(groupedVariables).map(([category, variables]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold text-muted-foreground mb-2">{category}</h4>
              <div className="space-y-2">
                {variables.map((variable) => (
                  <div
                    key={variable.path}
                    className="p-2 rounded-lg border bg-card hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => handleCopy(variable.path)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono text-primary break-all">{`{{${variable.path}}}`}</code>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(variable.path);
                            }}
                          >
                            {copiedVar === variable.path ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{variable.description}</p>
                        <Badge variant="outline" className="mt-1 text-xs">
                          Ex: {variable.example}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="p-4 border-t bg-muted/50">
        <p className="text-xs text-muted-foreground">
          💡 Clique para copiar. Use <code className="text-xs bg-background px-1 py-0.5 rounded">{`{{variavel}}`}</code> nos campos.
        </p>
      </div>
    </div>
  );
}
