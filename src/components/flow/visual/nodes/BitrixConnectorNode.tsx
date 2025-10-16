import { Handle, Position, NodeProps } from 'reactflow';
import { Database } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { FlowStepBitrixConnector } from '@/types/flow';

export function BitrixConnectorNode({ data, selected }: NodeProps<FlowStepBitrixConnector>) {
  return (
    <>
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <Card className={cn(
        "p-4 min-w-[280px] cursor-pointer transition-all hover:shadow-md",
        "bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-300 dark:border-orange-700",
        selected && "ring-2 ring-orange-500 shadow-lg"
      )}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center">
            <Database className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-orange-900 dark:text-orange-100">{data.nome}</div>
            <Badge variant="outline" className="text-xs border-orange-400 text-orange-700 dark:border-orange-600 dark:text-orange-300">
              Bitrix CRM
            </Badge>
          </div>
        </div>
        
        {/* Config Preview */}
        <div className="space-y-2 bg-white/50 dark:bg-black/20 rounded p-2 text-xs">
          <div>
            <span className="font-semibold text-orange-900 dark:text-orange-100">Ação:</span>{' '}
            <span className="text-orange-700 dark:text-orange-300">{data.config.action}</span>
          </div>
          <div>
            <span className="font-semibold text-orange-900 dark:text-orange-100">API:</span>{' '}
            <span className="text-orange-600 dark:text-orange-400 truncate block">
              {data.config.webhook_url.split('/').pop()}
            </span>
          </div>
          <div>
            <span className="font-semibold text-orange-900 dark:text-orange-100">Campo:</span>{' '}
            <span className="text-orange-700 dark:text-orange-300">{data.config.field}</span>
          </div>
          <div>
            <span className="font-semibold text-orange-900 dark:text-orange-100">Valor:</span>{' '}
            <span className="text-orange-700 dark:text-orange-300">{data.config.value}</span>
          </div>
          {data.config.additional_fields && data.config.additional_fields.length > 0 && (
            <div>
              <span className="font-semibold text-orange-900 dark:text-orange-100">
                +{data.config.additional_fields.length} campos adicionais
              </span>
            </div>
          )}
        </div>
      </Card>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </>
  );
}
