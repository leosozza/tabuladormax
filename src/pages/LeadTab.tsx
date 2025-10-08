import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Edit, HelpCircle, Loader2, X, Settings, Plus, Minus } from "lucide-react";
import UserMenu from "@/components/UserMenu";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useHotkeys } from "@/hooks/useHotkeys";
import { BitrixError, BitrixLead, getLead, updateLead, updateLeadViaWebhook } from "@/lib/bitrix";
import {
  BUTTON_CATEGORIES,
  categoryOrder,
  ensureButtonLayout,
  type ButtonCategory,
  type ButtonLayout,
} from "@/lib/button-layout";
import { cn } from "@/lib/utils";

interface LeadProfile {
  RESPONSAVEL: string;
  MODELO: string;
  IDADE: string;
  LOCAL: string;
  SCOUTER: string;
  PHOTO: string;
}

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
  value?: string;
  field_type: string;
  action_type: string;
  hotkey?: string;
  sort: number;
  layout: ButtonLayout;
  sub_buttons: SubButton[];
}

interface FieldMapping {
  id?: string;
  profile_field: string;
  chatwoot_field: string;
  display_name?: string;
}

const emptyProfile: LeadProfile = {
  RESPONSAVEL: "",
  MODELO: "",
  IDADE: "",
  LOCAL: "",
  SCOUTER: "",
  PHOTO: "",
};

const mapLeadToProfile = (lead: BitrixLead | null | undefined): LeadProfile => ({
  RESPONSAVEL: lead?.UF_RESPONSAVEL || lead?.ASSIGNED_BY_NAME || "",
  MODELO: lead?.NAME || "",
  IDADE: lead?.UF_IDADE || "",
  LOCAL: lead?.UF_LOCAL || lead?.ADDRESS || "",
  SCOUTER: lead?.UF_SCOUTER || "",
  PHOTO: lead?.UF_PHOTO || lead?.PHOTO || "",
});

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
            : "Motivo",
      subWebhook:
        typeof payload.subWebhook === "string" && payload.subWebhook
          ? payload.subWebhook
          : typeof payload.webhook === "string" && payload.webhook
            ? payload.webhook
            : "",
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

const normalizeButtonList = (buttons: ButtonConfig[]): ButtonConfig[] => {
  const counters = BUTTON_CATEGORIES.reduce(
    (acc, category) => ({ ...acc, [category.id]: 0 }),
    {} as Record<ButtonCategory, number>,
  );

  return buttons
    .map((button) => ({
      ...button,
      layout: ensureButtonLayout(button.layout, button.sort ?? 0),
      sub_buttons: Array.isArray(button.sub_buttons) ? button.sub_buttons : [],
    }))
    .sort((a, b) => {
      const categoryDiff =
        categoryOrder.indexOf(a.layout.category) - categoryOrder.indexOf(b.layout.category);

      if (categoryDiff !== 0) {
        return categoryDiff;
      }

      return a.layout.index - b.layout.index;
    })
    .map((button) => {
      const index = counters[button.layout.category];
      counters[button.layout.category] = index + 1;

      return {
        ...button,
        layout: {
          ...button.layout,
          index,
        },
        sub_buttons: button.sub_buttons.map((sub) => ({
          ...sub,
          subLabel: sub.subLabel || "Motivo",
        })),
      };
    });
};

const widthClassMap: Record<number, string> = {
  1: "lg:col-span-2",
  2: "lg:col-span-3",
  3: "lg:col-span-6",
};

const heightClassMap: Record<number, string> = {
  1: "min-h-[96px]",
  2: "min-h-[136px]",
  3: "min-h-[176px]",
};

const DEFAULT_WEBHOOK = "https://maxsystem.bitrix24.com.br/rest/7/338m945lx9ifjjnr/crm.lead.update.json";

const LeadTab = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<LeadProfile>(emptyProfile);
  const [buttons, setButtons] = useState<ButtonConfig[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [selectedButton, setSelectedButton] = useState<ButtonConfig | null>(null);
  const [subButtonModal, setSubButtonModal] = useState(false);
  const [scheduleModal, setScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [bitrixData, setBitrixData] = useState<BitrixLead | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingButtons, setLoadingButtons] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [showFieldMappingModal, setShowFieldMappingModal] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const [buttonColumns, setButtonColumns] = useState(3); // 3, 4 ou 5 colunas
  

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (roles && roles.length > 0) {
        const hasManagerRole = roles.some(r => r.role === 'admin' || r.role === 'manager');
        setIsManager(hasManagerRole);
      }
    } catch (error) {
      console.error('Erro ao verificar role:', error);
    }
  };

  const loadFieldMappings = async () => {
    try {
      const { data, error } = await supabase
        .from("profile_field_mapping")
        .select("*");

      if (error) throw error;
      
      if (data) {
        setFieldMappings(data as FieldMapping[]);
      }
    } catch (error) {
      console.error("Erro ao carregar mapeamentos:", error);
      toast.error("Erro ao carregar configurações de campos");
    }
  };

  const saveFieldMapping = async (profileField: string, chatwootField: string, displayName?: string) => {
    try {
      const { error } = await supabase
        .from("profile_field_mapping")
        .upsert({ 
          profile_field: profileField, 
          chatwoot_field: chatwootField,
          display_name: displayName 
        })
        .eq("profile_field", profileField);

      if (error) throw error;
      
      toast.success("Mapeamento salvo com sucesso!");
      loadFieldMappings();
    } catch (error) {
      console.error("Erro ao salvar mapeamento:", error);
      toast.error("Erro ao salvar mapeamento");
    }
  };

  const deleteFieldMapping = async (profileField: string) => {
    try {
      const { error } = await supabase
        .from("profile_field_mapping")
        .delete()
        .eq("profile_field", profileField);

      if (error) throw error;
      
      toast.success("Campo removido com sucesso!");
      loadFieldMappings();
    } catch (error) {
      console.error("Erro ao remover campo:", error);
      toast.error("Erro ao remover campo");
    }
  };

  const addNewField = async () => {
    const newFieldKey = `custom_${Date.now()}`;
    await saveFieldMapping(newFieldKey, '', 'Novo Campo');
  };


  const getNestedValue = (obj: any, path: string): string => {
    return path.split('.').reduce((current, key) => current?.[key], obj) || '';
  };

  useEffect(() => {
    checkUserRole();
    loadButtons();
    loadFieldMappings();
  }, []);

  useEffect(() => {
    if (id && !bitrixData) {
      loadLeadProfile(id);
    }
  }, [id, bitrixData]);

  // Listener do Chatwoot via window.postMessage
  useEffect(() => {
    const handleChatwootMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;

        if (data?.conversation?.meta?.sender) {
          const sender = data.conversation.meta.sender;
          const attrs = sender.custom_attributes || {};
          const assignee = data.conversation.meta.assignee;

          // Criar objeto com todos os dados do Chatwoot
          const chatwootData = {
            contact: {
              name: sender.name,
              phone_number: sender.phone_number,
              email: sender.email,
              custom_attributes: attrs
            },
            assignee: assignee
          };

          // Aplicar mapeamentos configurados
          const newProfile: LeadProfile = {
            RESPONSAVEL: assignee?.name || attrs.responsavel || "",
            MODELO: attrs.nome_do_modelo || sender.name || "",
            IDADE: attrs.idade || "",
            LOCAL: attrs.local_de_abordagem || attrs.local || "",
            SCOUTER: attrs.scouter || "",
            PHOTO: sender.thumbnail || "",
          };

          // Se houver mapeamentos configurados, aplicá-los
          if (fieldMappings.length > 0) {
            fieldMappings.forEach(mapping => {
              const value = getNestedValue(chatwootData, mapping.chatwoot_field);
              if (value) {
                const profileKey = mapping.profile_field.toUpperCase();
                if (profileKey in newProfile) {
                  (newProfile as any)[profileKey] = value;
                }
              }
            });
          }

          setProfile(newProfile);

          // Salvar o ID do Bitrix se disponível
          if (attrs.idbitrix) {
            setBitrixData({ ID: attrs.idbitrix } as BitrixLead);
          }

          console.log("✅ Dados recebidos do Chatwoot:", newProfile);
          toast.success("Lead recebido do Chatwoot!");
        }
      } catch (err) {
        console.error("Erro ao processar evento do Chatwoot:", err);
      }
    };

    window.addEventListener("message", handleChatwootMessage);
    
    // Avisar ao Chatwoot que está pronto
    window.parent.postMessage({ ready: true }, "*");

    return () => window.removeEventListener("message", handleChatwootMessage);
  }, []);

  const hotkeyMapping = useMemo(() => buttons.flatMap(btn => {
    const main = btn.hotkey ? [{ id: btn.id, key: btn.hotkey }] : [];
    const subs = (btn.sub_buttons || [])
      .filter(sb => sb.subHotkey)
      .map(sb => ({ id: `${btn.id}::${sb.subLabel}`, key: sb.subHotkey! }));
    return [...main, ...subs];
  }), [buttons]);

  useHotkeys(hotkeyMapping, editMode);

  const loadButtons = async () => {
    setLoadingButtons(true);
    const { data, error } = await supabase
      .from('button_config')
      .select('*')
      .order('sort', { ascending: true });

    if (error) {
      console.error('Erro ao carregar botões:', error);
      toast.error('Não foi possível carregar os botões');
      setLoadingButtons(false);
      return;
    }

    const parsed = (data || []).map((entry, index) => ({
      id: entry.id,
      label: entry.label,
      color: entry.color,
      webhook_url: (entry as any).webhook_url || DEFAULT_WEBHOOK,
      field: entry.field || "",
      value: entry.value || "",
      field_type: entry.field_type || "string",
      action_type: entry.action_type || "simple",
      hotkey: entry.hotkey || "",
      sort: entry.sort || index + 1,
      layout: ensureButtonLayout(entry.pos as any, entry.sort || index),
      sub_buttons: parseSubButtons(entry.sub_buttons),
    }));

    setButtons(normalizeButtonList(parsed));
    setLoadingButtons(false);
  };

  // Removido loadCustomFields e saveCustomField - tabela não existe

  const loadLeadProfile = async (leadId: string) => {
    setLoadingProfile(true);
    try {
      const numericId = Number(leadId);
      const { data: cached } = await supabase
        .from('leads')
        .select('*')
        .eq('id', numericId)
        .maybeSingle();

      if (cached) {
        const raw = (cached.raw as any) || {};
        setProfile({
          RESPONSAVEL: cached.responsible || "",
          MODELO: cached.name || "",
          IDADE: cached.age !== null && cached.age !== undefined ? String(cached.age) : "",
          LOCAL: cached.address || "",
          SCOUTER: cached.scouter || "",
          PHOTO: cached.photo_url || "",
        });
      }

      const bitrix = await getLead(leadId);
      setBitrixData(bitrix);
      const nextProfile = mapLeadToProfile(bitrix);
      setProfile(nextProfile);

      const { error: upsertError } = await supabase.from('leads').upsert({
        id: numericId,
        name: nextProfile.MODELO,
        responsible: nextProfile.RESPONSAVEL,
        age: nextProfile.IDADE ? Number(nextProfile.IDADE) : null,
        address: nextProfile.LOCAL,
        scouter: nextProfile.SCOUTER,
        photo_url: nextProfile.PHOTO || null,
        date_modify: bitrix.DATE_MODIFY || null,
        raw: bitrix as any,
        updated_at: new Date().toISOString(),
      });

      if (upsertError) {
        console.error('Erro ao salvar cache do lead:', upsertError);
      }
    } catch (error) {
      console.error('Erro ao buscar lead no Bitrix:', error);
      if (error instanceof BitrixError) {
        toast.error(`Bitrix: ${error.message}`);
      } else {
        toast.error('Falha ao carregar dados do lead');
      }
    } finally {
      setLoadingProfile(false);
    }
  };

  const updateCache = async () => {
    if (!id) return;
    const numericId = Number(id);
    setSavingProfile(true);

    try {
      const { error: cacheError } = await supabase
        .from('leads')
        .upsert({
          id: numericId,
          name: profile.MODELO,
          responsible: profile.RESPONSAVEL,
          age: profile.IDADE ? Number(profile.IDADE) : null,
          address: profile.LOCAL,
          scouter: profile.SCOUTER,
          photo_url: profile.PHOTO || null,
          date_modify: bitrixData?.DATE_MODIFY || null,
          raw: { ...(bitrixData ?? {}), profile } as any,
          updated_at: new Date().toISOString(),
        });

      if (cacheError) {
        throw cacheError;
      }

      // Sincronizar com Bitrix em tempo real via webhook
      const bitrixFields = {
        NAME: profile.MODELO,
        UF_RESPONSAVEL: profile.RESPONSAVEL,
        UF_IDADE: profile.IDADE,
        UF_LOCAL: profile.LOCAL,
        UF_SCOUTER: profile.SCOUTER,
      };

      await updateLeadViaWebhook(DEFAULT_WEBHOOK, numericId, bitrixFields);

      // Registrar log da ação
      await supabase.from('actions_log').insert({
        lead_id: numericId,
        action_label: 'Atualização de perfil',
        payload: { fields: bitrixFields },
        status: 'OK',
      });

      toast.success("Perfil sincronizado com sucesso!");
      setEditMode(false);
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      
      // Registrar log de erro
      await supabase.from('actions_log').insert({
        lead_id: numericId,
        action_label: 'Atualização de perfil',
        payload: {},
        status: 'ERROR',
        error: error instanceof BitrixError ? error.message : String(error),
      });

      toast.error(error instanceof BitrixError ? error.message : 'Não foi possível salvar o perfil');
    } finally {
      setSavingProfile(false);
    }
  };

  const executeAction = async (button: ButtonConfig, subButton?: SubButton, scheduledDate?: string) => {
    if (!id) return;
    const numericId = Number(id);

    try {
      const webhookUrl = subButton?.subWebhook || button.webhook_url;
      const field = subButton?.subField || button.field;
      const value = scheduledDate || subButton?.subValue || button.value || "";

      const payloadFields = {
        NAME: profile.MODELO,
        UF_RESPONSAVEL: profile.RESPONSAVEL,
        UF_IDADE: profile.IDADE,
        UF_LOCAL: profile.LOCAL,
        UF_SCOUTER: profile.SCOUTER,
        [field]: value,
      };

      await updateLeadViaWebhook(webhookUrl, numericId, payloadFields);

      const { error: logError } = await supabase.from('actions_log').insert({
        lead_id: numericId,
        action_label: subButton ? `${button.label} / ${subButton.subLabel}` : button.label,
        payload: { webhook: webhookUrl, fields: payloadFields },
        status: 'OK',
      });

      if (logError) {
        console.warn('Erro ao registrar log de sucesso:', logError);
      }

      toast.success("Ação executada com sucesso!");
      setSubButtonModal(false);
      setScheduleModal(false);
      setSelectedButton(null);
    } catch (error) {
      console.error('Erro ao executar ação:', error);
      toast.error(error instanceof BitrixError ? error.message : "Erro ao executar ação");

      const { error: logError } = await supabase.from('actions_log').insert({
        lead_id: numericId,
        action_label: button.label,
        payload: {},
        status: 'ERROR',
        error: error instanceof BitrixError ? error.message : String(error),
      });

      if (logError) {
        console.warn('Erro ao registrar log de erro:', logError);
      }
    }
  };

  const handleButtonClick = (button: ButtonConfig) => {
    setSelectedButton(button);

    if (button.sub_buttons && button.sub_buttons.length > 0) {
      setSubButtonModal(true);
      return;
    }

    if (button.action_type === 'schedule' || button.field_type === 'datetime') {
      setScheduleModal(true);
      setScheduleDate("");
      setScheduleTime("");
      return;
    }

    executeAction(button);
  };

  const handleScheduleConfirm = () => {
    if (!selectedButton || !scheduleDate || !scheduleTime) {
      toast.error("Selecione data e hora");
      return;
    }

    const datetime = `${scheduleDate} ${scheduleTime}:00`;
    executeAction(selectedButton, undefined, datetime);
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="container mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 flex flex-col items-center gap-4 h-fit relative">
            {!editMode && (
              <Button 
                onClick={() => setEditMode(true)} 
                size="icon"
                disabled={loadingProfile}
                title="Editar Perfil"
                className="absolute top-4 right-4"
              >
                <Edit className="w-4 h-4" />
              </Button>
            )}
            
            <div className="relative">
              {loadingProfile && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-full">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              )}
              <img
                src={profile.PHOTO || "/placeholder.svg"}
                alt={profile.MODELO}
                className="rounded-full w-40 h-40 border-4 border-green-500 shadow-lg object-cover"
              />
            </div>

            {!editMode ? (
              <>
                <h2 className="text-2xl font-bold text-center">{profile.MODELO || 'Lead sem nome'}</h2>
                <div className="w-full space-y-2 text-sm">
                  <p>👤 <strong>Responsável:</strong> {profile.RESPONSAVEL || '—'}</p>
                  <p>🎂 <strong>Idade:</strong> {profile.IDADE || '—'}</p>
                  <p>📍 <strong>Local:</strong> {profile.LOCAL || '—'}</p>
                  <p>🧭 <strong>Scouter:</strong> {profile.SCOUTER || '—'}</p>
                </div>

                <div className="flex flex-col gap-2 w-full mt-4">
                  <div className="flex gap-2 w-full">
                    <Button
                      variant="secondary"
                      onClick={() => navigate('/dashboard')}
                      className="flex-1"
                    >
                      Dashboard
                    </Button>
                    <UserMenu />
                  </div>
                  
                  {isManager && (
                    <div className="flex flex-col gap-2 w-full">
                      <Button
                        variant="outline"
                        onClick={() => navigate('/config')}
                        className="w-full"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Configurar Campos
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => navigate('/designer')}
                        className="w-full"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Configurar Botões
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => navigate('/logs')}
                        className="w-full"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Ver Logs
                      </Button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="w-full space-y-3">
                <div>
                  <Label>Responsável</Label>
                  <Input
                    value={profile.RESPONSAVEL}
                    onChange={(e) => setProfile({ ...profile, RESPONSAVEL: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Modelo</Label>
                  <Input
                    value={profile.MODELO}
                    onChange={(e) => setProfile({ ...profile, MODELO: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Idade</Label>
                  <Input
                    value={profile.IDADE}
                    onChange={(e) => setProfile({ ...profile, IDADE: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Local</Label>
                  <Input
                    value={profile.LOCAL}
                    onChange={(e) => setProfile({ ...profile, LOCAL: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Scouter</Label>
                  <Input
                    value={profile.SCOUTER}
                    onChange={(e) => setProfile({ ...profile, SCOUTER: e.target.value })}
                  />
                </div>

                <Button onClick={updateCache} className="w-full mt-4" disabled={savingProfile}>
                  {savingProfile ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Salvando...
                    </span>
                  ) : (
                    "💾 Atualizar Cache"
                  )}
                </Button>
              </div>
            )}
          </Card>

          <Card className="p-6 relative min-h-[320px]">
            {showHelp && (
              <div className="absolute right-4 top-4 bg-gray-900/95 text-white rounded-xl p-4 z-10 max-w-sm shadow-2xl">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold">⌨️ Atalhos</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowHelp(false)}
                    className="text-white hover:text-gray-300"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-1 text-sm">
                  {buttons.map(btn => (
                    <div key={btn.id}>
                      <p className="text-gray-200">
                        {btn.label} — <span className="text-yellow-300">{btn.hotkey || '—'}</span>
                      </p>
                      {btn.sub_buttons?.map(sb => (
                        <p key={sb.subLabel} className="text-gray-400 ml-4 text-xs">
                          › {sb.subLabel} — <span className="text-yellow-300">{sb.subHotkey || '—'}</span>
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">⚙️ Ações de Tabulação</h3>
              <div className="flex items-center gap-2">
                {loadingButtons && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
                
                {/* Controle de tamanho dos botões */}
                <div className="flex items-center gap-1 border rounded-md">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setButtonColumns(Math.min(5, buttonColumns + 1))}
                    disabled={buttonColumns >= 5}
                    title="Diminuir tamanho (mais colunas)"
                    className="h-8 w-8"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                  <span className="text-xs px-2 font-medium">{buttonColumns}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setButtonColumns(Math.max(3, buttonColumns - 1))}
                    disabled={buttonColumns <= 3}
                    title="Aumentar tamanho (menos colunas)"
                    className="h-8 w-8"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                </div>
                
                <Button
                  variant="outline"
                  onClick={() => setShowHelp(!showHelp)}
                  size="icon"
                  title="Atalhos"
                >
                  <HelpCircle className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {buttons.length === 0 && !loadingButtons ? (
              <p className="text-sm text-muted-foreground">
                Nenhum botão configurado. Clique em "Configurar Botões" para começar.
              </p>
            ) : (
              <div className="space-y-6">
                {BUTTON_CATEGORIES.map((category) => {
                  const categoryButtons = buttons.filter(
                    (button) => button.layout.category === category.id,
                  );

                  return (
                    <div key={category.id}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                          {category.label}
                        </h4>
                        <span className="text-xs text-muted-foreground">
                          {categoryButtons.length} botões
                        </span>
                      </div>

                      {categoryButtons.length === 0 ? (
                        <Card className="border-dashed bg-muted/20 p-6 text-xs text-muted-foreground">
                          Nenhuma ação configurada para esta categoria.
                        </Card>
                      ) : (
                        <div 
                          className="grid gap-3"
                          style={{
                            gridTemplateColumns: `repeat(${buttonColumns}, minmax(0, 1fr))`
                          }}
                        >
                          {categoryButtons.map((btn) => {
                            return (
                              <Button
                                variant="ghost"
                                key={btn.id}
                                data-btn-id={btn.id}
                                onClick={() => handleButtonClick(btn)}
                                className="flex flex-col items-center justify-center gap-2 rounded-2xl px-4 py-6 text-center text-base font-semibold text-white shadow-lg transition-transform duration-150 hover:scale-[1.02] focus-visible:scale-[1.02] hover:bg-white/20 hover:text-white min-h-[96px]"
                                style={{ backgroundColor: btn.color }}
                              >
                                <span className="break-words w-full">{btn.label}</span>
                                {btn.hotkey && (
                                  <span className="text-xs uppercase tracking-wide opacity-80">
                                    [{btn.hotkey}]
                                  </span>
                                )}
                              </Button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
            )}
          </Card>
        </div>
      </div>

      <Dialog open={subButtonModal} onOpenChange={setSubButtonModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedButton?.label} - Selecione o motivo</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {selectedButton?.sub_buttons?.map((sub) => (
              <Button
                key={sub.subLabel}
                data-btn-id={`${selectedButton.id}::${sub.subLabel}`}
                onClick={() => executeAction(selectedButton, sub)}
                variant="outline"
                className="w-full justify-start"
              >
                {sub.subLabel}
                {sub.subHotkey && <span className="ml-2 text-xs opacity-60">[{sub.subHotkey}]</span>}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={scheduleModal} onOpenChange={setScheduleModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agendar {selectedButton?.label}</DialogTitle>
            <DialogDescription>Escolha a data e horário</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Data</Label>
              <Input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Horário</Label>
              <Input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleScheduleConfirm}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showFieldMappingModal} onOpenChange={setShowFieldMappingModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configurar Campos do Perfil</DialogTitle>
            <DialogDescription>
              Defina qual campo do Chatwoot corresponde a cada campo do perfil. Use notação de ponto para campos aninhados (ex: contact.name, contact.custom_attributes.idade)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {fieldMappings.map((mapping, index) => (
              <Card key={mapping.profile_field} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="font-semibold">Campo #{index + 1}</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteFieldMapping(mapping.profile_field)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div>
                    <Label className="text-xs text-muted-foreground">Nome de Exibição</Label>
                    <Input
                      placeholder="Ex: Nome, Idade, Endereço..."
                      defaultValue={mapping.display_name || ''}
                      onBlur={(e) => {
                        if (e.target.value) {
                          saveFieldMapping(mapping.profile_field, mapping.chatwoot_field, e.target.value);
                        }
                      }}
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Chave do Campo (identificador único)</Label>
                    <Input
                      placeholder="Ex: name, age, custom_field"
                      value={mapping.profile_field}
                      disabled
                      className="bg-muted"
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Campo do Chatwoot</Label>
                    <Input
                      placeholder="Ex: contact.name ou contact.custom_attributes.idade"
                      defaultValue={mapping.chatwoot_field || ''}
                      onBlur={(e) => {
                        saveFieldMapping(mapping.profile_field, e.target.value, mapping.display_name);
                      }}
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={addNewField} className="w-full sm:w-auto">
              + Adicionar Campo
            </Button>
            <Button onClick={() => setShowFieldMappingModal(false)} className="w-full sm:w-auto">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeadTab;
