// ============================================
// Tabular Node - Button action node
// ============================================

import { Handle, Position, NodeProps } from 'reactflow';
import { MousePointerClick } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { FlowStepTabular } from '@/types/flow';

export function TabularNode({ data, selected }: NodeProps<FlowStepTabular>) {
  return (
    <>
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <Card className={cn(
        "p-3 min-w-[200px] cursor-pointer transition-all hover:shadow-md",
        selected && "ring-2 ring-primary shadow-lg"
      )}>
        <div className="flex items-center gap-2 mb-2">
          <MousePointerClick className="w-4 h-4 text-blue-500" />
          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
            Tabular
          </Badge>
        </div>
        <h4 className="font-semibold text-sm mb-1">{data.nome}</h4>
        {data.descricao && (
          <p className="text-xs text-muted-foreground mb-2">{data.descricao}</p>
        )}
        <div className="text-xs space-y-1">
          <div className="flex gap-1">
            <span className="font-medium">Campo:</span>
            <span className="text-muted-foreground truncate">{data.config.field || '-'}</span>
          </div>
          <div className="flex gap-1">
            <span className="font-medium">Valor:</span>
            <span className="text-muted-foreground truncate">{data.config.value || '-'}</span>
          </div>
        </div>
      </Card>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </>
  );
}
