import { Handle, Position, NodeProps } from 'reactflow';
import { Workflow } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { FlowStepN8NConnector } from '@/types/flow';

export function N8NConnectorNode({ data, selected }: NodeProps<FlowStepN8NConnector>) {
  return (
    <>
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <Card className={cn(
        "p-4 min-w-[280px] cursor-pointer transition-all hover:shadow-md",
        "bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-300 dark:border-purple-700",
        selected && "ring-2 ring-purple-500 shadow-lg"
      )}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center">
            <Workflow className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-purple-900 dark:text-purple-100">{data.nome}</div>
            <Badge variant="outline" className="text-xs border-purple-400 text-purple-700 dark:border-purple-600 dark:text-purple-300">
              N8N Webhook
            </Badge>
          </div>
        </div>
        
        {/* Config Preview */}
        <div className="space-y-2 bg-white/50 dark:bg-black/20 rounded p-2 text-xs">
          <div>
            <span className="font-semibold text-purple-900 dark:text-purple-100">Método:</span>{' '}
            <span className="text-purple-700 dark:text-purple-300">{data.config.method}</span>
          </div>
          <div>
            <span className="font-semibold text-purple-900 dark:text-purple-100">Webhook:</span>{' '}
            <span className="text-purple-600 dark:text-purple-400 truncate block">
              {data.config.webhook_url.split('/').pop()}
            </span>
          </div>
          {data.config.payload && (
            <div>
              <span className="font-semibold text-purple-900 dark:text-purple-100">Payload:</span>{' '}
              <span className="text-purple-600 dark:text-purple-400">
                {Object.keys(data.config.payload).length} campo(s)
              </span>
            </div>
          )}
        </div>
      </Card>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </>
  );
}
