import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BitrixField } from "@/lib/bitrix";
import { BUTTON_CATEGORIES, type ButtonCategory, type ButtonLayout } from "@/lib/button-layout";

interface SubButton {
  subLabel: string;
  subWebhook: string;
  subField: string;
  subValue: string;
  subHotkey?: string;
}

interface ButtonConfig {
  id: string;
  label: string;
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
  renderFieldValueControl: (fieldName: string, value: string, onChange: (value: string) => void) => React.ReactNode;
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
  renderFieldValueControl,
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

          <div>
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
                          <Input 
                            disabled 
                            placeholder="Selecione um campo primeiro" 
                            className="h-8 bg-muted"
                          />
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          <div className="flex justify-center pt-4 border-t">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleDelete}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
