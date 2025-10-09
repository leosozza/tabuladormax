import { Plus, Trash2, Info, Save, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BitrixField } from "@/lib/bitrix";
import { BUTTON_CATEGORIES, type ButtonCategory, type ButtonLayout } from "@/lib/button-layout";

interface SubButton {
  subLabel: string;
  subDescription?: string;
  subWebhook: string;
  subField: string;
  subValue: string;
  subHotkey?: string;
  subAdditionalFields?: Array<{ field: string; value: string }>;
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
}

interface SupabaseField {
  name: string;
  title: string;
  type: string;
}

interface Category {
  id: string;
  name: string;
  label: string;
  sort_order: number;
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
  onMoveButton: (id: string, category: string) => void;
  onDelete: (id: string) => void;
  onSave: () => void;
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
  onMoveButton,
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
  if (!button) return null;

  const fieldMeta = bitrixFields.find((field) => field.name === button.field);

  const handleDelete = () => {
    if (confirm(`Tem certeza que deseja excluir o botão "${button.label}"?`)) {
      onDelete(button.id);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Botão: {button.label}</DialogTitle>
          <DialogDescription>
            Configure o botão, campos de sincronização, webhooks e sub-botões (motivos).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pointer-events-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Nome do Botão</Label>
              <Input
                value={button.label}
                onChange={(event) => onUpdate(button.id, { label: event.target.value })}
              />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <Label>Descrição/Dica</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Texto que aparece ao passar o mouse sobre o botão</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                value={button.description || ""}
                onChange={(event) => onUpdate(button.id, { description: event.target.value })}
                placeholder="Ex: Confirmar agendamento e enviar notificação"
              />
            </div>

            <div>
              <Label>Cor</Label>
              <Input
                type="color"
                value={button.color}
                onChange={(event) => onUpdate(button.id, { color: event.target.value })}
              />
            </div>

            <div>
              <Label>Categoria</Label>
              <Select
                value={button.layout.category}
                onValueChange={(value) => {
                  if (value !== button.layout.category) {
                    onMoveButton(button.id, value);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-[200]">
                  {categories.map((item) => (
                    <SelectItem key={item.id} value={item.name}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Destino de Sincronização</Label>
              <Select
                value={button.sync_target || 'bitrix'}
                onValueChange={(value: 'bitrix' | 'supabase') => {
                  onUpdate(button.id, { sync_target: value });
                  // Limpar campo quando mudar destino
                  onUpdate(button.id, { field: '', value: '' });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-[200]">
                  <SelectItem value="bitrix">
                    🔷 Bitrix → Supabase
                  </SelectItem>
                  <SelectItem value="supabase">
                    ⚡ Supabase → Bitrix
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {button.sync_target === 'supabase' 
                  ? 'Atualiza Supabase primeiro, depois Bitrix'
                  : 'Atualiza Bitrix primeiro, depois Supabase'}
              </p>
            </div>

            <div className="md:col-span-2">
              <Label>URL do Webhook {button.sync_target === 'bitrix' && '(Bitrix)'}</Label>
              <Input
                value={button.webhook_url}
                onChange={(event) =>
                  onUpdate(button.id, {
                    webhook_url: event.target.value,
                  })
                }
                placeholder="https://..."
              />
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <Label>
                  Campo do {button.sync_target === 'supabase' ? 'Supabase' : 'Bitrix'}
                </Label>
                {button.field && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onUpdate(button.id, { field: '', value: '', field_type: 'string' })}
                    className="h-6 text-xs text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Limpar
                  </Button>
                )}
              </div>
              <Select
                value={button.field || ""}
                onValueChange={(value) => {
                  const fields = button.sync_target === 'supabase' ? supabaseFields : bitrixFields;
                  const fieldMeta = fields.find((f) => f.name === value);
                  
                  onUpdate(button.id, { 
                    field: value,
                    field_type: fieldMeta?.type || 'string',
                    value: '' // Limpar valor ao mudar campo
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={`Selecione um campo ${button.sync_target === 'supabase' ? 'Supabase' : 'Bitrix'}`}>
                    {button.field ? (
                      (() => {
                        const fields = button.sync_target === 'supabase' ? supabaseFields : bitrixFields;
                        const selectedField = fields.find(f => f.name === button.field);
                        return selectedField ? selectedField.title : button.field;
                      })()
                    ) : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-background z-[200] max-h-[300px]">
                  {button.sync_target === 'supabase' 
                    ? supabaseFields.map((field) => (
                        <SelectItem key={field.name} value={field.name}>
                          <div className="flex flex-col">
                            <span className="font-medium">{field.title}</span>
                            <span className="text-xs text-muted-foreground">{field.type}</span>
                          </div>
                        </SelectItem>
                      ))
                    : bitrixFields.map((field) => (
                        <SelectItem key={field.name} value={field.name}>
                          <div className="flex flex-col">
                            <span className="font-medium">{field.title}</span>
                            <span className="text-xs text-muted-foreground">{field.type}</span>
                          </div>
                        </SelectItem>
                      ))
                  }
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Label>Valor Padrão</Label>
              {button.field ? (
                renderFieldValueControl(button.field, button.value, (value) =>
                  onUpdate(button.id, { value }),
                )
              ) : (
                <Input 
                  disabled 
                  placeholder="Selecione um campo primeiro" 
                  className="bg-muted"
                />
              )}
            </div>

            <div>
              <Label>Tipo de Ação</Label>
              <Select
                value={button.action_type}
                onValueChange={(value) => onUpdate(button.id, { action_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-[200]">
                  <SelectItem value="simple">✅ Simples</SelectItem>
                  <SelectItem value="schedule">📅 Agendamento</SelectItem>
                  <SelectItem value="text">✏️ Campo de Texto</SelectItem>
                  <SelectItem value="date">📆 Data</SelectItem>
                  <SelectItem value="datetime">🕐 Data e Hora</SelectItem>
                  <SelectItem value="list">📋 Lista</SelectItem>
                  <SelectItem value="number">🔢 Número</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Atalho de Teclado</Label>
              <Input
                value={button.hotkey}
                onChange={(event) => onUpdate(button.id, { hotkey: event.target.value })}
                placeholder="1, 2, Ctrl+1, etc"
              />
            </div>

            <div>
              <Label>Largura (1 a 3 colunas)</Label>
              <Input
                type="number"
                min={1}
                max={3}
                value={button.layout.w}
                onChange={(event) =>
                  onUpdateLayout(button.id, {
                    w: Number(event.target.value) || 1,
                  })
                }
              />
            </div>

            <div>
              <Label>Altura (1 a 3 níveis)</Label>
              <Input
                type="number"
                min={1}
                max={3}
                value={button.layout.h}
                onChange={(event) =>
                  onUpdateLayout(button.id, {
                    h: Number(event.target.value) || 1,
                  })
                }
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-3">
              <div>
                <Label className="text-sm font-semibold">Parâmetros Adicionais</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Campos extras enviados junto com a ação. Use placeholders como {`{{data}}`} ou {`{{horario}}`}
                </p>
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => onAddAdditionalField(button.id)}
                className="flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Adicionar Parâmetro
              </Button>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md p-3 mb-3">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    Placeholders Disponíveis
                  </p>
                  <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                    <li><code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">{'{{valor_botao}}'}</code> - Valor do campo principal do botão</li>
                    <li><code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">{'{{data}}'}</code> - Data atual ou selecionada</li>
                    <li><code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">{'{{horario}}'}</code> - Horário selecionado</li>
                    <li><code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">{'{{nome_lead}}'}</code> - Nome do lead</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {(button.additional_fields || []).map((addField, fieldIndex) => (
                <Card key={`${button.id}-field-${fieldIndex}`} className="p-3 bg-accent/30">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Campo</Label>
                        <Select
                          value={addField.field || ""}
                          onValueChange={(value) => {
                            const fields = button.sync_target === 'supabase' ? supabaseFields : bitrixFields;
                            const fieldMeta = fields.find((f) => f.name === value);
                            onUpdateAdditionalField(button.id, fieldIndex, {
                              field: value,
                              value: '' // Limpar valor ao mudar campo
                            });
                          }}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder={`Selecione ${button.sync_target === 'supabase' ? 'Supabase' : 'Bitrix'}`}>
                              {addField.field ? (
                                (() => {
                                  const fields = button.sync_target === 'supabase' ? supabaseFields : bitrixFields;
                                  const selectedField = fields.find(f => f.name === addField.field);
                                  return selectedField ? (
                                    <div className="flex flex-col items-start">
                                      <span className="text-xs font-medium">{selectedField.title}</span>
                                      <span className="text-[10px] text-muted-foreground">{selectedField.type}</span>
                                    </div>
                                  ) : addField.field;
                                })()
                              ) : null}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="bg-background z-[200] max-h-[200px]">
                            {button.sync_target === 'supabase'
                              ? supabaseFields.map((field) => (
                                  <SelectItem key={`add-${fieldIndex}-${field.name}`} value={field.name}>
                                    <div className="flex flex-col">
                                      <span className="text-xs font-medium">{field.title}</span>
                                      <span className="text-[10px] text-muted-foreground">{field.type}</span>
                                    </div>
                                  </SelectItem>
                                ))
                              : bitrixFields.map((field) => (
                                  <SelectItem key={`add-${fieldIndex}-${field.name}`} value={field.name}>
                                    <div className="flex flex-col">
                                      <span className="text-xs font-medium">{field.title}</span>
                                      <span className="text-[10px] text-muted-foreground">{field.type}</span>
                                    </div>
                                  </SelectItem>
                                ))
                            }
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Valor</Label>
                        {addField.field ? (
                          renderFieldValueControl(
                            addField.field,
                            addField.value,
                            (value) => onUpdateAdditionalField(button.id, fieldIndex, { value }),
                          )
                        ) : (
                          <div className="flex gap-1">
                            <Input
                              value={addField.value}
                              onChange={(e) =>
                                onUpdateAdditionalField(button.id, fieldIndex, {
                                  value: e.target.value,
                                })
                              }
                              placeholder="Digite ou selecione um placeholder"
                              className="h-8"
                            />
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 w-8 p-0 shrink-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-64 bg-background z-[250]">
                                <DropdownMenuItem
                                  onClick={() =>
                                    onUpdateAdditionalField(button.id, fieldIndex, {
                                      value: '{{horario}}',
                                    })
                                  }
                                  className="cursor-pointer"
                                >
                                  <code className="text-xs bg-muted px-1 py-0.5 rounded mr-2">
                                    {'{{horario}}'}
                                  </code>
                                  Horário selecionado
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    onUpdateAdditionalField(button.id, fieldIndex, {
                                      value: '{{data}}',
                                    })
                                  }
                                  className="cursor-pointer"
                                >
                                  <code className="text-xs bg-muted px-1 py-0.5 rounded mr-2">
                                    {'{{data}}'}
                                  </code>
                                  Data atual
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    onUpdateAdditionalField(button.id, fieldIndex, {
                                      value: '{{valor_botao}}',
                                    })
                                  }
                                  className="cursor-pointer"
                                >
                                  <code className="text-xs bg-muted px-1 py-0.5 rounded mr-2">
                                    {'{{valor_botao}}'}
                                  </code>
                                  Valor do botão
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    onUpdateAdditionalField(button.id, fieldIndex, {
                                      value: '{{nome_lead}}',
                                    })
                                  }
                                  className="cursor-pointer"
                                >
                                  <code className="text-xs bg-muted px-1 py-0.5 rounded mr-2">
                                    {'{{nome_lead}}'}
                                  </code>
                                  Nome do lead
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveAdditionalField(button.id, fieldIndex)}
                      className="mt-5 h-8 w-8 p-0"
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                </Card>
              ))}
              
              {(!button.additional_fields || button.additional_fields.length === 0) && (
                <div className="text-center py-4 text-sm text-muted-foreground bg-muted/30 rounded-md">
                  Nenhum parâmetro adicional configurado
                </div>
              )}
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-3">
              <Label className="text-sm font-semibold">Sub-botões (Motivos)</Label>
              <Button size="sm" variant="outline" onClick={() => onAddSubButton(button.id)}>
                <Plus className="w-3 h-3 mr-1" />
                Adicionar Motivo
              </Button>
            </div>

            <div className="space-y-2">
              {button.sub_buttons.map((sub, subIndex) => {
                const subMeta = bitrixFields.find((field) => field.name === sub.subField);

                return (
                  <Card key={`${button.id}-${subIndex}`} className="p-3 bg-muted/20">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium">Motivo {subIndex + 1}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveSubButton(button.id, subIndex)}
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div>
                        <Label className="text-xs">Nome</Label>
                        <Input
                          value={sub.subLabel}
                          onChange={(event) =>
                            onUpdateSubButton(button.id, subIndex, {
                              subLabel: event.target.value,
                            })
                          }
                          className="h-8"
                        />
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Label className="text-xs">Descrição/Dica</Label>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">Texto que aparece ao passar o mouse sobre o sub-botão</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <Input
                          value={sub.subDescription || ""}
                          onChange={(event) =>
                            onUpdateSubButton(button.id, subIndex, {
                              subDescription: event.target.value,
                            })
                          }
                          placeholder="Ex: Motivo de cancelamento"
                          className="h-8"
                        />
                      </div>

                      <div>
                        <Label className="text-xs">Atalho</Label>
                        <Input
                          value={sub.subHotkey || ""}
                          onChange={(event) =>
                            onUpdateSubButton(button.id, subIndex, {
                              subHotkey: event.target.value,
                            })
                          }
                          placeholder="Shift+1"
                          className="h-8"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <Label className="text-xs">
                          Campo do {button.sync_target === 'supabase' ? 'Supabase' : 'Bitrix'}
                        </Label>
                        <Select
                          value={sub.subField || ""}
                          onValueChange={(value) => {
                            const fields = button.sync_target === 'supabase' ? supabaseFields : bitrixFields;
                            const fieldMeta = fields.find((f) => f.name === value);
                            onUpdateSubButton(button.id, subIndex, { 
                              subField: value,
                              subValue: '' // Limpar valor ao mudar campo
                            });
                          }}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder={`Selecione ${button.sync_target === 'supabase' ? 'Supabase' : 'Bitrix'}`}>
                              {sub.subField ? (
                                (() => {
                                  const fields = button.sync_target === 'supabase' ? supabaseFields : bitrixFields;
                                  const selectedField = fields.find(f => f.name === sub.subField);
                                  return selectedField ? selectedField.title : sub.subField;
                                })()
                              ) : null}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="bg-background z-[200] max-h-[200px]">
                            {button.sync_target === 'supabase'
                              ? supabaseFields.map((field) => (
                                  <SelectItem key={`sub-${subIndex}-${field.name}`} value={field.name}>
                                    <span className="text-xs">{field.title}</span>
                                  </SelectItem>
                                ))
                              : bitrixFields.map((field) => (
                                  <SelectItem key={`sub-${subIndex}-${field.name}`} value={field.name}>
                                    <span className="text-xs">{field.title}</span>
                                  </SelectItem>
                                ))
                            }
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-xs">Webhook</Label>
                        <Input
                          value={sub.subWebhook}
                          onChange={(event) =>
                            onUpdateSubButton(button.id, subIndex, {
                              subWebhook: event.target.value,
                            })
                          }
                          placeholder="https://..."
                          className="h-8"
                        />
                      </div>

                      <div>
                        <Label className="text-xs">Valor</Label>
                        {sub.subField ? (
                          renderFieldValueControl(
                            sub.subField,
                            sub.subValue,
                            (value) => onUpdateSubButton(button.id, subIndex, { subValue: value }),
                          )
                        ) : (
                          <div className="flex gap-1">
                            <Input
                              value={sub.subValue}
                              onChange={(e) =>
                                onUpdateSubButton(button.id, subIndex, {
                                  subValue: e.target.value,
                                })
                              }
                              placeholder="Digite ou selecione um placeholder"
                              className="h-8"
                            />
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 w-8 p-0 shrink-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-64 bg-background z-[250]">
                                <DropdownMenuItem
                                  onClick={() =>
                                    onUpdateSubButton(button.id, subIndex, {
                                      subValue: '{{horario}}',
                                    })
                                  }
                                  className="cursor-pointer"
                                >
                                  <code className="text-xs bg-muted px-1 py-0.5 rounded mr-2">
                                    {'{{horario}}'}
                                  </code>
                                  Horário selecionado
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    onUpdateSubButton(button.id, subIndex, {
                                      subValue: '{{data}}',
                                    })
                                  }
                                  className="cursor-pointer"
                                >
                                  <code className="text-xs bg-muted px-1 py-0.5 rounded mr-2">
                                    {'{{data}}'}
                                  </code>
                                  Data atual
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    onUpdateSubButton(button.id, subIndex, {
                                      subValue: '{{valor_botao}}',
                                    })
                                  }
                                  className="cursor-pointer"
                                >
                                  <code className="text-xs bg-muted px-1 py-0.5 rounded mr-2">
                                    {'{{valor_botao}}'}
                                  </code>
                                  Valor do botão
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    onUpdateSubButton(button.id, subIndex, {
                                      subValue: '{{nome_lead}}',
                                    })
                                  }
                                  className="cursor-pointer"
                                >
                                  <code className="text-xs bg-muted px-1 py-0.5 rounded mr-2">
                                    {'{{nome_lead}}'}
                                  </code>
                                  Nome do lead
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Parâmetros Adicionais do Sub-botão */}
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex justify-between items-center mb-2">
                        <Label className="text-xs font-semibold">Parâmetros Adicionais</Label>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => onAddSubAdditionalField(button.id, subIndex)}
                          className="h-6 text-xs"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Adicionar
                        </Button>
                      </div>

                      <div className="space-y-2">
                        {(sub.subAdditionalFields || []).length > 0 ? (
                          (sub.subAdditionalFields || []).map((addField, fieldIndex) => (
                            <div key={`sub-${subIndex}-field-${fieldIndex}`} className="flex items-start gap-2 bg-accent/20 p-2 rounded">
                              <div className="flex-1 grid grid-cols-2 gap-2">
                                <div>
                                  <Select
                                    value={addField.field || ""}
                                    onValueChange={(value) => {
                                      onUpdateSubAdditionalField(button.id, subIndex, fieldIndex, {
                                        field: value,
                                        value: ''
                                      });
                                    }}
                                  >
                                    <SelectTrigger className="h-7 text-xs">
                                      <SelectValue placeholder="Campo">
                                        {addField.field ? (
                                          (() => {
                                            const fields = button.sync_target === 'supabase' ? supabaseFields : bitrixFields;
                                            const selectedField = fields.find(f => f.name === addField.field);
                                            return selectedField ? selectedField.title : addField.field;
                                          })()
                                        ) : null}
                                      </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent className="bg-background z-[250] max-h-[150px]">
                                      {button.sync_target === 'supabase'
                                        ? supabaseFields.map((field) => (
                                            <SelectItem key={`sub-add-${subIndex}-${fieldIndex}-${field.name}`} value={field.name}>
                                              <span className="text-xs">{field.title}</span>
                                            </SelectItem>
                                          ))
                                        : bitrixFields.map((field) => (
                                            <SelectItem key={`sub-add-${subIndex}-${fieldIndex}-${field.name}`} value={field.name}>
                                              <span className="text-xs">{field.title}</span>
                                            </SelectItem>
                                          ))
                                      }
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  {addField.field ? (
                                    <div className="h-7">
                                      {renderFieldValueControl(
                                        addField.field,
                                        addField.value,
                                        (value) => onUpdateSubAdditionalField(button.id, subIndex, fieldIndex, { value }),
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex gap-1">
                                      <Input
                                        value={addField.value}
                                        onChange={(e) =>
                                          onUpdateSubAdditionalField(
                                            button.id,
                                            subIndex,
                                            fieldIndex,
                                            { value: e.target.value }
                                          )
                                        }
                                        placeholder="Digite ou selecione"
                                        className="h-7 text-xs"
                                      />
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="outline" size="sm" className="h-7 w-7 p-0 shrink-0">
                                            <MoreVertical className="h-3 w-3" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-56 bg-background z-[300]">
                                          <DropdownMenuItem
                                            onClick={() =>
                                              onUpdateSubAdditionalField(
                                                button.id,
                                                subIndex,
                                                fieldIndex,
                                                { value: '{{horario}}' }
                                              )
                                            }
                                            className="cursor-pointer"
                                          >
                                            <code className="text-[10px] bg-muted px-1 py-0.5 rounded mr-2">
                                              {'{{horario}}'}
                                            </code>
                                            Horário
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={() =>
                                              onUpdateSubAdditionalField(
                                                button.id,
                                                subIndex,
                                                fieldIndex,
                                                { value: '{{data}}' }
                                              )
                                            }
                                            className="cursor-pointer"
                                          >
                                            <code className="text-[10px] bg-muted px-1 py-0.5 rounded mr-2">
                                              {'{{data}}'}
                                            </code>
                                            Data
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={() =>
                                              onUpdateSubAdditionalField(
                                                button.id,
                                                subIndex,
                                                fieldIndex,
                                                { value: '{{valor_botao}}' }
                                              )
                                            }
                                            className="cursor-pointer"
                                          >
                                            <code className="text-[10px] bg-muted px-1 py-0.5 rounded mr-2">
                                              {'{{valor_botao}}'}
                                            </code>
                                            Valor
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={() =>
                                              onUpdateSubAdditionalField(
                                                button.id,
                                                subIndex,
                                                fieldIndex,
                                                { value: '{{nome_lead}}' }
                                              )
                                            }
                                            className="cursor-pointer"
                                          >
                                            <code className="text-[10px] bg-muted px-1 py-0.5 rounded mr-2">
                                              {'{{nome_lead}}'}
                                            </code>
                                            Nome
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onRemoveSubAdditionalField(button.id, subIndex, fieldIndex)}
                                className="h-7 w-7 p-0"
                              >
                                <Trash2 className="w-3 h-3 text-destructive" />
                              </Button>
                            </div>
                          ))
                        ) : (
                          <p className="text-[10px] text-muted-foreground text-center py-2">Nenhum parâmetro adicional</p>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleDelete}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-5 h-5" />
            </Button>
            <Button onClick={onSave} className="gap-2">
              <Save className="w-4 h-4" />
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
