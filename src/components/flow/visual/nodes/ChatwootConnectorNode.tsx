import { Handle, Position, NodeProps } from 'reactflow';
import { MessageSquare } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { FlowStepChatwootConnector } from '@/types/flow';

export function ChatwootConnectorNode({ data, selected }: NodeProps<FlowStepChatwootConnector>) {
  return (
    <>
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <Card className={cn(
        "p-4 min-w-[280px] cursor-pointer transition-all hover:shadow-md",
        "bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-300 dark:border-green-700",
        selected && "ring-2 ring-green-500 shadow-lg"
      )}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-green-900 dark:text-green-100">{data.nome}</div>
            <Badge variant="outline" className="text-xs border-green-400 text-green-700 dark:border-green-600 dark:text-green-300">
              Chatwoot
            </Badge>
          </div>
        </div>
        
        {/* Config Preview */}
        <div className="space-y-2 bg-white/50 dark:bg-black/20 rounded p-2 text-xs">
          <div>
            <span className="font-semibold text-green-900 dark:text-green-100">Ação:</span>{' '}
            <span className="text-green-700 dark:text-green-300">{data.config.action}</span>
          </div>
          {data.config.conversation_id && (
            <div>
              <span className="font-semibold text-green-900 dark:text-green-100">Conversa:</span>{' '}
              <span className="text-green-600 dark:text-green-400">{data.config.conversation_id}</span>
            </div>
          )}
          {data.config.message && (
            <div>
              <span className="font-semibold text-green-900 dark:text-green-100">Mensagem:</span>{' '}
              <span className="text-green-600 dark:text-green-400 truncate block">
                {data.config.message.substring(0, 50)}...
              </span>
            </div>
          )}
          {data.config.agent_id && (
            <div>
              <span className="font-semibold text-green-900 dark:text-green-100">Agente ID:</span>{' '}
              <span className="text-green-600 dark:text-green-400">{data.config.agent_id}</span>
            </div>
          )}
        </div>
      </Card>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </>
  );
}
