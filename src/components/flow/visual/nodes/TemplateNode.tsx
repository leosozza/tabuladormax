// ============================================
// Template Node - Visual node for WhatsApp templates
// Shows separate output handles for each button
// ============================================

import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TemplateButton {
  id: string;
  text: string;
  nextStepId?: string;
}

interface TemplateNodeProps {
  data: {
    nome: string;
    descricao?: string;
    type: string;
    config?: {
      template_name?: string;
      template_id?: string;
      variables?: Array<{ index: number; value: string }>;
      buttons?: TemplateButton[];
    };
  };
  selected?: boolean;
}

export const TemplateNode = memo(({ data, selected }: TemplateNodeProps) => {
  const templateName = data.config?.template_name || 'Selecionar template...';
  const variablesCount = data.config?.variables?.filter(v => v.value)?.length || 0;
  const buttons = data.config?.buttons || [];

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
          {variablesCount > 0 && (
            <Badge variant="outline" className="text-xs px-1.5 py-0 mt-1">
              {variablesCount} vars
            </Badge>
          )}
        </div>
      </div>

      {/* Buttons section with individual handles */}
      {buttons.length > 0 ? (
        <div className="mt-3 pt-2 border-t border-border/50 space-y-1.5">
          <div className="text-xs text-muted-foreground font-medium mb-1">Botões:</div>
          {buttons.map((btn, index) => (
            <div 
              key={btn.id || index} 
              className="relative flex items-center justify-between gap-2 text-xs bg-muted/50 rounded px-2 py-1.5"
            >
              <span className="truncate flex-1">{btn.text}</span>
              <Handle
                type="source"
                position={Position.Right}
                id={`button-${index}`}
                className="!bg-green-500 !w-2.5 !h-2.5 !right-[-6px]"
                style={{ top: 'auto', position: 'relative', transform: 'none' }}
              />
            </div>
          ))}
        </div>
      ) : (
        <Handle type="source" position={Position.Bottom} className="!bg-primary" />
      )}
    </div>
  );
});

TemplateNode.displayName = 'TemplateNode';
