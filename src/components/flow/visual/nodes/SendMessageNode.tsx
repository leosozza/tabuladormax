// ============================================
// Send Message Node - Sends message to Chatwoot
// ============================================

import { Handle, Position, NodeProps } from 'reactflow';
import { MessageSquare } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { FlowStepSendMessage } from '@/types/flow';

export function SendMessageNode({ data, selected }: NodeProps<FlowStepSendMessage>) {
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
          <MessageSquare className="w-4 h-4 text-green-500" />
          <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
            Mensagem
          </Badge>
        </div>
        <h4 className="font-semibold text-sm mb-1">{data.nome}</h4>
        {data.descricao && (
          <p className="text-xs text-muted-foreground mb-2">{data.descricao}</p>
        )}
        <div className="text-xs">
          {data.config.message && (
            <p className="text-muted-foreground line-clamp-2">
              "{data.config.message}"
            </p>
          )}
        </div>
      </Card>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </>
  );
}
