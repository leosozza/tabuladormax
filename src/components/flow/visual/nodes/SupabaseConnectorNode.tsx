import { Handle, Position, NodeProps } from 'reactflow';
import { Database } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { FlowStepSupabaseConnector } from '@/types/flow';

export function SupabaseConnectorNode({ data, selected }: NodeProps<FlowStepSupabaseConnector>) {
  return (
    <>
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <Card className={cn(
        "p-4 min-w-[280px] cursor-pointer transition-all hover:shadow-md",
        "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-300 dark:border-blue-700",
        selected && "ring-2 ring-blue-500 shadow-lg"
      )}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
            <Database className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-blue-900 dark:text-blue-100">{data.nome}</div>
            <Badge variant="outline" className="text-xs border-blue-400 text-blue-700 dark:border-blue-600 dark:text-blue-300">
              Supabase DB
            </Badge>
          </div>
        </div>
        
        {/* Config Preview */}
        <div className="space-y-2 bg-white/50 dark:bg-black/20 rounded p-2 text-xs">
          <div>
            <span className="font-semibold text-blue-900 dark:text-blue-100">Ação:</span>{' '}
            <span className="text-blue-700 dark:text-blue-300">{data.config.action}</span>
          </div>
          <div>
            <span className="font-semibold text-blue-900 dark:text-blue-100">Tabela:</span>{' '}
            <span className="text-blue-700 dark:text-blue-300">{data.config.table}</span>
          </div>
          {data.config.filters && (
            <div>
              <span className="font-semibold text-blue-900 dark:text-blue-100">Filtros:</span>{' '}
              <span className="text-blue-600 dark:text-blue-400">
                {Object.keys(data.config.filters).length} filtro(s)
              </span>
            </div>
          )}
          {data.config.data && (
            <div>
              <span className="font-semibold text-blue-900 dark:text-blue-100">Dados:</span>{' '}
              <span className="text-blue-600 dark:text-blue-400">
                {Object.keys(data.config.data).length} campo(s)
              </span>
            </div>
          )}
        </div>
      </Card>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </>
  );
}
