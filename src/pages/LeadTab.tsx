import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Edit, HelpCircle, Loader2, X } from "lucide-react";
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
  

  useEffect(() => {
    loadButtons();
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

          const newProfile: LeadProfile = {
            RESPONSAVEL: assignee?.name || attrs.responsavel || "",
            MODELO: attrs.nome_do_modelo || sender.name || "",
            IDADE: attrs.idade || "",
            LOCAL: attrs.local_de_abordagem || attrs.local || "",
            SCOUTER: attrs.scouter || "",
            PHOTO: sender.thumbnail || "",
          };

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
        <Button
          variant="outline"
          onClick={() => navigate("/")}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 flex flex-col items-center gap-4 h-fit">
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

                <div className="flex gap-2 w-full mt-4">
                  <Button onClick={() => setEditMode(true)} className="flex-1" disabled={loadingProfile}>
                    <Edit className="w-4 h-4 mr-2" />
                    Editar Perfil
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowHelp(!showHelp)}
                    className="flex-1"
                  >
                    <HelpCircle className="w-4 h-4 mr-2" />
                    Atalhos
                  </Button>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => navigate('/dashboard')}
                  className="w-full"
                >
                  Dashboard
                </Button>
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
              {loadingButtons && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                          {categoryButtons.map((btn) => {
                            const widthKey = Math.max(
                              1,
                              Math.min(3, Math.round(btn.layout.w || 1)),
                            ) as 1 | 2 | 3;
                            const heightKey = Math.max(
                              1,
                              Math.min(3, Math.round(btn.layout.h || 1)),
                            ) as 1 | 2 | 3;

                            return (
                              <Button
                                variant="ghost"
                                key={btn.id}
                                data-btn-id={btn.id}
                                onClick={() => handleButtonClick(btn)}
                                className={cn(
                                  "flex flex-col items-start justify-between gap-2 rounded-2xl px-4 py-4 text-left text-base font-semibold text-white shadow-lg transition-transform duration-150 hover:scale-[1.02] focus-visible:scale-[1.02] hover:bg-white/20 hover:text-white",
                                  widthClassMap[widthKey],
                                  heightClassMap[heightKey],
                                )}
                                style={{ backgroundColor: btn.color }}
                              >
                                <span>{btn.label}</span>
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

            <div className="mt-6 flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigate("/config")}
                className="flex-1"
              >
                ⚙️ Configurar Botões
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/logs")}
                className="flex-1"
              >
                📋 Ver Logs
              </Button>
            </div>
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
    </div>
  );
};

export default LeadTab;
