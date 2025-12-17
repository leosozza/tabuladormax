// ============================================
// Node Config Panel - Configure selected node
// ============================================

import { Node } from 'reactflow';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Plus, X } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { N8NWorkflowPicker } from './N8NWorkflowPicker';
import type { 
  FlowStep, 
  FlowStepTabular,
  FlowStepBitrixConnector,
  FlowStepSupabaseConnector,
  FlowStepN8NConnector,
  FlowStepHttpCall, 
  FlowStepWait,
  FlowStepSendMessage,
  FlowStepCondition,
  FlowStepScheduleMessage,
  FlowStepUpdateContact,
  FlowStepAddLabel,
  FlowStepAssignAgent,
  FlowStepAssignTeam,
  FlowStepBitrixGetField,
  FlowStepGupshupSendText,
  FlowStepGupshupSendImage,
  FlowStepGupshupSendButtons
} from '@/types/flow';
import { Checkbox } from '@/components/ui/checkbox';

interface NodeConfigPanelProps {
  selectedNode: Node | null;
  onUpdate: (nodeId: string, updates: Partial<FlowStep>) => void;
  onDelete: (nodeId: string) => void;
}

export function NodeConfigPanel({ selectedNode, onUpdate, onDelete }: NodeConfigPanelProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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

  const handleDelete = () => {
    onDelete(selectedNode.id);
    setShowDeleteDialog(false);
  };

  return (
    <>
      <div className="h-full flex flex-col bg-background">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">Configurar Nó</h3>
            <Badge variant="outline">{step.type}</Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
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

              {/* Bitrix Connector */}
              {step.type === 'bitrix_connector' && (
                <BitrixConnectorConfig step={step as FlowStepBitrixConnector} updateConfig={updateConfig} />
              )}

              {/* Supabase Connector */}
              {step.type === 'supabase_connector' && (
                <SupabaseConnectorConfig step={step as FlowStepSupabaseConnector} updateConfig={updateConfig} />
              )}

              {/* N8N Connector */}
              {step.type === 'n8n_connector' && (
                <N8NConnectorConfig step={step as FlowStepN8NConnector} updateConfig={updateConfig} />
              )}

              {/* Tabular */}
              {step.type === 'tabular' && (
                <TabularConfig step={step as FlowStepTabular} updateConfig={updateConfig} />
              )}

              {/* HTTP Call */}
              {step.type === 'http_call' && (
                <HttpCallConfig step={step as FlowStepHttpCall} updateConfig={updateConfig} />
              )}

              {/* Wait */}
              {step.type === 'wait' && (
                <WaitConfig step={step as FlowStepWait} updateConfig={updateConfig} />
              )}

              {/* Send Message */}
              {step.type === 'send_message' && (
                <SendMessageConfig step={step as FlowStepSendMessage} updateConfig={updateConfig} />
              )}

              {/* Condition */}
              {step.type === 'condition' && (
                <ConditionConfig step={step as FlowStepCondition} updateConfig={updateConfig} onUpdate={onUpdate} nodeId={selectedNode.id} />
              )}

              {/* Schedule Message */}
              {step.type === 'schedule_message' && (
                <ScheduleMessageConfig step={step as FlowStepScheduleMessage} updateConfig={updateConfig} />
              )}

              {/* Update Contact */}
              {step.type === 'update_contact' && (
                <UpdateContactConfig step={step as FlowStepUpdateContact} updateConfig={updateConfig} />
              )}

              {/* Add Label */}
              {step.type === 'add_label' && (
                <AddLabelConfig step={step as FlowStepAddLabel} updateConfig={updateConfig} onUpdate={onUpdate} nodeId={selectedNode.id} />
              )}

              {/* Assign Agent */}
              {step.type === 'assign_agent' && (
                <AssignAgentConfig step={step as FlowStepAssignAgent} updateConfig={updateConfig} />
              )}

              {/* Assign Team */}
              {step.type === 'assign_team' && (
                <AssignTeamConfig step={step as FlowStepAssignTeam} updateConfig={updateConfig} />
              )}

              {/* Bitrix Get Field */}
              {step.type === 'bitrix_get_field' && (
                <BitrixGetFieldConfig step={step as FlowStepBitrixGetField} updateConfig={updateConfig} />
              )}

              {/* Gupshup Send Text */}
              {step.type === 'gupshup_send_text' && (
                <GupshupSendTextConfig step={step as FlowStepGupshupSendText} updateConfig={updateConfig} />
              )}

              {/* Gupshup Send Image */}
              {step.type === 'gupshup_send_image' && (
                <GupshupSendImageConfig step={step as FlowStepGupshupSendImage} updateConfig={updateConfig} />
              )}

              {/* Gupshup Send Buttons */}
              {step.type === 'gupshup_send_buttons' && (
                <GupshupSendButtonsConfig step={step as FlowStepGupshupSendButtons} updateConfig={updateConfig} />
              )}
            </div>
          </div>
        </ScrollArea>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Nó</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar este nó? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Config Components
function TabularConfig({ step, updateConfig }: { step: FlowStepTabular; updateConfig: (key: string, value: any) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Webhook URL *</Label>
        <Input
          value={step.config.webhook_url}
          onChange={(e) => updateConfig('webhook_url', e.target.value)}
          placeholder="https://..."
          className="text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Campo *</Label>
          <Input
            value={step.config.field}
            onChange={(e) => updateConfig('field', e.target.value)}
            placeholder="STATUS_ID"
            className="text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">Valor *</Label>
          <Input
            value={step.config.value}
            onChange={(e) => updateConfig('value', e.target.value)}
            placeholder="CONVERTED"
            className="text-sm"
          />
        </div>
      </div>
    </div>
  );
}

function HttpCallConfig({ step, updateConfig }: { step: FlowStepHttpCall; updateConfig: (key: string, value: any) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Método *</Label>
        <Select value={step.config.method} onValueChange={(val) => updateConfig('method', val)}>
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
          value={step.config.url}
          onChange={(e) => updateConfig('url', e.target.value)}
          placeholder="https://api.example.com/endpoint"
          className="text-sm"
        />
      </div>
    </div>
  );
}

function WaitConfig({ step, updateConfig }: { step: FlowStepWait; updateConfig: (key: string, value: any) => void }) {
  return (
    <div>
      <Label className="text-xs">Segundos *</Label>
      <Input
        type="number"
        min="1"
        value={step.config.seconds}
        onChange={(e) => updateConfig('seconds', parseInt(e.target.value) || 5)}
        className="text-sm"
      />
    </div>
  );
}

function SendMessageConfig({ step, updateConfig }: { step: FlowStepSendMessage; updateConfig: (key: string, value: any) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Conversation ID</Label>
        <Input
          value={step.config.conversationId}
          onChange={(e) => updateConfig('conversationId', e.target.value)}
          placeholder="{{conversation.id}}"
          className="text-sm"
        />
      </div>
      <div>
        <Label className="text-xs">Mensagem *</Label>
        <Textarea
          value={step.config.message}
          onChange={(e) => updateConfig('message', e.target.value)}
          placeholder="Olá {{sender.name}}!"
          rows={4}
        />
      </div>
      <div>
        <Label className="text-xs">Tipo</Label>
        <Select value={step.config.messageType || 'outgoing'} onValueChange={(val) => updateConfig('messageType', val)}>
          <SelectTrigger className="text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="outgoing">Outgoing</SelectItem>
            <SelectItem value="incoming">Incoming</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function ConditionConfig({ step, updateConfig, onUpdate, nodeId }: { 
  step: FlowStepCondition; 
  updateConfig: (key: string, value: any) => void;
  onUpdate: (nodeId: string, updates: Partial<FlowStep>) => void;
  nodeId: string;
}) {
  const conditions = step.config.conditions || [];

  const addCondition = () => {
    const newConditions = [...conditions, { variable: '', operator: 'equals', value: '' }];
    updateConfig('conditions', newConditions);
  };

  const updateCondition = (index: number, updates: any) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    updateConfig('conditions', newConditions);
  };

  const removeCondition = (index: number) => {
    const newConditions = conditions.filter((_, i) => i !== index);
    updateConfig('conditions', newConditions);
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Lógica</Label>
        <Select value={step.config.logic} onValueChange={(val) => updateConfig('logic', val)}>
          <SelectTrigger className="text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AND">AND (todas)</SelectItem>
            <SelectItem value="OR">OR (qualquer)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Condições</Label>
        {conditions.map((condition, index) => (
          <Card key={index} className="p-3 mt-2">
            <div className="space-y-2">
              <Input
                value={condition.variable}
                onChange={(e) => updateCondition(index, { variable: e.target.value })}
                placeholder="{{message.content}}"
                className="text-sm"
              />
              <Select value={condition.operator} onValueChange={(val) => updateCondition(index, { operator: val })}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equals">Igual a</SelectItem>
                  <SelectItem value="not_equals">Diferente de</SelectItem>
                  <SelectItem value="contains">Contém</SelectItem>
                  <SelectItem value="not_contains">Não contém</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Input
                  value={condition.value}
                  onChange={(e) => updateCondition(index, { value: e.target.value })}
                  placeholder="Valor"
                  className="text-sm flex-1"
                />
                <Button variant="ghost" size="sm" onClick={() => removeCondition(index)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
        <Button variant="outline" size="sm" className="mt-2 w-full" onClick={addCondition}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar
        </Button>
      </div>
    </div>
  );
}

function ScheduleMessageConfig({ step, updateConfig }: { step: FlowStepScheduleMessage; updateConfig: (key: string, value: any) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Conversation ID</Label>
        <Input
          value={step.config.conversationId}
          onChange={(e) => updateConfig('conversationId', e.target.value)}
          placeholder="{{conversation.id}}"
          className="text-sm"
        />
      </div>
      <div>
        <Label className="text-xs">Mensagem *</Label>
        <Textarea
          value={step.config.message}
          onChange={(e) => updateConfig('message', e.target.value)}
          placeholder="Mensagem agendada"
          rows={4}
        />
      </div>
      <div>
        <Label className="text-xs">Delay (minutos) *</Label>
        <Input
          type="number"
          min="1"
          value={step.config.delayMinutes}
          onChange={(e) => updateConfig('delayMinutes', parseInt(e.target.value) || 60)}
          className="text-sm"
        />
      </div>
    </div>
  );
}

function UpdateContactConfig({ step, updateConfig }: { step: FlowStepUpdateContact; updateConfig: (key: string, value: any) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Contact ID</Label>
        <Input
          value={step.config.contactId}
          onChange={(e) => updateConfig('contactId', e.target.value)}
          placeholder="{{sender.id}}"
          className="text-sm"
        />
      </div>
      <div>
        <Label className="text-xs">Nome</Label>
        <Input
          value={step.config.name || ''}
          onChange={(e) => updateConfig('name', e.target.value)}
          placeholder="{{sender.name}}"
          className="text-sm"
        />
      </div>
      <div>
        <Label className="text-xs">Email</Label>
        <Input
          value={step.config.email || ''}
          onChange={(e) => updateConfig('email', e.target.value)}
          placeholder="email@example.com"
          className="text-sm"
        />
      </div>
      <div>
        <Label className="text-xs">Telefone</Label>
        <Input
          value={step.config.phone_number || ''}
          onChange={(e) => updateConfig('phone_number', e.target.value)}
          placeholder="+5511999999999"
          className="text-sm"
        />
      </div>
    </div>
  );
}

function AddLabelConfig({ step, updateConfig, onUpdate, nodeId }: { 
  step: FlowStepAddLabel; 
  updateConfig: (key: string, value: any) => void;
  onUpdate: (nodeId: string, updates: Partial<FlowStep>) => void;
  nodeId: string;
}) {
  const labels = step.config.labels || [];
  const [newLabel, setNewLabel] = useState('');

  const addLabel = () => {
    if (newLabel.trim()) {
      updateConfig('labels', [...labels, newLabel.trim()]);
      setNewLabel('');
    }
  };

  const removeLabel = (index: number) => {
    updateConfig('labels', labels.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Conversation ID</Label>
        <Input
          value={step.config.conversationId}
          onChange={(e) => updateConfig('conversationId', e.target.value)}
          placeholder="{{conversation.id}}"
          className="text-sm"
        />
      </div>
      <div>
        <Label className="text-xs">Labels</Label>
        <div className="flex gap-2 mt-2">
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Digite label..."
            className="text-sm flex-1"
            onKeyPress={(e) => e.key === 'Enter' && addLabel()}
          />
          <Button variant="outline" size="sm" onClick={addLabel}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {labels.map((label, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {label}
              <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => removeLabel(index)} />
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

function AssignAgentConfig({ step, updateConfig }: { step: FlowStepAssignAgent; updateConfig: (key: string, value: any) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Conversation ID</Label>
        <Input
          value={step.config.conversationId}
          onChange={(e) => updateConfig('conversationId', e.target.value)}
          placeholder="{{conversation.id}}"
          className="text-sm"
        />
      </div>
      <div>
        <Label className="text-xs">Agent ID *</Label>
        <Input
          value={step.config.agentId}
          onChange={(e) => updateConfig('agentId', e.target.value)}
          placeholder="123"
          className="text-sm"
        />
      </div>
    </div>
  );
}

// Bitrix Connector Config
function BitrixConnectorConfig({ step, updateConfig }: { step: FlowStepBitrixConnector; updateConfig: (key: string, value: any) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Ação *</Label>
        <Select value={step.config.action} onValueChange={(val) => updateConfig('action', val)}>
          <SelectTrigger className="text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="update_lead">Atualizar Lead</SelectItem>
            <SelectItem value="create_lead">Criar Lead</SelectItem>
            <SelectItem value="get_lead">Buscar Lead</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Webhook URL *</Label>
        <Input
          value={step.config.webhook_url}
          onChange={(e) => updateConfig('webhook_url', e.target.value)}
          className="text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Campo *</Label>
          <Input
            value={step.config.field}
            onChange={(e) => updateConfig('field', e.target.value)}
            className="text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">Valor *</Label>
          <Input
            value={step.config.value}
            onChange={(e) => updateConfig('value', e.target.value)}
            className="text-sm"
          />
        </div>
      </div>
    </div>
  );
}

// Supabase Connector Config
function SupabaseConnectorConfig({ step, updateConfig }: { step: FlowStepSupabaseConnector; updateConfig: (key: string, value: any) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Ação *</Label>
        <Select value={step.config.action} onValueChange={(val) => updateConfig('action', val)}>
          <SelectTrigger className="text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="update">Update</SelectItem>
            <SelectItem value="insert">Insert</SelectItem>
            <SelectItem value="select">Select</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Tabela *</Label>
        <Input
          value={step.config.table}
          onChange={(e) => updateConfig('table', e.target.value)}
          className="text-sm"
        />
      </div>
    </div>
  );
}

// N8N Connector Config with MCP support
function N8NConnectorConfig({ step, updateConfig }: { step: FlowStepN8NConnector; updateConfig: (key: string, value: any) => void }) {
  const mode = step.config.mode || 'webhook';

  const handleModeChange = (newMode: string) => {
    updateConfig('mode', newMode);
    // Clear fields when switching modes
    if (newMode === 'mcp') {
      updateConfig('webhook_url', '');
      updateConfig('method', 'POST');
    } else {
      updateConfig('workflow_id', '');
      updateConfig('workflow_name', '');
      updateConfig('workflow_inputs', {});
    }
  };

  const handleWorkflowSelect = (workflow: { id: string; name: string; description?: string; triggerType?: string } | null) => {
    if (workflow) {
      updateConfig('workflow_id', workflow.id);
      updateConfig('workflow_name', workflow.name);
    } else {
      updateConfig('workflow_id', '');
      updateConfig('workflow_name', '');
    }
  };

  return (
    <div className="space-y-4">
      {/* Mode Selection */}
      <div>
        <Label className="text-xs">Modo de Conexão</Label>
        <Select value={mode} onValueChange={handleModeChange}>
          <SelectTrigger className="text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="webhook">Webhook Manual</SelectItem>
            <SelectItem value="mcp">Selecionar Workflow (MCP)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {mode === 'webhook' ? (
        <>
          {/* Webhook Mode */}
          <div>
            <Label className="text-xs">Método *</Label>
            <Select value={step.config.method || 'POST'} onValueChange={(val) => updateConfig('method', val)}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Webhook URL *</Label>
            <Input
              value={step.config.webhook_url || ''}
              onChange={(e) => updateConfig('webhook_url', e.target.value)}
              placeholder="https://n8n.example.com/webhook/..."
              className="text-sm"
            />
          </div>
        </>
      ) : (
        <>
          {/* MCP Mode - Workflow Picker */}
          <div>
            <Label className="text-xs mb-2 block">Workflow n8n</Label>
            <N8NWorkflowPicker
              selectedWorkflowId={step.config.workflow_id}
              onSelect={handleWorkflowSelect}
            />
          </div>
          {step.config.workflow_id && (
            <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
              <strong>ID:</strong> {step.config.workflow_id}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AssignTeamConfig({ step, updateConfig }: { step: FlowStepAssignTeam; updateConfig: (key: string, value: any) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Conversation ID</Label>
        <Input
          value={step.config.conversationId}
          onChange={(e) => updateConfig('conversationId', e.target.value)}
          placeholder="{{conversation.id}}"
          className="text-sm"
        />
      </div>
      <div>
        <Label className="text-xs">Team ID *</Label>
        <Input
          value={step.config.teamId}
          onChange={(e) => updateConfig('teamId', e.target.value)}
          placeholder="456"
          className="text-sm"
        />
      </div>
    </div>
  );
}

function BitrixGetFieldConfig({ step, updateConfig }: { step: FlowStepBitrixGetField; updateConfig: (key: string, value: any) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Nome do Campo Bitrix *</Label>
        <Input
          value={step.config.field_name || ''}
          onChange={(e) => updateConfig('field_name', e.target.value)}
          placeholder="UF_CRM_1762971213"
          className="text-sm"
        />
        <p className="text-xs text-muted-foreground mt-1">
          ID do campo no Bitrix (ex: UF_CRM_...)
        </p>
      </div>
      <div>
        <Label className="text-xs">Variável de Saída *</Label>
        <Input
          value={step.config.output_variable || ''}
          onChange={(e) => updateConfig('output_variable', e.target.value)}
          placeholder="credencial_url"
          className="text-sm"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Nome da variável para usar em steps seguintes: {'{{credencial_url}}'}
        </p>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="is_file"
          checked={step.config.is_file || false}
          onCheckedChange={(checked) => updateConfig('is_file', checked)}
        />
        <Label htmlFor="is_file" className="text-xs">
          É um arquivo (converter ID → URL pública)
        </Label>
      </div>
    </div>
  );
}

function GupshupSendTextConfig({ step, updateConfig }: { step: FlowStepGupshupSendText; updateConfig: (key: string, value: any) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Mensagem *</Label>
        <Textarea
          value={step.config.message || ''}
          onChange={(e) => updateConfig('message', e.target.value)}
          placeholder="Olá {{name}}! Sua credencial está pronta."
          rows={4}
          className="text-sm"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Suporta variáveis: {'{{name}}, {{phone}}, {{credencial_url}}'}
        </p>
      </div>
    </div>
  );
}

function GupshupSendImageConfig({ step, updateConfig }: { step: FlowStepGupshupSendImage; updateConfig: (key: string, value: any) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">URL da Imagem *</Label>
        <Input
          value={step.config.image_url || ''}
          onChange={(e) => updateConfig('image_url', e.target.value)}
          placeholder="{{credencial_url}} ou https://..."
          className="text-sm"
        />
        <p className="text-xs text-muted-foreground mt-1">
          URL direta da imagem ou variável: {'{{credencial_url}}'}
        </p>
      </div>
      <div>
        <Label className="text-xs">Legenda (opcional)</Label>
        <Input
          value={step.config.caption || ''}
          onChange={(e) => updateConfig('caption', e.target.value)}
          placeholder="Sua credencial"
          className="text-sm"
        />
      </div>
    </div>
  );
}

function GupshupSendButtonsConfig({ step, updateConfig }: { step: FlowStepGupshupSendButtons; updateConfig: (key: string, value: any) => void }) {
  const buttons = step.config.buttons || [];

  const addButton = () => {
    const newButtons = [...buttons, { id: `btn_${buttons.length + 1}`, title: '' }];
    updateConfig('buttons', newButtons);
  };

  const updateButton = (index: number, field: string, value: string) => {
    const newButtons = [...buttons];
    newButtons[index] = { ...newButtons[index], [field]: value };
    updateConfig('buttons', newButtons);
  };

  const removeButton = (index: number) => {
    updateConfig('buttons', buttons.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Mensagem *</Label>
        <Textarea
          value={step.config.message || ''}
          onChange={(e) => updateConfig('message', e.target.value)}
          placeholder="Escolha uma opção:"
          rows={3}
          className="text-sm"
        />
      </div>
      <div>
        <Label className="text-xs">Botões (máx. 3)</Label>
        {buttons.map((button, index) => (
          <Card key={index} className="p-2 mt-2">
            <div className="flex gap-2 items-center">
              <Input
                value={button.id}
                onChange={(e) => updateButton(index, 'id', e.target.value)}
                placeholder="ID"
                className="text-sm w-24"
              />
              <Input
                value={button.title}
                onChange={(e) => updateButton(index, 'title', e.target.value)}
                placeholder="Texto do botão"
                className="text-sm flex-1"
              />
              <Button variant="ghost" size="sm" onClick={() => removeButton(index)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
        {buttons.length < 3 && (
          <Button variant="outline" size="sm" className="mt-2 w-full" onClick={addButton}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Botão
          </Button>
        )}
      </div>
    </div>
  );
}
