// ============================================
// Node Palette - Drag & drop or click to add nodes
// ============================================

import { MousePointerClick, Globe, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { FlowStepType } from '@/types/flow';

interface NodePaletteProps {
  onAddNode: (type: FlowStepType) => void;
}

const nodeTypes = [
  {
    type: 'tabular' as const,
    label: 'Tabulação',
    description: 'Ação de botão',
    icon: MousePointerClick,
    color: 'text-blue-500'
  },
  {
    type: 'http_call' as const,
    label: 'HTTP Call',
    description: 'Requisição HTTP',
    icon: Globe,
    color: 'text-purple-500'
  },
  {
    type: 'wait' as const,
    label: 'Aguardar',
    description: 'Adicionar delay',
    icon: Clock,
    color: 'text-amber-500'
  }
];

export function NodePalette({ onAddNode }: NodePaletteProps) {
  return (
    <Card className="p-4">
      <h3 className="font-semibold text-sm mb-3">Adicionar Nó</h3>
      <div className="space-y-2">
        {nodeTypes.map(({ type, label, description, icon: Icon, color }) => (
          <Button
            key={type}
            variant="outline"
            className="w-full justify-start h-auto py-3 hover:bg-accent"
            onClick={() => onAddNode(type)}
          >
            <div className="flex items-start gap-3 text-left w-full">
              <Icon className={`w-5 h-5 mt-0.5 ${color} flex-shrink-0`} />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{label}</div>
                <div className="text-xs text-muted-foreground">{description}</div>
              </div>
            </div>
          </Button>
        ))}
      </div>
    </Card>
  );
}
