import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
import { saveChatwootContact, extractChatwootData, type ChatwootEventData } from "@/lib/chatwoot";
import {
  BUTTON_CATEGORIES,
  categoryOrder,
  ensureButtonLayout,
  type ButtonCategory,
  type ButtonLayout,
} from "@/lib/button-layout";
import { cn } from "@/lib/utils";

// Profile é agora dinâmico, baseado nos field mappings
type DynamicProfile = Record<string, any>;

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

const emptyProfile: DynamicProfile = {};

const mapChatwootToProfile = (contact: any, fieldMappings: FieldMapping[]): DynamicProfile => {
  const profile: DynamicProfile = {};
  
  // Mapear todos os campos configurados
  fieldMappings.forEach(mapping => {
    const value = getNestedValue(contact, mapping.chatwoot_field);
    profile[mapping.profile_field] = value || "";
  });

  return profile;
};

const getNestedValue = (obj: any, path: string): any => {
  if (!path) return '';
  return path.split('.').reduce((current, key) => current?.[key], obj) || '';
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
  const navigate = useNavigate();

  const [profile, setProfile] = useState<DynamicProfile>(emptyProfile);
  const [buttons, setButtons] = useState<ButtonConfig[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [selectedButton, setSelectedButton] = useState<ButtonConfig | null>(null);
  const [subButtonModal, setSubButtonModal] = useState(false);
  const [scheduleModal, setScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [chatwootData, setChatwootData] = useState<any>(null);
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


  useEffect(() => {
    checkUserRole();
    loadButtons();
    loadFieldMappings();
  }, []);

  // Listener do Chatwoot via window.postMessage
  useEffect(() => {
    console.log("🎧 Listener de mensagens do Chatwoot ativado na página LeadTab");
    
    const handleChatwootMessage = async (event: MessageEvent) => {
      console.log("📨 Mensagem recebida no LeadTab:", {
        origin: event.origin,
        dataType: typeof event.data,
        hasConversation: !!event.data?.conversation,
      });

      try {
        let data = event.data;
        
        // Parse se for string
        if (typeof data === "string") {
          try {
            data = JSON.parse(data);
            console.log("✅ Dados parseados:", data);
          } catch {
            console.log("⚠️ Não é JSON válido");
            return;
          }
        }

        if (data?.conversation?.meta?.sender) {
          console.log("👤 Dados de conversação encontrados");
          const contactData = extractChatwootData(data as ChatwootEventData);
          
          if (contactData) {
            console.log("💾 Salvando contato:", contactData.bitrix_id);
            
            // Salvar no Supabase
            await saveChatwootContact(contactData);
            
            // Atualizar o profile na interface
            const newProfile = mapChatwootToProfile(contactData, fieldMappings);
            setProfile(newProfile);
            setChatwootData(contactData);

            // Registrar log do evento recebido
            await supabase.from('actions_log').insert([{
              lead_id: Number(contactData.bitrix_id),
              action_label: 'Evento Chatwoot Recebido',
              payload: {
                conversation_id: contactData.conversation_id,
                contact_id: contactData.contact_id,
                event_type: 'message_received'
              } as any,
              status: 'OK',
            }]);

            console.log("✅ Dados recebidos e salvos do Chatwoot");
            toast.success("Lead atualizado do Chatwoot!");
          } else {
            console.log("⚠️ Nenhum idbitrix encontrado nos dados");
          }
        } else {
          console.log("ℹ️ Mensagem sem dados de conversação");
        }
      } catch (err) {
        console.error("❌ Erro ao processar evento do Chatwoot:", err);
        toast.error("Erro ao processar dados do Chatwoot");
        
        // Registrar log de erro
        if (chatwootData?.bitrix_id) {
          await supabase.from('actions_log').insert([{
            lead_id: Number(chatwootData.bitrix_id),
            action_label: 'Erro ao processar Chatwoot',
            payload: {} as any,
            status: 'ERROR',
            error: String(err),
          }]);
        }
      }
    };

    window.addEventListener("message", handleChatwootMessage);
    
    // Avisar ao Chatwoot que está pronto
    console.log("📤 Enviando mensagem 'ready' para o Chatwoot");
    window.parent.postMessage({ ready: true }, "*");

    return () => {
      console.log("🔌 Listener de mensagens removido");
      window.removeEventListener("message", handleChatwootMessage);
    };
  }, [fieldMappings, navigate]);

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

  // Removido loadCustomFields, saveCustomField e loadLeadProfile - não são mais necessários
  // Os dados sempre virão via postMessage do Chatwoot

  const updateCache = async () => {
    if (!chatwootData) {
      toast.error("Nenhum dado do Chatwoot disponível");
      return;
    }
    setSavingProfile(true);

    try {
      // Construir custom_attributes baseado nos field mappings
      const updatedAttributes = { ...chatwootData.custom_attributes };
      
      fieldMappings.forEach(mapping => {
        const value = profile[mapping.profile_field];
        if (value !== undefined) {
          // Se o campo mapeia para custom_attributes.*, atualizar lá
          if (mapping.chatwoot_field.startsWith('contact.custom_attributes.')) {
            const attrKey = mapping.chatwoot_field.replace('contact.custom_attributes.', '');
            updatedAttributes[attrKey] = value;
          }
        }
      });

      // Atualizar no Supabase
      await saveChatwootContact({
        ...chatwootData,
        custom_attributes: updatedAttributes,
      });

      // Registrar log da ação
      await supabase.from('actions_log').insert([{
        lead_id: Number(chatwootData.bitrix_id),
        action_label: 'Atualização de perfil',
        payload: { profile } as any,
        status: 'OK',
      }]);

      toast.success("Perfil salvo com sucesso!");
      setEditMode(false);
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      
      // Registrar log de erro
      await supabase.from('actions_log').insert([{
        lead_id: Number(chatwootData.bitrix_id),
        action_label: 'Atualização de perfil',
        payload: {} as any,
        status: 'ERROR',
        error: String(error),
      }]);

      toast.error('Não foi possível salvar o perfil');
    } finally {
      setSavingProfile(false);
    }
  };

  const executeAction = async (button: ButtonConfig, subButton?: SubButton, scheduledDate?: string) => {
    if (!chatwootData) {
      toast.error("Nenhum dado do Chatwoot disponível");
      return;
    }

    try {
      const webhookUrl = subButton?.subWebhook || button.webhook_url;
      const field = subButton?.subField || button.field;
      const value = scheduledDate || subButton?.subValue || button.value || "";

      // Atualizar o custom_attributes no Supabase
      const updatedAttributes = {
        ...chatwootData.custom_attributes,
        [field]: value,
      };

      await saveChatwootContact({
        ...chatwootData,
        custom_attributes: updatedAttributes,
      });

      // TODO: Aqui você pode adicionar uma chamada para um webhook do Bitrix
      // se necessário para sincronização externa

      const { error: logError } = await supabase.from('actions_log').insert([{
        lead_id: Number(chatwootData.bitrix_id),
        action_label: subButton ? `${button.label} / ${subButton.subLabel}` : button.label,
        payload: { webhook: webhookUrl, field, value } as any,
        status: 'OK',
      }]);

      if (logError) {
        console.warn('Erro ao registrar log de sucesso:', logError);
      }

      toast.success("Ação executada com sucesso!");
      setSubButtonModal(false);
      setScheduleModal(false);
      setSelectedButton(null);
    } catch (error) {
      console.error('Erro ao executar ação:', error);
      toast.error("Erro ao executar ação");

      const { error: logError } = await supabase.from('actions_log').insert([{
        lead_id: Number(chatwootData.bitrix_id),
        action_label: button.label,
        payload: {} as any,
        status: 'ERROR',
        error: String(error),
      }]);

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
            
            {/* Foto do perfil */}
            <div className="relative">
              {loadingProfile && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-full">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              )}
              <img
                src={chatwootData?.thumbnail || profile.photo || profile.thumbnail || "/placeholder.svg"}
                alt={chatwootData?.name || 'Lead'}
                className="rounded-full w-40 h-40 border-4 border-green-500 shadow-lg object-cover"
              />
            </div>

            {!editMode ? (
              <>
                <h2 className="text-2xl font-bold text-center">{chatwootData?.name || 'Lead sem nome'}</h2>
                <div className="w-full space-y-2 text-sm">
                  {fieldMappings.map((mapping) => (
                    <p key={mapping.profile_field}>
                      <strong>{mapping.display_name || mapping.profile_field}:</strong>{' '}
                      {profile[mapping.profile_field] || '—'}
                    </p>
                  ))}
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
                        onClick={() => setShowFieldMappingModal(true)}
                        className="w-full"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Configurar Campos
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => navigate('/config')}
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
                {fieldMappings.map((mapping) => (
                  <div key={mapping.profile_field}>
                    <Label>{mapping.display_name || mapping.profile_field}</Label>
                    <Input
                      value={profile[mapping.profile_field] || ''}
                      onChange={(e) => setProfile({ 
                        ...profile, 
                        [mapping.profile_field]: e.target.value 
                      })}
                    />
                  </div>
                ))}

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
                                className="flex items-center justify-center rounded-lg px-3 py-3 text-center text-sm font-semibold text-white shadow-lg transition-transform duration-150 hover:scale-[1.02] focus-visible:scale-[1.02] hover:bg-white/20 hover:text-white h-14"
                                style={{ backgroundColor: btn.color }}
                              >
                                <span className="break-words line-clamp-2 w-full">{btn.label}</span>
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
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configurar Campos do Perfil</DialogTitle>
            <DialogDescription>
              Clique nos campos do Chatwoot para selecioná-los automaticamente
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-6">
            {/* Coluna da esquerda: Campos disponíveis do Chatwoot */}
            <div className="border rounded-lg p-4 bg-muted/30">
              <h3 className="font-semibold mb-3 text-sm">📋 Campos Disponíveis do Chatwoot</h3>
              <div className="space-y-2 text-sm">
                <div className="space-y-1">
                  <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide">Contato</p>
                  <div className="ml-4 space-y-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-8 text-xs font-mono hover:bg-primary/10"
                      onClick={() => {
                        const input = document.querySelector(`[data-chatwoot-field-input][data-active="true"]`) as HTMLInputElement;
                        if (input) {
                          input.value = 'contact.name';
                          input.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                      }}
                    >
                      contact.name
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-8 text-xs font-mono hover:bg-primary/10"
                      onClick={() => {
                        const input = document.querySelector(`[data-chatwoot-field-input][data-active="true"]`) as HTMLInputElement;
                        if (input) {
                          input.value = 'contact.email';
                          input.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                      }}
                    >
                      contact.email
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-8 text-xs font-mono hover:bg-primary/10"
                      onClick={() => {
                        const input = document.querySelector(`[data-chatwoot-field-input][data-active="true"]`) as HTMLInputElement;
                        if (input) {
                          input.value = 'contact.phone_number';
                          input.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                      }}
                    >
                      contact.phone_number
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-8 text-xs font-mono hover:bg-primary/10"
                      onClick={() => {
                        const input = document.querySelector(`[data-chatwoot-field-input][data-active="true"]`) as HTMLInputElement;
                        if (input) {
                          input.value = 'contact.thumbnail';
                          input.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                      }}
                    >
                      contact.thumbnail
                    </Button>
                  </div>
                </div>

                <div className="space-y-1 mt-4">
                  <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide">Atributos Customizados</p>
                  <div className="ml-4 space-y-1">
                    {chatwootData?.custom_attributes && Object.keys(chatwootData.custom_attributes).map((key) => (
                      <Button
                        key={key}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start h-8 text-xs font-mono hover:bg-primary/10"
                        onClick={() => {
                          const input = document.querySelector(`[data-chatwoot-field-input][data-active="true"]`) as HTMLInputElement;
                          if (input) {
                            input.value = `contact.custom_attributes.${key}`;
                            input.dispatchEvent(new Event('input', { bubbles: true }));
                          }
                        }}
                      >
                        contact.custom_attributes.{key}
                      </Button>
                    ))}
                    {(!chatwootData?.custom_attributes || Object.keys(chatwootData.custom_attributes).length === 0) && (
                      <p className="text-xs text-muted-foreground italic">Aguardando dados do Chatwoot...</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1 mt-4">
                  <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide">Conversa</p>
                  <div className="ml-4 space-y-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-8 text-xs font-mono hover:bg-primary/10"
                      onClick={() => {
                        const input = document.querySelector(`[data-chatwoot-field-input][data-active="true"]`) as HTMLInputElement;
                        if (input) {
                          input.value = 'conversation.id';
                          input.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                      }}
                    >
                      conversation.id
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-8 text-xs font-mono hover:bg-primary/10"
                      onClick={() => {
                        const input = document.querySelector(`[data-chatwoot-field-input][data-active="true"]`) as HTMLInputElement;
                        if (input) {
                          input.value = 'conversation.status';
                          input.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                      }}
                    >
                      conversation.status
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Coluna da direita: Configuração dos campos */}
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
                      <Label className="text-xs text-muted-foreground">
                        Campo do Chatwoot 
                        <span className="ml-2 text-xs opacity-60">(clique nos campos à esquerda)</span>
                      </Label>
                      <Input
                        data-chatwoot-field-input
                        placeholder="Clique em um campo à esquerda"
                        defaultValue={mapping.chatwoot_field || ''}
                        onBlur={(e) => {
                          saveFieldMapping(mapping.profile_field, e.target.value, mapping.display_name);
                        }}
                        onFocus={(e) => {
                          // Marcar este input como ativo
                          document.querySelectorAll('[data-chatwoot-field-input]').forEach(input => {
                            input.removeAttribute('data-active');
                          });
                          e.target.setAttribute('data-active', 'true');
                        }}
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
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
