import { useState, useEffect, type DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Save, RefreshCcw, Loader2, GripVertical, Edit, Copy } from "lucide-react";
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
import { CategoryManager } from "@/components/CategoryManager";

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
    sub_buttons: button.sub_buttons.map((sub) => ({ 
      ...sub,
      subAdditionalFields: sub.subAdditionalFields ? [...sub.subAdditionalFields] : []
    })),
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
        subDescription: sub.subDescription || "",
        subWebhook: sub.subWebhook || DEFAULT_WEBHOOK,
        subField: sub.subField || "",
        subValue: sub.subValue || "",
        subHotkey: sub.subHotkey || "",
        subAdditionalFields: sub.subAdditionalFields || [],
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
      subDescription:
        typeof payload.subDescription === "string"
          ? payload.subDescription
          : typeof payload.description === "string"
            ? payload.description
            : "",
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
      subAdditionalFields: Array.isArray(payload.subAdditionalFields)
        ? payload.subAdditionalFields as Array<{ field: string; value: string }>
        : Array.isArray(payload.additional_fields)
          ? payload.additional_fields as Array<{ field: string; value: string }>
          : [],
    };
  });
};

interface Category {
  id: string;
  name: string;
  label: string;
  sort_order: number;
}

const Config = () => {
  const navigate = useNavigate();
  const [buttons, setButtons] = useState<ButtonConfig[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [bitrixFields, setBitrixFields] = useState<BitrixField[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const [loadingButtons, setLoadingButtons] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draggingButton, setDraggingButton] = useState<string | null>(null);
  const [isDraggingOverTrash, setIsDraggingOverTrash] = useState(false);
  const [editingButtonId, setEditingButtonId] = useState<string | null>(null);

  // Buscar o botão em edição do estado atualizado
  const editingButton = editingButtonId ? buttons.find(b => b.id === editingButtonId) || null : null;

  useEffect(() => {
    loadCategories();
    loadButtons();
    loadFields();
  }, []);

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from("button_categories")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Erro ao carregar categorias:", error);
      toast.error("Não foi possível carregar as categorias");
      return;
    }

    setCategories(data || []);
  };

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
      description: entry.description || "",
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
      additional_fields: (entry.additional_fields as Array<{ field: string; value: string }>) || [],
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
    const defaultCategory = (categories[0]?.name || BUTTON_CATEGORIES[0].id) as ButtonCategory;
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
      additional_fields: [],
    };

    applyUpdate((current) => [...current, newButton]);
  };

  const duplicateButton = (id: string) => {
    const buttonToDuplicate = buttons.find((button) => button.id === id);
    if (!buttonToDuplicate) return;

    const category = buttonToDuplicate.layout.category;
    const layout = createDefaultLayout(
      category,
      buttons.filter((button) => button.layout.category === category).length,
    );

    const duplicatedButton: ButtonConfig = {
      ...buttonToDuplicate,
      id: generateButtonId(),
      label: `${buttonToDuplicate.label} (Cópia)`,
      sort: buttons.length + 1,
      layout,
      sub_buttons: buttonToDuplicate.sub_buttons.map((sub) => ({
        ...sub,
        subAdditionalFields: sub.subAdditionalFields ? [...sub.subAdditionalFields] : [],
      })),
      additional_fields: buttonToDuplicate.additional_fields ? [...buttonToDuplicate.additional_fields] : [],
    };

    applyUpdate((current) => [...current, duplicatedButton]);
    toast.success(`Botão "${buttonToDuplicate.label}" duplicado com sucesso!`);
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
    
    // Mapear tipos do Bitrix para os tipos aceitos pelo banco
    let mappedType = 'string';
    if (fieldMeta?.type) {
      if (fieldMeta.type === 'integer' || fieldMeta.type === 'double') {
        mappedType = 'number';
      } else if (fieldMeta.type === 'datetime' || fieldMeta.type === 'date') {
        mappedType = 'datetime';
      } else if (fieldMeta.type === 'boolean') {
        mappedType = 'boolean';
      } else {
        mappedType = 'string'; // enumeration, string, etc.
      }
    }
    
    updateButton(id, {
      field: fieldName,
      field_type: mappedType,
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
                  subDescription: "",
                  subWebhook: DEFAULT_WEBHOOK,
                  subField: button.field || "",
                  subValue: "",
                  subHotkey: "",
                  subAdditionalFields: [],
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

  const addAdditionalField = (id: string) => {
    applyUpdate((current) =>
      current.map((button) =>
        button.id === id
          ? {
              ...button,
              additional_fields: [
                ...(button.additional_fields || []),
                {
                  field: "",
                  value: "",
                },
              ],
            }
          : button,
      ),
    );
  };

  const removeAdditionalField = (id: string, fieldIndex: number) => {
    applyUpdate((current) =>
      current.map((button) =>
        button.id === id
          ? {
              ...button,
              additional_fields: (button.additional_fields || []).filter((_, index) => index !== fieldIndex),
            }
          : button,
      ),
    );
  };

  const updateAdditionalField = (id: string, fieldIndex: number, updates: { field?: string; value?: string }) => {
    applyUpdate((current) =>
      current.map((button) =>
        button.id === id
          ? {
              ...button,
              additional_fields: (button.additional_fields || []).map((addField, index) => 
                index === fieldIndex ? { ...addField, ...updates } : addField
              ),
            }
          : button,
      ),
    );
  };

  const addSubAdditionalField = (id: string, subIndex: number) => {
    applyUpdate((current) =>
      current.map((button) =>
        button.id === id
          ? {
              ...button,
              sub_buttons: button.sub_buttons.map((sub, index) => 
                index === subIndex 
                  ? {
                      ...sub,
                      subAdditionalFields: [
                        ...(sub.subAdditionalFields || []),
                        { field: "", value: "" },
                      ],
                    }
                  : sub
              ),
            }
          : button,
      ),
    );
  };

  const removeSubAdditionalField = (id: string, subIndex: number, fieldIndex: number) => {
    applyUpdate((current) =>
      current.map((button) =>
        button.id === id
          ? {
              ...button,
              sub_buttons: button.sub_buttons.map((sub, index) => 
                index === subIndex 
                  ? {
                      ...sub,
                      subAdditionalFields: (sub.subAdditionalFields || []).filter((_, i) => i !== fieldIndex),
                    }
                  : sub
              ),
            }
          : button,
      ),
    );
  };

  const updateSubAdditionalField = (id: string, subIndex: number, fieldIndex: number, updates: { field?: string; value?: string }) => {
    applyUpdate((current) =>
      current.map((button) =>
        button.id === id
          ? {
              ...button,
              sub_buttons: button.sub_buttons.map((sub, index) => 
                index === subIndex 
                  ? {
                      ...sub,
                      subAdditionalFields: (sub.subAdditionalFields || []).map((addField, i) => 
                        i === fieldIndex ? { ...addField, ...updates } : addField
                      ),
                    }
                  : sub
              ),
            }
          : button,
      ),
    );
  };

  const moveButton = (buttonId: string, category: string, targetIndex?: number) => {
    applyUpdate((current) => {
      const index = current.findIndex((button) => button.id === buttonId);

      if (index === -1) {
        return current;
      }

      const [button] = current.splice(index, 1);
      const validCategoryNames = categories.map(c => c.name);
      const safeCategory = validCategoryNames.includes(category) ? category : (categories[0]?.name || 'NAO_AGENDADO');

      const buckets = categories.reduce(
        (acc, item) => ({
          ...acc,
          [item.name]: [] as ButtonConfig[],
        }),
        {} as Record<string, ButtonConfig[]>,
      );

      current.forEach((entry) => {
        const entryCategory = validCategoryNames.includes(entry.layout.category)
          ? entry.layout.category
          : (categories[0]?.name || 'NAO_AGENDADO');
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
            category: safeCategory as ButtonCategory,
            index: insertionIndex,
          },
          insertionIndex,
        ),
      });

      return categories.flatMap((item) => buckets[item.name]);
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

  const handleDragEnd = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setDraggingButton(null);
    setIsDraggingOverTrash(false);
  };

  const handleTrashDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setIsDraggingOverTrash(true);
  };

  const handleTrashDragLeave = () => {
    setIsDraggingOverTrash(false);
  };

  const handleTrashDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const buttonId = event.dataTransfer.getData("button-id");
    
    if (buttonId) {
      const button = buttons.find(b => b.id === buttonId);
      if (button && confirm(`Tem certeza que deseja excluir o botão "${button.label}"?`)) {
        removeButton(buttonId);
        toast.success("Botão excluído!");
      }
    }
    
    setIsDraggingOverTrash(false);
  };

  const handleButtonDropOnCard = (event: DragEvent<HTMLDivElement>, category: string, dropIndex: number) => {
    event.preventDefault();
    event.stopPropagation();
    const id = event.dataTransfer.getData("button-id");

    if (!id) {
      return;
    }

    moveButton(id, category, dropIndex);
  };

  const handleColumnDrop = (event: DragEvent<HTMLDivElement>, category: string) => {
    event.preventDefault();
    const id = event.dataTransfer.getData("button-id");

    if (!id) {
      return;
    }

    const categoryButtons = buttons.filter((button) => button.layout.category === category);
    moveButton(id, category, categoryButtons.length);
  };

  const renderFieldValueControl = (fieldName: string, value: string, onChange: (value: string) => void) => {
    // Detectar se o valor é um placeholder
    const isPlaceholder = value && value.startsWith('{{') && value.endsWith('}}');
    
    // Se for placeholder, sempre mostrar Input com badge visual
    if (isPlaceholder) {
      return (
        <div className="relative">
          <Input 
            value={value} 
            onChange={(event) => onChange(event.target.value)} 
            placeholder="Placeholder" 
            className="pr-16 bg-primary/5 border-primary/30"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
            <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
              PLACEHOLDER
            </span>
          </div>
        </div>
      );
    }
    
    // Verificar se é campo Supabase ou Bitrix
    const isSupabaseField = fieldName.startsWith('supabase.');
    const cleanFieldName = isSupabaseField ? fieldName.replace('supabase.', '') : fieldName;
    
    if (isSupabaseField) {
      // Para campos Supabase, usar tipo baseado no nome
      const supabaseField = [
        { name: 'id', type: 'bigint' },
        { name: 'name', type: 'text' },
        { name: 'age', type: 'integer' },
        { name: 'address', type: 'text' },
        { name: 'photo_url', type: 'text' },
        { name: 'responsible', type: 'text' },
        { name: 'scouter', type: 'text' },
        { name: 'sync_status', type: 'text' },
        { name: 'date_modify', type: 'timestamp' },
      ].find(f => f.name === cleanFieldName);
      
      if (supabaseField?.type === 'integer' || supabaseField?.type === 'bigint') {
        return <Input type="number" value={value} onChange={(event) => onChange(event.target.value)} placeholder="Valor numérico" />;
      }
      
      return <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder="Valor a enviar" />;
    }

    // Para campos Bitrix, verificar se tem lista
    const meta = bitrixFields.find((field) => field.name === cleanFieldName);

    if (meta?.items?.length) {
      return (
        <Select value={value || ""} onValueChange={onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um valor" />
          </SelectTrigger>
          <SelectContent className="bg-background z-[200]">
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
    if (buttons.length === 0) {
      toast.error("Não há botões para salvar");
      return;
    }

    const hotkeys = buttons.map((button) => button.hotkey).filter(Boolean);
    const duplicates = hotkeys.filter((key, index) => hotkeys.indexOf(key) !== index);

    if (duplicates.length > 0) {
      toast.error(`Atalhos duplicados: ${duplicates.join(", ")}`);
      return;
    }

    // Validar field_type antes de salvar
    const invalidButtons = buttons.filter(button => !button.field_type || button.field_type === '');
    if (invalidButtons.length > 0) {
      console.error("Botões com field_type inválido:", invalidButtons);
      toast.error("Erro: alguns botões não têm tipo de campo definido. Corrija-os antes de salvar.");
      return;
    }

    setSaving(true);

    try {
      // Preparar dados para inserção com validação
      const buttonsToInsert = buttons.map((button) => ({
        id: button.id,
        label: button.label,
        description: button.description || "",
        color: button.color,
        webhook_url: button.webhook_url,
        field: button.field,
        value: button.value,
        field_type: button.field_type || 'string', // Garantir que sempre tem valor
        action_type: button.action_type,
        hotkey: button.hotkey,
        sort: button.sort,
        pos: button.layout as any,
        sub_buttons: button.sub_buttons as any,
        category: button.layout.category,
        sync_target: button.sync_target || 'bitrix',
        additional_fields: button.additional_fields || [],
      }));

      // Primeiro inserir os novos dados
      const { error: insertError } = await supabase
        .from("button_config")
        .insert(buttonsToInsert);

      if (insertError) {
        throw insertError;
      }

      // Só depois de inserir com sucesso, deletar os antigos que não estão na lista nova
      const currentIds = buttons.map(b => b.id);
      const { error: deleteError } = await supabase
        .from("button_config")
        .delete()
        .not('id', 'in', `(${currentIds.map(id => `'${id}'`).join(',')})`);

      if (deleteError) {
        console.warn("Aviso ao limpar botões antigos:", deleteError);
      }

      toast.success("Configuração salva com sucesso!");
      loadButtons();
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      
      if (error.message?.includes('button_config_field_type_check')) {
        toast.error("Erro: tipo de campo inválido. Verifique se todos os botões têm um tipo de campo válido (string, number, datetime ou boolean).");
      } else {
        toast.error("Erro ao salvar configuração: " + (error.message || "Erro desconhecido"));
      }
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
                Organize os botões por categoria e configure suas ações clicando duas vezes em cada botão.
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

          <CategoryManager 
            categories={categories} 
            onCategoriesChange={loadCategories}
          />

          <section className="space-y-4">
              {loadingButtons ? (
                <p className="text-sm text-muted-foreground">Carregando botões...</p>
              ) : buttons.length === 0 ? (
                <Card className="p-6 text-sm text-muted-foreground">
                  Nenhum botão configurado ainda. Clique em "Adicionar Botão" para começar.
                </Card>
              ) : (
                <div className="grid gap-4 lg:grid-cols-3">
                  {categories.map((category) => {
                    const categoryButtons = buttons.filter((button) => button.layout.category === category.name);

                    return (
                      <div
                        key={category.id}
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.dataTransfer.dropEffect = "move";
                        }}
                        onDrop={(event) => handleColumnDrop(event, category.name)}
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
                                  onDrop={(event) => handleButtonDropOnCard(event, category.name, index)}
                                >
                                  <Card
                                    className={cn(
                                      "p-3 bg-background shadow-sm hover:shadow-md transition-shadow cursor-pointer group",
                                      draggingButton === button.id && "ring-2 ring-primary/40",
                                    )}
                                    onDoubleClick={() => setEditingButtonId(button.id)}
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
                                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            duplicateButton(button.id);
                                          }}
                                          className="h-7 w-7 p-0"
                                          title="Duplicar botão"
                                        >
                                          <Copy className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingButtonId(button.id);
                                          }}
                                          className="h-7 w-7 p-0"
                                          title="Editar botão"
                                        >
                                          <Edit className="w-3.5 h-3.5" />
                                        </Button>
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
          
          {/* Área de Lixeira */}
          {draggingButton && (
            <div 
              className={cn(
                "mt-6 rounded-xl border-2 border-dashed transition-all duration-300 flex items-center justify-center gap-3 py-8",
                isDraggingOverTrash 
                  ? "border-destructive bg-destructive/20 scale-105" 
                  : "border-muted-foreground/30 bg-muted/20"
              )}
              onDragOver={handleTrashDragOver}
              onDragLeave={handleTrashDragLeave}
              onDrop={handleTrashDrop}
            >
              <Trash2 
                className={cn(
                  "w-8 h-8 transition-colors",
                  isDraggingOverTrash ? "text-destructive" : "text-muted-foreground"
                )} 
              />
              <span 
                className={cn(
                  "font-medium transition-colors",
                  isDraggingOverTrash ? "text-destructive" : "text-muted-foreground"
                )}
              >
                {isDraggingOverTrash ? "Solte para excluir" : "Arraste aqui para excluir"}
              </span>
            </div>
          )}
        </Card>

        <ButtonEditDialog
          open={editingButton !== null}
          onOpenChange={(open) => !open && setEditingButtonId(null)}
          button={editingButton}
          categories={categories}
          bitrixFields={bitrixFields}
          supabaseFields={[
            { name: 'id', title: 'ID', type: 'bigint' },
            { name: 'name', title: 'Nome', type: 'text' },
            { name: 'age', title: 'Idade', type: 'integer' },
            { name: 'address', title: 'Endereço', type: 'text' },
            { name: 'photo_url', title: 'Foto URL', type: 'text' },
            { name: 'responsible', title: 'Responsável', type: 'text' },
            { name: 'scouter', title: 'Scouter', type: 'text' },
            { name: 'sync_status', title: 'Status Sync', type: 'text' },
          ]}
          onUpdate={updateButton}
          onUpdateLayout={updateButtonLayout}
          onAddSubButton={addSubButton}
          onRemoveSubButton={removeSubButton}
          onUpdateSubButton={updateSubButton}
          onFieldDrop={handleFieldDrop}
          onMoveButton={moveButton}
          onDelete={removeButton}
          onSave={saveConfig}
          renderFieldValueControl={renderFieldValueControl}
          onAddAdditionalField={addAdditionalField}
          onRemoveAdditionalField={removeAdditionalField}
          onUpdateAdditionalField={updateAdditionalField}
          onAddSubAdditionalField={addSubAdditionalField}
          onRemoveSubAdditionalField={removeSubAdditionalField}
          onUpdateSubAdditionalField={updateSubAdditionalField}
        />
      </div>
    </div>
  );
};

export default Config;
