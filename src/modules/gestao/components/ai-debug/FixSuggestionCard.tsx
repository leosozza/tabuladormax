import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CheckCircle2, 
  Code, 
  FileText, 
  Play,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from 'react';

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

interface FixSuggestionCardProps {
  fix: FixSuggestion;
  onApply: () => void;
  onRollback: () => void;
}

export function FixSuggestionCard({ fix, onApply, onRollback }: FixSuggestionCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline"><AlertTriangle className="h-3 w-3 mr-1" /> Pendente</Badge>;
      case 'approved':
        return <Badge variant="secondary"><CheckCircle2 className="h-3 w-3 mr-1" /> Aprovada</Badge>;
      case 'applied':
        return <Badge variant="default"><Play className="h-3 w-3 mr-1" /> Aplicada</Badge>;
      case 'rolled_back':
        return <Badge variant="secondary"><RotateCcw className="h-3 w-3 mr-1" /> Revertida</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejeitada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'code_change':
        return <Code className="h-4 w-4" />;
      case 'config_change':
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'code_change':
        return <Badge variant="secondary">Código</Badge>;
      case 'config_change':
        return <Badge variant="secondary">Configuração</Badge>;
      case 'dependency_update':
        return <Badge variant="secondary">Dependência</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardContent className="py-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="mt-1">
                  {getTypeIcon(fix.fix_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{fix.fix_title}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {fix.fix_description.substring(0, 100)}
                    {fix.fix_description.length > 100 ? '...' : ''}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {getTypeBadge(fix.fix_type)}
                    {fix.file_path && (
                      <Badge variant="outline" className="text-xs font-mono">
                        {fix.file_path}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(fix.status)}
              </div>
            </div>
          </CardContent>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            <div className="border-t pt-4">
              <div className="text-sm font-medium mb-2">Descrição Completa:</div>
              <div className="text-sm bg-muted p-3 rounded-lg">
                {fix.fix_description}
              </div>
            </div>

            {fix.suggested_code && (
              <div>
                <div className="text-sm font-medium mb-2">Código Sugerido:</div>
                <ScrollArea className="h-64 w-full rounded-lg border">
                  <pre className="p-4 text-xs">
                    <code>{fix.suggested_code}</code>
                  </pre>
                </ScrollArea>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              {fix.status === 'pending' && (
                <Button onClick={onApply} size="sm" className="flex-1">
                  <Play className="h-4 w-4 mr-2" />
                  Aplicar Correção
                </Button>
              )}

              {fix.status === 'applied' && fix.snapshot_id && (
                <Button 
                  onClick={onRollback} 
                  size="sm" 
                  variant="outline"
                  className="flex-1"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reverter Correção
                </Button>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
