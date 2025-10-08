import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
}

interface ButtonEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  button: ButtonConfig | null;
  bitrixFields: BitrixField[];
  onUpdate: (id: string, updates: Partial<Omit<ButtonConfig, "id" | "layout" | "sub_buttons">>) => void;
  onUpdateLayout: (id: string, updates: Partial<ButtonLayout>) => void;
  onAddSubButton: (id: string) => void;
  onRemoveSubButton: (id: string, subIndex: number) => void;
  onUpdateSubButton: (id: string, subIndex: number, updates: Partial<SubButton>) => void;
  onFieldDrop: (event: React.DragEvent<HTMLDivElement>, buttonId: string, subIndex?: number) => void;
  onMoveButton: (id: string, category: ButtonCategory) => void;
  onDelete: (id: string) => void;
  renderFieldValueControl: (fieldName: string, value: string, onChange: (value: string) => void) => React.ReactNode;
}

export function ButtonEditDialog({
  open,
  onOpenChange,
  button,
  bitrixFields,
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
          <div className="flex items-center justify-between">
            <DialogTitle>Editar Botão: {button.label}</DialogTitle>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleDelete}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir Botão
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
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
                    onMoveButton(button.id, value as ButtonCategory);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {BUTTON_CATEGORIES.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>URL do Webhook</Label>
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
              <Label>Campo Bitrix</Label>
              <div
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => onFieldDrop(event, button.id)}
                className="rounded-lg border border-dashed bg-muted/20 px-3 py-3 text-sm"
              >
                {button.field ? (
                  <div>
                    <p className="font-semibold">{button.field}</p>
                    {fieldMeta && (
                      <p className="text-xs text-muted-foreground">
                        {fieldMeta.title} · {fieldMeta.type}
                      </p>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground">Solte aqui um campo do Bitrix</span>
                )}
              </div>
            </div>

            <div>
              <Label>Valor Padrão</Label>
              {renderFieldValueControl(button.field, button.value, (value) =>
                onUpdate(button.id, { value }),
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
                <SelectContent className="bg-background z-50">
                  <SelectItem value="simple">Simples</SelectItem>
                  <SelectItem value="schedule">Agendamento</SelectItem>
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
                        <Label className="text-xs">Campo</Label>
                        <div
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={(event) => onFieldDrop(event, button.id, subIndex)}
                          className="rounded-md border border-dashed bg-muted/40 px-2 py-2"
                        >
                          {sub.subField ? (
                            <div>
                              <p className="text-sm font-medium">{sub.subField}</p>
                              {subMeta && (
                                <p className="text-xs text-muted-foreground">{subMeta.title}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Solte aqui um campo
                            </span>
                          )}
                        </div>
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
                        {renderFieldValueControl(
                          sub.subField,
                          sub.subValue,
                          (value) => onUpdateSubButton(button.id, subIndex, { subValue: value }),
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
