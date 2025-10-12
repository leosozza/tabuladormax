// ============================================
// Wait Node - Delay node
// ============================================

import { Handle, Position, NodeProps } from 'reactflow';
import { Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { FlowStepWait } from '@/types/flow';

export function WaitNode({ data, selected }: NodeProps<FlowStepWait>) {
  return (
    <>
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <Card className={cn(
        "p-3 min-w-[180px] cursor-pointer transition-all hover:shadow-md",
        selected && "ring-2 ring-primary shadow-lg"
      )}>
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-amber-500" />
          <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700">
            Aguardar
          </Badge>
        </div>
        <h4 className="font-semibold text-sm mb-1">{data.nome}</h4>
        {data.descricao && (
          <p className="text-xs text-muted-foreground mb-2">{data.descricao}</p>
        )}
        <div className="text-xs">
          <span className="font-medium">Duração:</span>
          <span className="text-muted-foreground ml-1">{data.config.seconds}s</span>
        </div>
      </Card>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </>
  );
}
