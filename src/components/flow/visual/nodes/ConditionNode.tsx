// ============================================
// Condition Node - Conditional logic branching
// ============================================

import { Handle, Position, NodeProps } from 'reactflow';
import { GitBranch } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { FlowStepCondition } from '@/types/flow';

export function ConditionNode({ data, selected }: NodeProps<FlowStepCondition>) {
  const conditionCount = data.config.conditions?.length || 0;

  return (
    <>
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <Card
        className={cn(
          'p-3 min-w-[200px] cursor-pointer transition-all hover:shadow-md',
          selected && 'ring-2 ring-primary shadow-lg'
        )}
      >
        <div className="flex items-center gap-2 mb-2">
          <GitBranch className="w-4 h-4 text-yellow-500" />
          <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-700">
            Condição
          </Badge>
        </div>
        <h4 className="font-semibold text-sm mb-1">{data.nome}</h4>
        {data.descricao && (
          <p className="text-xs text-muted-foreground mb-2">{data.descricao}</p>
        )}
        <div className="text-xs">
          <div className="flex gap-1">
            <span className="font-medium">Lógica:</span>
            <span className="text-muted-foreground">{data.config.logic || 'AND'}</span>
          </div>
          <div className="flex gap-1">
            <span className="font-medium">Condições:</span>
            <span className="text-muted-foreground">{conditionCount}</span>
          </div>
        </div>
        <div className="flex gap-2 mt-3 text-xs">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
            ✓ Verdadeiro
          </Badge>
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
            ✗ Falso
          </Badge>
        </div>
      </Card>
      <Handle type="source" position={Position.Bottom} id="true" className="w-3 h-3 !bg-green-500 !left-[30%]" />
      <Handle type="source" position={Position.Bottom} id="false" className="w-3 h-3 !bg-red-500 !left-[70%]" />
    </>
  );
}
