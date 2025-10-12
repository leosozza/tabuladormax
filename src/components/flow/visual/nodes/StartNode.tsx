// ============================================
// Start Node - Initial node for flows
// ============================================

import { Handle, Position } from 'reactflow';
import { Play } from 'lucide-react';
import { Card } from '@/components/ui/card';

export function StartNode() {
  return (
    <>
      <Card className="p-4 min-w-[180px] bg-primary/10 border-primary">
        <div className="flex items-center gap-2 justify-center">
          <Play className="w-5 h-5 text-primary" />
          <h4 className="font-semibold text-primary">Início</h4>
        </div>
      </Card>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </>
  );
}
