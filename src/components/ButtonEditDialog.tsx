import { Plus, Trash2, Info, Save, MoreVertical, Search, Workflow, Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { BitrixField, getLeadStatuses } from "@/lib/bitrix";
import { BUTTON_CATEGORIES, type ButtonCategory, type ButtonLayout } from "@/lib/button-layout";
import { useState, useEffect } from "react";
import { createFlowFromButton } from "@/handlers/flowFromButton";
import type { Flow } from "@/types/flow";
import { FlowBuilder } from "@/components/flow/FlowBuilder";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface SubButton {
  subLabel: string;
  subDescription?: string;
  subWebhook: string;
  subField: string;
  subValue: string;
  subHotkey?: string;
  subAdditionalFields?: Array<{ field: string; value: string }>;
  transfer_conversation?: boolean;
}

interface ButtonConfig {
  id: string;
  label: string;
  description?: string;
  color: string;
  webhook_url: string;
  field: string;
  value: string;
  field_type: string;
  action_type: string;
  hotkey: string;
  sort: number;
  layout: ButtonLayout;
  sub_buttons: SubButton[];
  sync_target?: 'bitrix' | 'supabase';
  additional_fields?: Array<{ field: string; value: string }>;
  transfer_conversation?: boolean;
}

interface Category {
  id: string;
  name: string;
  label: string;
  sort_order: number;
}

interface SupabaseField {
  name: string;
  title: string;
  type: string;
}

interface ButtonEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  button: ButtonConfig | null;
  categories: Category[];
  bitrixFields: BitrixField[];
  supabaseFields: SupabaseField[];
  onUpdate: (id: string, updates: Partial<Omit<ButtonConfig, "id" | "layout" | "sub_buttons">>) => void;
  onUpdateLayout: (id: string, updates: Partial<ButtonLayout>) => void;
  onAddSubButton: (id: string) => void;
  onRemoveSubButton: (id: string, subIndex: number) => void;
  onUpdateSubButton: (id: string, subIndex: number, updates: Partial<SubButton>) => void;
  onFieldDrop: (event: React.DragEvent<HTMLDivElement>, buttonId: string, subIndex?: number) => void;
  onMoveButton: (buttonId: string, category: string, targetIndex?: number) => void;
  onDelete: (id: string) => void;
  onSave: () => Promise<void>;
  renderFieldValueControl: (fieldName: string, value: string, onChange: (value: string) => void) => React.ReactNode;
  onAddAdditionalField: (id: string) => void;
  onRemoveAdditionalField: (id: string, fieldIndex: number) => void;
  onUpdateAdditionalField: (id: string, fieldIndex: number, updates: { field?: string; value?: string }) => void;
  onAddSubAdditionalField: (id: string, subIndex: number) => void;
  onRemoveSubAdditionalField: (id: string, subIndex: number, fieldIndex: number) => void;
  onUpdateSubAdditionalField: (id: string, subIndex: number, fieldIndex: number, updates: { field?: string; value?: string }) => void;
}

export function ButtonEditDialog({
  open,
  onOpenChange,
  button,
  categories,
  bitrixFields,
  supabaseFields,
  onUpdate,
  onUpdateLayout,
  onAddSubButton,
  onRemoveSubButton,
  onUpdateSubButton,
  onFieldDrop,
  onDelete,
  onSave,
  renderFieldValueControl,
  onAddAdditionalField,
  onRemoveAdditionalField,
  onUpdateAdditionalField,
  onAddSubAdditionalField,
  onRemoveSubAdditionalField,
  onUpdateSubAdditionalField,
}: ButtonEditDialogProps) {
  const [flowBuilderOpen, setFlowBuilderOpen] = useState(false);
  const [currentFlow, setCurrentFlow] = useState<Flow | null>(null);

  if (!button) return null;

  const handleOpenFlowBuilder = () => {
    // Create flow from the current button state
    const flow = createFlowFromButton(button);
    setCurrentFlow(flow);
    setFlowBuilderOpen(true);
  };

  const handleFlowBuilderSave = () => {
    setFlowBuilderOpen(false);
    setCurrentFlow(null);
    // Optionally refresh flows list if needed
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Editar Botão: {button.label}</DialogTitle>
            <DialogDescription>
              Configure as propriedades e ações do botão
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6 py-4">
              {/* Basic Information */}
              <Card className="p-4">
                <h3 className="text-sm font-semibold mb-4">Informações Básicas</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="label">Label *</Label>
                    <Input
                      id="label"
                      value={button.label}
                      onChange={(e) => onUpdate(button.id, { label: e.target.value })}
                      placeholder="Nome do botão"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="color">Cor</Label>
                    <div className="flex gap-2">
                      <Input
                        id="color"
                        type="color"
                        value={button.color}
                        onChange={(e) => onUpdate(button.id, { color: e.target.value })}
                        className="w-20"
                      />
                      <Input
                        value={button.color}
                        onChange={(e) => onUpdate(button.id, { color: e.target.value })}
                        placeholder="#3b82f6"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Input
                      id="description"
                      value={button.description || ''}
                      onChange={(e) => onUpdate(button.id, { description: e.target.value })}
                      placeholder="Descrição do botão"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Categoria</Label>
                    <Select
                      value={button.layout.category}
                      onValueChange={(value) => onUpdateLayout(button.id, { category: value as ButtonCategory })}
                    >
                      <SelectTrigger id="category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.name}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hotkey">Atalho</Label>
                    <Input
                      id="hotkey"
                      value={button.hotkey}
                      onChange={(e) => onUpdate(button.id, { hotkey: e.target.value })}
                      placeholder="Ex: F1, F2, Ctrl+1"
                    />
                  </div>
                </div>
              </Card>

              {/* Action Configuration */}
              <Card className="p-4">
                <h3 className="text-sm font-semibold mb-4">Configuração da Ação</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="action_type">Tipo de Ação</Label>
                    <Select
                      value={button.action_type}
                      onValueChange={(value) => onUpdate(button.id, { action_type: value })}
                    >
                      <SelectTrigger id="action_type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="simple">Simples</SelectItem>
                        <SelectItem value="tabular">Tabulação</SelectItem>
                        <SelectItem value="http_call">Chamada HTTP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sync_target">Destino da Sincronização</Label>
                    <Select
                      value={button.sync_target || 'bitrix'}
                      onValueChange={(value) => onUpdate(button.id, { sync_target: value as 'bitrix' | 'supabase' })}
                    >
                      <SelectTrigger id="sync_target">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bitrix">Bitrix</SelectItem>
                        <SelectItem value="supabase">Supabase</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="webhook_url">Webhook URL</Label>
                    <Input
                      id="webhook_url"
                      value={button.webhook_url}
                      onChange={(e) => onUpdate(button.id, { webhook_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="field">Campo</Label>
                      <Select
                        value={button.field}
                        onValueChange={(value) => onUpdate(button.id, { field: value })}
                      >
                        <SelectTrigger id="field">
                          <SelectValue placeholder="Selecione um campo" />
                        </SelectTrigger>
                        <SelectContent>
                          {button.sync_target === 'supabase'
                            ? supabaseFields.map((field) => (
                                <SelectItem key={field.name} value={`supabase.${field.name}`}>
                                  {field.title}
                                </SelectItem>
                              ))
                            : bitrixFields.map((field) => (
                                <SelectItem key={field.name} value={field.name}>
                                  {field.title}
                                </SelectItem>
                              ))
                          }
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="value">Valor</Label>
                      {renderFieldValueControl(
                        button.field,
                        button.value,
                        (value) => onUpdate(button.id, { value })
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="transfer_conversation"
                      checked={button.transfer_conversation || false}
                      onCheckedChange={(checked) =>
                        onUpdate(button.id, { transfer_conversation: checked as boolean })
                      }
                    />
                    <Label htmlFor="transfer_conversation" className="font-normal cursor-pointer">
                      Transferir conversa após executar
                    </Label>
                  </div>
                </div>
              </Card>

              {/* Additional Fields */}
              {button.additional_fields && button.additional_fields.length > 0 && (
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold">Campos Adicionais</h3>
                  </div>
                  <div className="space-y-3">
                    {button.additional_fields.map((addField, index) => (
                      <div key={index} className="flex gap-2 items-start">
                        <div className="flex-1 space-y-2">
                          <Select
                            value={addField.field}
                            onValueChange={(value) =>
                              onUpdateAdditionalField(button.id, index, { field: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Campo" />
                            </SelectTrigger>
                            <SelectContent>
                              {bitrixFields.map((field) => (
                                <SelectItem key={field.name} value={field.name}>
                                  {field.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1">
                          {renderFieldValueControl(
                            addField.field,
                            addField.value,
                            (value) => onUpdateAdditionalField(button.id, index, { value })
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemoveAdditionalField(button.id, index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAddAdditionalField(button.id)}
                    className="mt-3"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar Campo
                  </Button>
                </Card>
              )}

              {/* Sub-buttons */}
              {button.sub_buttons && button.sub_buttons.length > 0 && (
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold">Sub-botões</h3>
                  </div>
                  <div className="space-y-4">
                    {button.sub_buttons.map((subButton, index) => (
                      <Card key={index} className="p-3 bg-muted/50">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium">Sub-botão {index + 1}</h4>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onRemoveSubButton(button.id, index)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label>Label</Label>
                              <Input
                                value={subButton.subLabel}
                                onChange={(e) =>
                                  onUpdateSubButton(button.id, index, { subLabel: e.target.value })
                                }
                                placeholder="Nome do sub-botão"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Campo</Label>
                              <Select
                                value={subButton.subField}
                                onValueChange={(value) =>
                                  onUpdateSubButton(button.id, index, { subField: value })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Campo" />
                                </SelectTrigger>
                                <SelectContent>
                                  {bitrixFields.map((field) => (
                                    <SelectItem key={field.name} value={field.name}>
                                      {field.title}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2 col-span-2">
                              <Label>Valor</Label>
                              {renderFieldValueControl(
                                subButton.subField,
                                subButton.subValue,
                                (value) => onUpdateSubButton(button.id, index, { subValue: value })
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAddSubButton(button.id)}
                    className="mt-3"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar Sub-botão
                  </Button>
                </Card>
              )}
            </div>
          </ScrollArea>

          <Separator />

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => onDelete(button.id)}
              className="mr-auto"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Excluir
            </Button>

            <Button variant="outline" onClick={handleOpenFlowBuilder}>
              <Workflow className="w-4 h-4 mr-1" />
              Abrir no FlowBuilder
            </Button>

            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4 mr-1" />
              Cancelar
            </Button>

            <Button onClick={() => onSave()}>
              <Save className="w-4 h-4 mr-1" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FlowBuilder Modal */}
      <FlowBuilder
        open={flowBuilderOpen}
        onOpenChange={setFlowBuilderOpen}
        flow={currentFlow}
        onSave={handleFlowBuilderSave}
      />
    </>
  );
}