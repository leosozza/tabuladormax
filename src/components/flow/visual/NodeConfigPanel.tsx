// ============================================
// Node Config Panel - Configure selected node
// ============================================

import { Node } from 'reactflow';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { FlowStep, FlowStepTabular, FlowStepHttpCall, FlowStepWait } from '@/types/flow';

interface NodeConfigPanelProps {
  selectedNode: Node | null;
  onUpdate: (nodeId: string, updates: Partial<FlowStep>) => void;
}

export function NodeConfigPanel({ selectedNode, onUpdate }: NodeConfigPanelProps) {
  if (!selectedNode || selectedNode.id === 'start') {
    return (
      <Card className="p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Selecione um nó no canvas para configurar
        </p>
      </Card>
    );
  }

  const step = selectedNode.data as FlowStep;

  const updateConfig = (key: string, value: any) => {
    onUpdate(selectedNode.id, {
      config: { ...step.config, [key]: value }
    } as Partial<FlowStep>);
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="font-semibold">Configurar Nó</h3>
            <Badge variant="outline">{step.type}</Badge>
          </div>
        </div>

        {/* Common fields */}
        <div className="space-y-2">
          <Label>Nome *</Label>
          <Input
            value={step.nome}
            onChange={(e) => onUpdate(selectedNode.id, { nome: e.target.value })}
            placeholder="Nome do step"
          />
        </div>

        <div className="space-y-2">
          <Label>Descrição</Label>
          <Textarea
            value={step.descricao || ''}
            onChange={(e) => onUpdate(selectedNode.id, { descricao: e.target.value })}
            placeholder="Descrição opcional"
            rows={2}
          />
        </div>

        <div className="border-t pt-4">
          <h4 className="font-medium text-sm mb-3">Configurações Específicas</h4>

          {/* Tabular specific */}
          {step.type === 'tabular' && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Webhook URL *</Label>
                <Input
                  value={(step as FlowStepTabular).config.webhook_url || ''}
                  onChange={(e) => updateConfig('webhook_url', e.target.value)}
                  placeholder="https://..."
                  className="text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Campo *</Label>
                  <Input
                    value={(step as FlowStepTabular).config.field || ''}
                    onChange={(e) => updateConfig('field', e.target.value)}
                    placeholder="STATUS_ID"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Valor *</Label>
                  <Input
                    value={(step as FlowStepTabular).config.value || ''}
                    onChange={(e) => updateConfig('value', e.target.value)}
                    placeholder="CONVERTED"
                    className="text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* HTTP Call specific */}
          {step.type === 'http_call' && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Método *</Label>
                <Select
                  value={(step as FlowStepHttpCall).config.method}
                  onValueChange={(val) => updateConfig('method', val)}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="PATCH">PATCH</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">URL *</Label>
                <Input
                  value={(step as FlowStepHttpCall).config.url || ''}
                  onChange={(e) => updateConfig('url', e.target.value)}
                  placeholder="https://api.example.com/endpoint"
                  className="text-sm"
                />
              </div>
            </div>
          )}

          {/* Wait specific */}
          {step.type === 'wait' && (
            <div>
              <Label className="text-xs">Segundos *</Label>
              <Input
                type="number"
                min="1"
                value={(step as FlowStepWait).config.seconds}
                onChange={(e) => updateConfig('seconds', parseInt(e.target.value) || 5)}
                className="text-sm"
              />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
