// ============================================
// Template Node - Visual node for WhatsApp templates
// ============================================

import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TemplateNodeProps {
  data: {
    nome: string;
    descricao?: string;
    type: string;
    config?: {
      template_name?: string;
      template_id?: string;
      variables?: Array<{ index: number; value: string }>;
      buttons?: Array<{ id: string; text: string; nextStepId?: string }>;
    };
  };
  selected?: boolean;
}

export const TemplateNode = memo(({ data, selected }: TemplateNodeProps) => {
  const templateName = data.config?.template_name || 'Selecionar template...';
  const variablesCount = data.config?.variables?.filter(v => v.value)?.length || 0;
  const buttonsCount = data.config?.buttons?.length || 0;

  return (
    <div
      className={`
        px-4 py-3 rounded-lg border-2 bg-card min-w-[200px] max-w-[280px]
        ${selected ? 'border-primary shadow-lg' : 'border-border'}
        transition-all duration-200
      `}
    >
      <Handle type="target" position={Position.Top} className="!bg-primary" />
      
      <div className="flex items-start gap-2">
        <div className="p-2 rounded-md bg-green-500/10 text-green-600">
          <FileText className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{data.nome}</div>
          <div className="text-xs text-muted-foreground truncate mt-0.5">
            {templateName}
          </div>
          {(variablesCount > 0 || buttonsCount > 0) && (
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {variablesCount > 0 && (
                <Badge variant="outline" className="text-xs px-1.5 py-0">
                  {variablesCount} vars
                </Badge>
              )}
              {buttonsCount > 0 && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  {buttonsCount} botões
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-primary" />
    </div>
  );
});

TemplateNode.displayName = 'TemplateNode';
