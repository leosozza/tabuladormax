// ============================================
// HTTP Call Node - HTTP request node
// ============================================

import { Handle, Position, NodeProps } from 'reactflow';
import { Globe } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { FlowStepHttpCall } from '@/types/flow';

const methodColors = {
  GET: 'bg-green-100 text-green-700',
  POST: 'bg-blue-100 text-blue-700',
  PUT: 'bg-yellow-100 text-yellow-700',
  PATCH: 'bg-orange-100 text-orange-700',
  DELETE: 'bg-red-100 text-red-700'
};

export function HttpCallNode({ data, selected }: NodeProps<FlowStepHttpCall>) {
  return (
    <>
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <Card className={cn(
        "p-3 min-w-[200px] cursor-pointer transition-all hover:shadow-md",
        selected && "ring-2 ring-primary shadow-lg"
      )}>
        <div className="flex items-center gap-2 mb-2">
          <Globe className="w-4 h-4 text-purple-500" />
          <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
            HTTP
          </Badge>
          <Badge className={cn("text-xs", methodColors[data.config.method])}>
            {data.config.method}
          </Badge>
        </div>
        <h4 className="font-semibold text-sm mb-1">{data.nome}</h4>
        {data.descricao && (
          <p className="text-xs text-muted-foreground mb-2">{data.descricao}</p>
        )}
        <div className="text-xs">
          <span className="font-medium">URL:</span>
          <p className="text-muted-foreground truncate mt-1">{data.config.url || '-'}</p>
        </div>
      </Card>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </>
  );
}
