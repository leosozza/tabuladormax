import { useState, useEffect, useMemo, type DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Save, RefreshCcw, Search, Loader2, GripVertical, Edit } from "lucide-react";
import UserMenu from "@/components/UserMenu";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BitrixError, BitrixField, getLeadFields } from "@/lib/bitrix";
import {
  BUTTON_CATEGORIES,
  categoryOrder,
  createDefaultLayout,
  ensureButtonLayout,
  type ButtonCategory,
  type ButtonLayout,
} from "@/lib/button-layout";
import { cn } from "@/lib/utils";
import { ButtonEditDialog } from "@/components/ButtonEditDialog";

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

const DEFAULT_WEBHOOK = "https://maxsystem.bitrix24.com.br/rest/7/338m945lx9ifjjnr/crm.lead.update.json";

const generateButtonId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2, 10);
};

const cloneButtons = (buttons: ButtonConfig[]): ButtonConfig[] =>
  buttons.map((button) => ({
    ...button,
    layout: { ...button.layout },
    sub_buttons: button.sub_buttons.map((sub) => ({ ...sub })),
  }));

const normalizeButtons = (buttons: ButtonConfig[]): ButtonConfig[] => {
  const counters = BUTTON_CATEGORIES.reduce(
    (acc, category) => ({ ...acc, [category.id]: 0 }),
    {} as Record<ButtonCategory, number>,
  );

  const sanitized = buttons
    .map((button) => ({
      ...button,
      layout: ensureButtonLayout(
        { ...button.layout, category: button.layout.category },
        typeof button.layout.index === "number" ? button.layout.index : 0,
      ),
      sub_buttons: button.sub_buttons.map((sub) => ({
        subLabel: sub.subLabel || "Novo motivo",
        subWebhook: sub.subWebhook || DEFAULT_WEBHOOK,
        subField: sub.subField || "",
        subValue: sub.subValue || "",
        subHotkey: sub.subHotkey || "",
      })),
    }))
    .sort((a, b) => {
      const categoryDiff = categoryOrder.indexOf(a.layout.category) - categoryOrder.indexOf(b.layout.category);

      if (categoryDiff !== 0) {
        return categoryDiff;
      }

      return a.layout.index - b.layout.index;
    });

  return sanitized.map((button, index) => {
    const currentIndex = counters[button.layout.category];
    counters[button.layout.category] = currentIndex + 1;

    return {
      ...button,
      sort: index + 1,
      layout: {
        ...button.layout,
        index: currentIndex,
      },
    };
  });
};

const parseSubButtons = (value: unknown): SubButton[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry) => {
    const payload = (entry ?? {}) as Record<string, unknown>;

    return {
      subLabel:
        typeof payload.subLabel === "string"
          ? payload.subLabel
          : typeof payload.label === "string"
            ? payload.label
            : "Novo motivo",
      subWebhook:
        typeof payload.subWebhook === "string" && payload.subWebhook
          ? payload.subWebhook
          : typeof payload.webhook === "string" && payload.webhook
            ? payload.webhook
            : DEFAULT_WEBHOOK,
      subField:
        typeof payload.subField === "string"
          ? payload.subField
          : typeof payload.field === "string"
            ? payload.field
            : "",
      subValue:
        typeof payload.subValue === "string"
          ? payload.subValue
          : typeof payload.value === "string"
            ? payload.value
            : "",
      subHotkey:
        typeof payload.subHotkey === "string"
          ? payload.subHotkey
          : typeof payload.hotkey === "string"
            ? payload.hotkey
            : "",
    };
  });
};

const Config = () => {
  const navigate = useNavigate();
  const [buttons, setButtons] = useState<ButtonConfig[]>([]);
  const [bitrixFields, setBitrixFields] = useState<BitrixField[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const [fieldSearch, setFieldSearch] = useState("");
  const [loadingButtons, setLoadingButtons] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draggingButton, setDraggingButton] = useState<string | null>(null);
  const [editingButton, setEditingButton] = useState<ButtonConfig | null>(null);
  const [fieldSource, setFieldSource] = useState<'bitrix' | 'supabase'>('bitrix');

  useEffect(() => {
    loadButtons();
    loadFields();
  }, []);

  const filteredFields = useMemo(() => {
    const query = fieldSearch.toLowerCase();
    return bitrixFields.filter(
      (field) => field?.name?.toLowerCase().includes(query) || field?.title?.toLowerCase().includes(query),
    );
  }, [bitrixFields, fieldSearch]);

  const applyUpdate = (updater: (buttons: ButtonConfig[]) => ButtonConfig[]) => {
    setButtons((prev) => normalizeButtons(updater(cloneButtons(prev))));
  };

  const loadButtons = async () => {
    setLoadingButtons(true);
    const { data, error } = await supabase.from("button_config").select("*").order("sort", { ascending: true });

    if (error) {
      console.error("Erro ao carregar botões:", error);
      toast.error("Não foi possível carregar as ações");
      setLoadingButtons(false);
      return;
    }

    const parsed = (data || []).map((entry, index) => ({
      id: entry.id,
      label: entry.label,
      color: entry.color,
      webhook_url: entry.webhook_url || DEFAULT_WEBHOOK,
      field: entry.field || "",
      value: entry.value || "",
      field_type: entry.field_type || "string",
      action_type: entry.action_type || "simple",
      hotkey: entry.hotkey || "",
      sort: entry.sort || index + 1,
      layout: ensureButtonLayout(entry.pos as Partial<ButtonLayout>, entry.sort || index),
      sub_buttons: parseSubButtons(entry.sub_buttons),
      sync_target: (entry.sync_target as 'bitrix' | 'supabase') || 'bitrix',
    }));

    setButtons(normalizeButtons(parsed));
    setLoadingButtons(false);
  };

  const loadFields = async () => {
    setLoadingFields(true);
    try {
      const fields = await getLeadFields();
      setBitrixFields(fields.sort((a, b) => a.title.localeCompare(b.title)));
    } catch (error) {
      console.error("Erro ao buscar campos do Bitrix:", error);
      toast.error(error instanceof BitrixError ? error.message : "Não foi possível carregar os campos do Bitrix");
    } finally {
      setLoadingFields(false);
    }
  };

  const addButton = () => {
    const defaultCategory = BUTTON_CATEGORIES[0].id;
    const layout = createDefaultLayout(
      defaultCategory,
      buttons.filter((button) => button.layout.category === defaultCategory).length,
    );

    const newButton: ButtonConfig = {
      id: generateButtonId(),
      label: "Novo Botão",
      color: "#3b82f6",
      webhook_url: DEFAULT_WEBHOOK,
      field: "",
      value: "",
      field_type: "string",
      action_type: "simple",
      hotkey: "",
      sort: buttons.length + 1,
      layout,
      sub_buttons: [],
      sync_target: 'bitrix',
    };

    applyUpdate((current) => [...current, newButton]);
  };

  const removeButton = (id: string) => {
    applyUpdate((current) => current.filter((button) => button.id !== id));
  };

  const updateButton = (id: string, updates: Partial<Omit<ButtonConfig, "id" | "layout" | "sub_buttons">>) => {
    applyUpdate((current) => current.map((button) => (button.id === id ? { ...button, ...updates } : button)));
  };

  const updateButtonLayout = (id: string, updates: Partial<ButtonLayout>) => {
    applyUpdate((current) =>
      current.map((button) =>
        button.id === id
          ? {
              ...button,
              layout: {
                ...button.layout,
                ...updates,
              },
            }
          : button,
      ),
    );
  };

  const assignFieldToButton = (id: string, fieldName: string) => {
    const fieldMeta = bitrixFields.find((field) => field.name === fieldName);
    updateButton(id, {
      field: fieldName,
      field_type: fieldMeta?.type || "string",
    });
  };

  const addSubButton = (id: string) => {
    applyUpdate((current) =>
      current.map((button) =>
        button.id === id
          ? {
              ...button,
              sub_buttons: [
                ...button.sub_buttons,
                {
                  subLabel: "Novo motivo",
                  subWebhook: DEFAULT_WEBHOOK,
                  subField: button.field || "",
                  subValue: "",
                  subHotkey: "",
                },
              ],
            }
          : button,
      ),
    );
  };

  const removeSubButton = (id: string, subIndex: number) => {
    applyUpdate((current) =>
      current.map((button) =>
        button.id === id
          ? {
              ...button,
              sub_buttons: button.sub_buttons.filter((_, index) => index !== subIndex),
            }
          : button,
      ),
    );
  };

  const updateSubButton = (id: string, subIndex: number, updates: Partial<SubButton>) => {
    applyUpdate((current) =>
      current.map((button) =>
        button.id === id
          ? {
              ...button,
              sub_buttons: button.sub_buttons.map((sub, index) => (index === subIndex ? { ...sub, ...updates } : sub)),
            }
          : button,
      ),
    );
  };

  const moveButton = (buttonId: string, category: ButtonCategory, targetIndex?: number) => {
    applyUpdate((current) => {
      const index = current.findIndex((button) => button.id === buttonId);

      if (index === -1) {
        return current;
      }

      const [button] = current.splice(index, 1);
      const safeCategory = BUTTON_CATEGORIES.some((item) => item.id === category) ? category : BUTTON_CATEGORIES[0].id;

      const buckets = BUTTON_CATEGORIES.reduce(
        (acc, item) => ({
          ...acc,
          [item.id]: [] as ButtonConfig[],
        }),
        {} as Record<ButtonCategory, ButtonConfig[]>,
      );

      current.forEach((entry) => {
        const entryCategory = BUTTON_CATEGORIES.some((item) => item.id === entry.layout.category)
          ? (entry.layout.category as ButtonCategory)
          : BUTTON_CATEGORIES[0].id;
        buckets[entryCategory].push(entry);
      });

      const destination = buckets[safeCategory];
      const insertionIndex =
        targetIndex !== undefined ? Math.max(0, Math.min(targetIndex, destination.length)) : destination.length;

      destination.splice(insertionIndex, 0, {
        ...button,
        layout: ensureButtonLayout(
          {
            ...button.layout,
            category: safeCategory,
            index: insertionIndex,
          },
          insertionIndex,
        ),
      });

      return BUTTON_CATEGORIES.flatMap((item) => buckets[item.id]);
    });
  };

  const handleFieldDrop = (event: DragEvent<HTMLDivElement>, buttonId: string, subIndex?: number) => {
    event.preventDefault();
    const field = event.dataTransfer.getData("bitrix-field");

    if (!field) {
      return;
    }

    if (typeof subIndex === "number") {
      updateSubButton(buttonId, subIndex, { subField: field });
    } else {
      assignFieldToButton(buttonId, field);
    }
  };

  const handleButtonDragStart = (event: DragEvent<HTMLElement>, id: string) => {
    event.dataTransfer.setData("button-id", id);
    event.dataTransfer.effectAllowed = "move";
    setDraggingButton(id);
  };

  const handleDragEnd = () => {
    setDraggingButton(null);
  };

  const handleButtonDropOnCard = (event: DragEvent<HTMLDivElement>, category: ButtonCategory, dropIndex: number) => {
    event.preventDefault();
    event.stopPropagation();
    const id = event.dataTransfer.getData("button-id");

    if (!id) {
      return;
    }

    moveButton(id, category, dropIndex);
    setDraggingButton(null);
  };

  const handleColumnDrop = (event: DragEvent<HTMLDivElement>, category: ButtonCategory) => {
    event.preventDefault();
    const id = event.dataTransfer.getData("button-id");

    if (!id) {
      return;
    }

    const categoryButtons = buttons.filter((button) => button.layout.category === category);
    moveButton(id, category, categoryButtons.length);
    setDraggingButton(null);
  };

  const renderFieldValueControl = (fieldName: string, value: string, onChange: (value: string) => void) => {
    const meta = bitrixFields.find((field) => field.name === fieldName);

    if (meta?.items?.length) {
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione um valor" />
          </SelectTrigger>
          <SelectContent>
            {meta.items.map((option) => (
              <SelectItem key={option.ID} value={option.VALUE}>
                {option.VALUE}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    return <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder="Valor a enviar" />;
  };

  const saveConfig = async () => {
    const hotkeys = buttons.map((button) => button.hotkey).filter(Boolean);
    const duplicates = hotkeys.filter((key, index) => hotkeys.indexOf(key) !== index);

    if (duplicates.length > 0) {
      toast.error(`Atalhos duplicados: ${duplicates.join(", ")}`);
      return;
    }

    setSaving(true);

    try {
      await supabase.from("button_config").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      const { error } = await supabase.from("button_config").insert(
        buttons.map((button) => ({
          id: button.id,
          label: button.label,
          color: button.color,
          webhook_url: button.webhook_url,
          field: button.field,
          value: button.value,
          field_type: button.field_type,
          action_type: button.action_type,
          hotkey: button.hotkey,
          sort: button.sort,
          pos: button.layout as any,
          sub_buttons: button.sub_buttons as any,
          category: button.layout.category,
          sync_target: button.sync_target || 'bitrix',
        })),
      );

      if (error) {
        throw error;
      }

      toast.success("Configuração salva com sucesso!");
      loadButtons();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar configuração");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="flex justify-between items-center mb-6">
          <Button variant="outline" onClick={() => navigate(`/dashboard`)} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <UserMenu />
        </div>

        <Card className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">⚙️ Configuração de Botões</h1>
              <p className="text-sm text-muted-foreground">
                Arraste campos do Bitrix para vincular rapidamente cada ação e organize os botões por categoria.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={loadFields} disabled={loadingFields}>
                <RefreshCcw className="w-4 h-4 mr-2" />
                {loadingFields ? "Atualizando..." : "Atualizar campos"}
              </Button>
              <Button onClick={addButton} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Botão
              </Button>
              <Button onClick={saveConfig} disabled={saving}>
                {saving ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Salvando...
                  </span>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" /> Salvar Tudo
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
            <aside className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Buscar campo"
                    value={fieldSearch}
                    onChange={(event) => setFieldSearch(event.target.value)}
                  />
                </div>
              </div>

              {/* Toggle Bitrix/Supabase */}
              <div className="flex gap-2 p-1 rounded-lg bg-muted/40 border">
                <Button
                  variant={fieldSource === 'bitrix' ? 'default' : 'ghost'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setFieldSource('bitrix')}
                >
                  🔷 Bitrix
                </Button>
                <Button
                  variant={fieldSource === 'supabase' ? 'default' : 'ghost'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setFieldSource('supabase')}
                >
                  ⚡ Supabase
                </Button>
              </div>

              <div className="rounded-lg border bg-muted/40 h-[400px] overflow-y-auto p-3">
                {fieldSource === 'bitrix' ? (
                  loadingFields ? (
                    <p className="text-sm text-muted-foreground">Carregando campos do Bitrix...</p>
                  ) : filteredFields.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum campo encontrado</p>
                  ) : (
                    <ul className="space-y-2 text-sm">
                      {filteredFields.map((field) => (
                        <li
                          key={field.name}
                          draggable
                          onDragStart={(event) => event.dataTransfer.setData("bitrix-field", field.name)}
                          className="cursor-grab rounded-md border bg-background px-3 py-2 hover:bg-muted"
                          title={field.title}
                        >
                          <p className="font-medium">{field.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {field.name} · {field.type}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )
                ) : (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Campos do Supabase (Tabela: leads)</p>
                    <ul className="space-y-2 text-sm">
                      {[
                        { name: 'id', title: 'ID do Lead', type: 'bigint' },
                        { name: 'name', title: 'Nome', type: 'text' },
                        { name: 'age', title: 'Idade', type: 'integer' },
                        { name: 'address', title: 'Endereço', type: 'text' },
                        { name: 'photo_url', title: 'URL da Foto', type: 'text' },
                        { name: 'responsible', title: 'Responsável', type: 'text' },
                        { name: 'scouter', title: 'Olheiro', type: 'text' },
                        { name: 'sync_status', title: 'Status de Sincronização', type: 'text' },
                        { name: 'date_modify', title: 'Data de Modificação', type: 'timestamp' },
                      ]
                        .filter(field => 
                          field.name.toLowerCase().includes(fieldSearch.toLowerCase()) ||
                          field.title.toLowerCase().includes(fieldSearch.toLowerCase())
                        )
                        .map((field) => (
                          <li
                            key={field.name}
                            draggable
                            onDragStart={(event) => event.dataTransfer.setData("bitrix-field", `supabase.${field.name}`)}
                            className="cursor-grab rounded-md border bg-background px-3 py-2 hover:bg-muted"
                            title={field.title}
                          >
                            <p className="font-medium">{field.title}</p>
                            <p className="text-xs text-muted-foreground">
                              supabase.{field.name} · {field.type}
                            </p>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {fieldSource === 'bitrix' 
                  ? 'Arraste um campo do Bitrix e solte no botão desejado'
                  : 'Arraste um campo do Supabase e solte no botão desejado'}
              </p>
            </aside>

            <section className="space-y-4">
              {loadingButtons ? (
                <p className="text-sm text-muted-foreground">Carregando botões...</p>
              ) : buttons.length === 0 ? (
                <Card className="p-6 text-sm text-muted-foreground">
                  Nenhum botão configurado ainda. Clique em "Adicionar Botão" para começar.
                </Card>
              ) : (
                <div className="grid gap-4 lg:grid-cols-3">
                  {BUTTON_CATEGORIES.map((category) => {
                    const categoryButtons = buttons.filter((button) => button.layout.category === category.id);

                    return (
                      <div
                        key={category.id}
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.dataTransfer.dropEffect = "move";
                        }}
                        onDrop={(event) => handleColumnDrop(event, category.id)}
                        className={cn(
                          "rounded-xl border bg-muted/20 p-4 transition-colors",
                          draggingButton && "border-primary/40 bg-primary/5",
                        )}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h2 className="font-semibold text-base">{category.label}</h2>
                          <span className="text-xs text-muted-foreground">{categoryButtons.length} botões</span>
                        </div>

                        <div className="space-y-3">
                          {categoryButtons.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-background/60 py-10 text-center text-xs text-muted-foreground">
                              Arraste um botão para esta categoria
                            </div>
                          ) : (
                            categoryButtons.map((button, index) => {
                              const fieldMeta = bitrixFields.find((field) => field.name === button.field);

                              return (
                                <div
                                  key={button.id}
                                  onDragOver={(event) => {
                                    event.preventDefault();
                                    event.dataTransfer.dropEffect = "move";
                                  }}
                                  onDrop={(event) => handleButtonDropOnCard(event, category.id, index)}
                                >
                                  <Card
                                    className={cn(
                                      "p-3 bg-background shadow-sm hover:shadow-md transition-shadow cursor-pointer",
                                      draggingButton === button.id && "ring-2 ring-primary/40",
                                    )}
                                    onDoubleClick={() => setEditingButton(button)}
                                  >
                                    <div className="flex items-center gap-3">
                                      <span
                                        className="cursor-grab active:cursor-grabbing text-muted-foreground flex-shrink-0"
                                        draggable
                                        onDragStart={(event) => handleButtonDragStart(event, button.id)}
                                        onDragEnd={handleDragEnd}
                                      >
                                        <GripVertical className="w-4 h-4" />
                                      </span>
                                      <div 
                                        className="flex items-center gap-2 flex-1 min-w-0"
                                      >
                                        <div 
                                          className="w-4 h-4 rounded flex-shrink-0" 
                                          style={{ backgroundColor: button.color }}
                                        />
                                        <span className="font-medium truncate">{button.label || "Botão"}</span>
                                      </div>
                                    </div>
                                  </Card>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </Card>

        <ButtonEditDialog
          open={editingButton !== null}
          onOpenChange={(open) => !open && setEditingButton(null)}
          button={editingButton}
          bitrixFields={bitrixFields}
          onUpdate={updateButton}
          onUpdateLayout={updateButtonLayout}
          onAddSubButton={addSubButton}
          onRemoveSubButton={removeSubButton}
          onUpdateSubButton={updateSubButton}
          onFieldDrop={handleFieldDrop}
          onMoveButton={moveButton}
          onDelete={removeButton}
          renderFieldValueControl={renderFieldValueControl}
        />
      </div>
    </div>
  );
};

export default Config;
