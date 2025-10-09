import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Edit, HelpCircle, Loader2, X, Settings, Plus, Minus, Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { getLead, type BitrixLead } from "@/lib/bitrix";
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
  pos: any;
  sub_buttons: any;
  category?: string | null;
  sync_target?: 'bitrix' | 'supabase';
}

interface FieldMapping {
  id?: string;
  profile_field: string;
  chatwoot_field: string;
  display_name?: string;
  is_profile_photo?: boolean;
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

const mapBitrixToProfile = (bitrixLead: BitrixLead, fieldMappings: FieldMapping[]): DynamicProfile => {
  const profile: DynamicProfile = {};
  
  // Mapeamento direto de campos conhecidos do Bitrix
  const bitrixFieldMap: Record<string, string> = {
    'name': bitrixLead.NAME || bitrixLead.TITLE || '',
    'age': bitrixLead.UF_IDADE || bitrixLead.AGE || '',
    'address': bitrixLead.UF_LOCAL || bitrixLead.ADDRESS || bitrixLead.ADDRESS_CITY || '',
    'responsible': bitrixLead.UF_RESPONSAVEL || bitrixLead.ASSIGNED_BY_NAME || '',
    'scouter': bitrixLead.UF_SCOUTER || '',
    'photo': bitrixLead.UF_PHOTO || bitrixLead.PHOTO || '',
  };

  // Aplicar field mappings configurados
  fieldMappings.forEach(mapping => {
    const profileField = mapping.profile_field;
    profile[profileField] = bitrixFieldMap[profileField] || '';
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
  return buttons
    .map((button) => ({
      ...button,
      sub_buttons: Array.isArray(button.sub_buttons) ? button.sub_buttons : [],
    }))
    .sort((a, b) => a.sort - b.sort);
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
  const [searchModal, setSearchModal] = useState(false);
  const [searchId, setSearchId] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
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
      console.log("🔄 Carregando field mappings...");
      const { data, error } = await supabase
        .from("profile_field_mapping")
        .select("*");

      if (error) throw error;
      
      if (data) {
        console.log("✅ Field mappings carregados:", data);
        setFieldMappings(data as FieldMapping[]);
      } else {
        console.log("⚠️ Nenhum field mapping encontrado");
      }
    } catch (error) {
      console.error("❌ Erro ao carregar mapeamentos:", error);
      toast.error("Erro ao carregar configurações de campos");
    }
  };

  const saveFieldMapping = async (profileField: string, chatwootField: string, displayName?: string, isProfilePhoto?: boolean) => {
    try {
      const { error } = await supabase
        .from("profile_field_mapping")
        .upsert({ 
          profile_field: profileField, 
          chatwoot_field: chatwootField,
          display_name: displayName,
          is_profile_photo: isProfilePhoto || false
        }, { 
          onConflict: 'profile_field' 
        });

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

  const loadLeadById = async (bitrixId: string) => {
    if (!bitrixId || !bitrixId.trim()) {
      toast.error("Digite um ID válido");
      return;
    }

    setSearchLoading(true);
    try {
      // 1. Buscar primeiro no cache local (chatwoot_contacts)
      console.log("🔍 Buscando lead no cache local...", bitrixId);
      const { data: cachedContact, error: cacheError } = await supabase
        .from('chatwoot_contacts')
        .select('*')
        .eq('bitrix_id', bitrixId)
        .maybeSingle();

      if (cacheError) {
        console.error("Erro ao buscar no cache:", cacheError);
      }

      if (cachedContact) {
        console.log("✅ Lead encontrado no cache:", cachedContact);
        
        // Usar dados do cache
        setChatwootData(cachedContact);
        const newProfile = mapChatwootToProfile(cachedContact, fieldMappings);
        setProfile(newProfile);
        
        toast.success("Lead carregado do cache!");
        setSearchModal(false);
        setSearchId("");
        return;
      }

      // 2. Se não estiver no cache, buscar no Bitrix
      console.log("⚠️ Lead não encontrado no cache, buscando no Bitrix...");
      const bitrixLead = await getLead(bitrixId);
      
      console.log("✅ Lead encontrado no Bitrix:", bitrixLead);

      // 3. Mapear Bitrix → Profile
      const newProfile = mapBitrixToProfile(bitrixLead, fieldMappings);
      setProfile(newProfile);

      // 4. Salvar no cache para próximas buscas
      const contactData = {
        bitrix_id: bitrixId,
        name: bitrixLead.NAME || bitrixLead.TITLE || '',
        phone_number: '',
        email: '',
        thumbnail: bitrixLead.UF_PHOTO || bitrixLead.PHOTO || '',
        custom_attributes: {
          idbitrix: bitrixId,
          idade: bitrixLead.UF_IDADE || bitrixLead.AGE || '',
          local: bitrixLead.UF_LOCAL || bitrixLead.ADDRESS || '',
          responsavel: bitrixLead.UF_RESPONSAVEL || bitrixLead.ASSIGNED_BY_NAME || '',
          scouter: bitrixLead.UF_SCOUTER || '',
          foto: bitrixLead.UF_PHOTO || bitrixLead.PHOTO || '',
        },
        additional_attributes: {},
        conversation_id: null,
        contact_id: null,
      };

      setChatwootData(contactData);
      await saveChatwootContact(contactData);

      // 5. Salvar também na tabela leads (para Power BI)
      await supabase
        .from('leads')
        .upsert([{
          id: Number(bitrixId),
          name: contactData.name,
          age: bitrixLead.UF_IDADE ? Number(bitrixLead.UF_IDADE) : null,
          address: bitrixLead.UF_LOCAL || bitrixLead.ADDRESS || '',
          responsible: bitrixLead.UF_RESPONSAVEL || bitrixLead.ASSIGNED_BY_NAME || '',
          scouter: bitrixLead.UF_SCOUTER || '',
          photo_url: bitrixLead.UF_PHOTO || bitrixLead.PHOTO || '',
          date_modify: bitrixLead.DATE_MODIFY ? new Date(bitrixLead.DATE_MODIFY).toISOString() : null,
          raw: bitrixLead as any,
          sync_source: 'bitrix',
        }], { onConflict: 'id' });

      toast.success("Lead carregado do Bitrix!");
      setSearchModal(false);
      setSearchId("");

    } catch (error) {
      console.error("❌ Erro ao buscar lead:", error);
      toast.error("Lead não encontrado ou erro ao buscar");
    } finally {
      setSearchLoading(false);
    }
  };


  useEffect(() => {
    checkUserRole();
    loadButtons();
    loadFieldMappings();
  }, []); // Executar apenas uma vez na montagem

  // Sincronizar com Bitrix ao sair da página
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (!chatwootData?.bitrix_id) return;

      console.log("🔄 Sincronizando dados finais com Bitrix antes de sair...");

      // Preparar dados completos do lead para sincronização
      const leadData: any = { id: Number(chatwootData.bitrix_id) };
      
      fieldMappings.forEach(mapping => {
        const value = profile[mapping.profile_field];
        if (value !== undefined && value !== '') {
          leadData[mapping.profile_field] = value;
        }
      });

      // Usar sendBeacon para garantir envio mesmo ao fechar página
      const syncUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-to-bitrix`;
      const payload = JSON.stringify({
        lead: leadData,
        webhook: DEFAULT_WEBHOOK,
        source: 'supabase'
      });

      navigator.sendBeacon(syncUrl, new Blob([payload], { type: 'application/json' }));
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload(); // Também sincronizar ao desmontar componente
    };
  }, [chatwootData, profile, fieldMappings]);

  // Listener do Chatwoot - NÃO depende de fieldMappings para evitar recriar toda hora
  useEffect(() => {
    console.log("🎧 Listener de mensagens do Chatwoot ativado na página LeadTab");
    
    const processChatwootData = async (raw: any) => {
      console.log("🚀 processChatwootData CHAMADO com:", raw);
      
      // Buscar field mappings DIRETAMENTE no momento do processamento
      const { data: currentMappings } = await supabase
        .from("profile_field_mapping")
        .select("*");
      
      console.log("🗺️ Field mappings carregados diretamente:", currentMappings);
      
      try {
        // Compatibilidade: Chatwoot pode enviar como conversation.meta.sender ou data.contact
        const sender = raw?.conversation?.meta?.sender || raw?.data?.contact;
        const attrs = sender?.custom_attributes || {};

        if (!sender) {
          console.log("⚠️ Nenhum sender encontrado nos dados");
          return;
        }

        console.log("✅ Dados do Chatwoot recebidos:", {
          nome: sender.name,
          custom_attributes: attrs,
          foto: sender.thumbnail || attrs.foto,
          sender_completo: sender
        });

        // Criar profile com os dados recebidos
        const newProfile: DynamicProfile = {};
        
        // Usar field mappings configurados para popular o profile
        if (currentMappings && currentMappings.length > 0) {
          currentMappings.forEach((mapping: FieldMapping) => {
            console.log(`\n🔍 Processando mapeamento:`, {
              profile_field: mapping.profile_field,
              chatwoot_field: mapping.chatwoot_field
            });
            
            let value = "";
            
            // Limpar prefixos desnecessários do caminho
            // O sender já É o contact, então removemos "data.contact.", "contact.", etc.
            let cleanPath = mapping.chatwoot_field
              .replace(/^data\.contact\./, '')  // Remove "data.contact."
              .replace(/^contact\./, '')         // Remove "contact."
              .replace(/^data\./, '');           // Remove "data."
            
            console.log(`  🧹 Caminho limpo: ${mapping.chatwoot_field} → ${cleanPath}`);
            
            // Navegar pelo caminho limpo
            const parts = cleanPath.split('.');
            let temp: any = sender;
            
            console.log(`  📍 Navegando por: ${parts.join(' -> ')}`);
            
            for (const part of parts) {
              console.log(`    🔹 Buscando "${part}" em:`, temp);
              temp = temp?.[part];
              console.log(`    ✓ Resultado:`, temp);
              if (temp === undefined || temp === null) break;
            }
            
            value = temp || "";
            
            console.log(`  ✅ Valor final para ${mapping.profile_field}:`, value);
            newProfile[mapping.profile_field] = value;
          });
          
          console.log("📦 Profile construído:", newProfile);
        } else {
          console.error("❌ Nenhum field mapping encontrado!");
        }

        setProfile(newProfile);

        // Salvar dados do contato no Supabase
        if (attrs.idbitrix) {
          const contactData = {
            bitrix_id: String(attrs.idbitrix),
            conversation_id: raw?.conversation?.id || raw?.data?.conversation?.id || 0,
            contact_id: sender.id,
            name: sender.name,
            phone_number: sender.phone_number,
            email: sender.email,
            thumbnail: sender.thumbnail || attrs.foto,
            custom_attributes: attrs,
            additional_attributes: sender.additional_attributes || {},
            last_activity_at: undefined,
          };

          setChatwootData(contactData);
          await saveChatwootContact(contactData);

          // Registrar log do evento recebido com TODOS os dados para debug
          await supabase.from('actions_log').insert([{
            lead_id: Number(attrs.idbitrix),
            action_label: 'Evento Chatwoot Recebido',
            payload: {
              conversation_id: contactData.conversation_id,
              contact_id: contactData.contact_id,
              event_type: 'message_received',
              // Adicionar dados completos para debug
              raw_sender: sender,
              custom_attributes: attrs,
              profile_construido: newProfile,
              field_mappings_count: currentMappings?.length || 0
            } as any,
            status: 'OK',
          }]);

          console.log("✅ Dados salvos no Supabase:", attrs.idbitrix);
          toast.success("Lead atualizado do Chatwoot!");
        }
      } catch (err) {
        console.error("❌ Erro ao processar evento do Chatwoot:", err);
        toast.error("Erro ao processar dados do Chatwoot");
      }
    };
    
    // 1. Verificar se já existem dados pré-carregados pelo listener global
    if ((window as any)._CHATWOOT_DATA_) {
      console.log("✅ [LeadTab] Dados pré-carregados encontrados!");
      console.log("📦 Dados do window._CHATWOOT_DATA_:", (window as any)._CHATWOOT_DATA_);
      processChatwootData((window as any)._CHATWOOT_DATA_);
    } else {
      console.log("⚠️ [LeadTab] Nenhum dado pré-carregado em window._CHATWOOT_DATA_");
    }

    // 2. Escutar evento customizado 'chatwoot-data-ready'
    const handleChatwootReady = (event: Event) => {
      console.log("✅ [LeadTab] Evento chatwoot-data-ready recebido!");
      const customEvent = event as CustomEvent;
      processChatwootData(customEvent.detail);
    };
    
    window.addEventListener('chatwoot-data-ready', handleChatwootReady);

    // 3. Listener de postMessage (fallback)
    const handleChatwootMessage = async (event: MessageEvent) => {
      try {
        let raw = event.data;
        
        // Parse se for string
        if (typeof raw === "string") {
          try {
            raw = JSON.parse(raw);
          } catch {
            return;
          }
        }

        // Verificar se é evento appContext
        if (raw?.event === 'appContext' || raw?.conversation || raw?.data?.contact) {
          console.log("✅ [LeadTab] Dados via postMessage (fallback)");
          await processChatwootData(raw);
        }
      } catch (err) {
        console.error("❌ Erro no listener de postMessage:", err);
      }
    };

    window.addEventListener("message", handleChatwootMessage);
    
    // Avisar ao Chatwoot que está pronto
    console.log("📤 Enviando mensagem 'ready' para o Chatwoot");
    window.parent.postMessage({ ready: true }, "*");

    return () => {
      console.log("🔌 Listeners removidos");
      window.removeEventListener('chatwoot-data-ready', handleChatwootReady);
      window.removeEventListener("message", handleChatwootMessage);
    };
  }, []); // SEM dependência de fieldMappings!

  // Debug: Log quando chatwootData mudar
  useEffect(() => {
    if (chatwootData) {
      console.log("🔍 chatwootData atualizado:", {
        bitrix_id: chatwootData.bitrix_id,
        hasCustomAttributes: !!chatwootData.custom_attributes,
        customAttributesKeys: Object.keys(chatwootData.custom_attributes || {}),
        customAttributesCount: Object.keys(chatwootData.custom_attributes || {}).length,
        customAttributes: chatwootData.custom_attributes
      });
    }
  }, [chatwootData]);

  // Função para obter a URL da foto de perfil baseada no campo marcado
  const getProfilePhotoUrl = () => {
    const photoField = fieldMappings.find(m => m.is_profile_photo);
    if (!photoField) {
      return chatwootData?.thumbnail || "/placeholder.svg";
    }
    
    // Obter o valor do campo marcado como foto
    const photoUrl = profile[photoField.profile_field];
    return photoUrl || chatwootData?.thumbnail || "/placeholder.svg";
  };

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

    const parsed = (data || []).map((entry, index) => {
      // Se category não existe, usar o valor salvo ou inferir baseado no sort
      let category = entry.category;
      if (!category) {
        // Inferir categoria baseada no sort antigo
        if (entry.sort <= 10) category = 'AGENDAMENTO';
        else if (entry.sort <= 20) category = 'NAO_AGENDADO';
        else if (entry.sort <= 30) category = 'QUALIFICACAO';
        else category = 'OUTRAS';
      }
      
      return {
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
        pos: entry.pos,
        sub_buttons: parseSubButtons(entry.sub_buttons),
        category: category,
      };
    });

    const normalized = normalizeButtonList(parsed);
    console.log('🔵 Botões carregados:', normalized.map(b => ({ 
      label: b.label, 
      category: b.category,
      sort: b.sort 
    })));
    setButtons(normalized);
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
      // Salvar estado anterior para log
      const profileBefore = { ...profile };
      
      // Construir dados atualizados baseado nos field mappings
      const updatedChatwootData: any = { ...chatwootData };
      const updatedAttributes = { ...chatwootData.custom_attributes };
      
      fieldMappings.forEach(mapping => {
        const value = profile[mapping.profile_field];
        if (value !== undefined && value !== '') {
          const field = mapping.chatwoot_field;
          
          // Atualizar custom_attributes.*
          if (field.startsWith('contact.custom_attributes.') || field.startsWith('data.contact.custom_attributes.')) {
            const attrKey = field.replace('contact.custom_attributes.', '').replace('data.contact.custom_attributes.', '');
            updatedAttributes[attrKey] = value;
          }
          // Atualizar campos diretos do contato (nome, telefone, email, etc.)
          else if (field.startsWith('contact.') || field.startsWith('data.contact.')) {
            const contactKey = field.replace('contact.', '').replace('data.contact.', '');
            if (contactKey !== 'custom_attributes' && contactKey !== 'additional_attributes') {
              updatedChatwootData[contactKey] = value;
            }
          }
          // Atualizar additional_attributes.*
          else if (field.startsWith('additional_attributes.')) {
            const attrKey = field.replace('additional_attributes.', '');
            if (!updatedChatwootData.additional_attributes) {
              updatedChatwootData.additional_attributes = {};
            }
            updatedChatwootData.additional_attributes[attrKey] = value;
          }
        }
      });

      // Aplicar custom_attributes atualizados (preservar campos não mapeados)
      updatedChatwootData.custom_attributes = { ...chatwootData.custom_attributes, ...updatedAttributes };

      // 1. Atualizar no Supabase - tabela chatwoot_contacts
      await saveChatwootContact(updatedChatwootData);

      // 2. Atualizar tabela leads (para análise Power BI)
      const bitrixId = Number(chatwootData.bitrix_id);
      const leadData: any = { id: bitrixId };
      
      // Mapear campos do profile para a estrutura da tabela leads
      fieldMappings.forEach(mapping => {
        const value = profile[mapping.profile_field];
        if (value !== undefined && value !== '') {
          // Usar o profile_field como nome do campo no leads (ex: name, age, address)
          leadData[mapping.profile_field] = value;
        }
      });

      // Upsert na tabela leads
      const { error: leadsError } = await supabase
        .from('leads')
        .upsert(leadData, { onConflict: 'id' });

      if (leadsError) {
        console.error('❌ Erro ao atualizar tabela leads:', leadsError);
        toast.warning("Dados salvos no Chatwoot, mas erro ao atualizar backup");
      }

      // Atualizar estado local com dados completos
      setChatwootData(updatedChatwootData);
      
      // Manter o profile atual (não reconstruir para evitar perda de dados)
      // Apenas atualizar os campos que foram editados
      setProfile({ ...profile });

      // Registrar log da ação com detalhes completos
      await supabase.from('actions_log').insert([{
        lead_id: bitrixId,
        action_label: 'Atualização de perfil',
        payload: { 
          profile_before: profileBefore,
          profile_after: profile,
          updated_chatwoot_data: updatedChatwootData,
          leads_data: leadData
        } as any,
        status: 'OK',
      }]);

      console.log("✅ Perfil salvo:", { chatwoot_contacts: true, leads: !leadsError });
      toast.success("Perfil salvo com sucesso!");
      setEditMode(false);
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      
      // Registrar log de erro
      await supabase.from('actions_log').insert([{
        lead_id: Number(chatwootData.bitrix_id),
        action_label: 'Atualização de perfil',
        payload: { error: String(error) } as any,
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
      const syncTarget = button.sync_target || 'bitrix';
      const bitrixId = Number(chatwootData.bitrix_id);

      // Determinar fluxo de sincronização baseado em sync_target
      if (syncTarget === 'supabase') {
        // NOVO FLUXO: Supabase → Bitrix
        // Atualizar Supabase primeiro
        const updatedAttributes = {
          ...chatwootData.custom_attributes,
          [field]: value,
        };

        await saveChatwootContact({
          ...chatwootData,
          custom_attributes: updatedAttributes,
        });

        // Atualizar tabela leads também
        await supabase
          .from('leads')
          .upsert({ id: bitrixId, [field]: value }, { onConflict: 'id' });

        // Chamar edge function para sincronizar com Bitrix
        if (webhookUrl) {
          const { error: syncError } = await supabase.functions.invoke('sync-to-bitrix', {
            body: {
              lead: {
                id: bitrixId,
                [field]: value,
              },
              webhook: webhookUrl,
              source: 'supabase'
            }
          });

          if (syncError) {
            console.error('Erro ao sincronizar com Bitrix:', syncError);
            toast.warning("Dados salvos localmente, mas houve erro ao sincronizar com Bitrix");
          }
        }
      } else {
        // FLUXO ATUAL: Bitrix como fonte da verdade
        // 1. Atualizar Bitrix via webhook primeiro
        if (webhookUrl) {
          const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: bitrixId,
              fields: { [field]: value }
            })
          });

          if (!response.ok) {
            throw new Error('Erro ao atualizar Bitrix');
          }
        }

        // 2. Atualizar Supabase - chatwoot_contacts
        const updatedAttributes = {
          ...chatwootData.custom_attributes,
          [field]: value,
        };

        await saveChatwootContact({
          ...chatwootData,
          custom_attributes: updatedAttributes,
        });

        // 3. Atualizar tabela leads (para Power BI)
        const leadUpdate = {
          id: Number(bitrixId),
          [field]: value
        };
        
        await supabase
          .from('leads')
          .upsert([leadUpdate as any], { onConflict: 'id' });
      }

      const { error: logError } = await supabase.from('actions_log').insert([{
        lead_id: bitrixId,
        action_label: subButton ? `${button.label} / ${subButton.subLabel}` : button.label,
        payload: { 
          webhook: webhookUrl, 
          field, 
          value, 
          sync_target: syncTarget 
        } as any,
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
        payload: { error: String(error) } as any,
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
            <div className="absolute top-4 right-4 flex gap-2">
              <Button 
                onClick={() => setSearchModal(true)} 
                size="icon"
                variant="outline"
                title="Buscar Lead por ID"
              >
                <Search className="w-4 h-4" />
              </Button>
              {!editMode && (
                <Button 
                  onClick={() => setEditMode(true)} 
                  size="icon"
                  disabled={loadingProfile}
                  title="Editar Perfil"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              )}
            </div>
            
            {/* Foto do perfil */}
            <div className="relative">
              {loadingProfile && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-full">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              )}
              <img
                src={getProfilePhotoUrl()}
                alt={chatwootData?.name || 'Lead'}
                className="rounded-full w-40 h-40 border-4 border-green-500 shadow-lg object-cover"
              />
            </div>

            {!editMode ? (
              <>
                <h2 className="text-2xl font-bold text-center">{chatwootData?.name || 'Lead sem nome'}</h2>
                <div className="w-full space-y-2 text-sm">
                  {fieldMappings
                    .filter(mapping => !mapping.is_profile_photo) // Não exibir o campo da foto na lista
                    .map((mapping) => (
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
                {fieldMappings
                  .filter(mapping => !mapping.is_profile_photo)
                  .map((mapping) => (
                    <div key={mapping.profile_field}>
                      <Label>{mapping.display_name || mapping.profile_field}</Label>
                      <Input
                        value={profile[mapping.profile_field] || ''}
                        onChange={(e) => setProfile({ 
                          ...profile, 
                          [mapping.profile_field]: e.target.value 
                        })}
                        placeholder={`Digite ${mapping.display_name || mapping.profile_field}`}
                      />
                    </div>
                  ))}

                <div className="flex gap-2 mt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setEditMode(false)} 
                    className="flex-1"
                    disabled={savingProfile}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={updateCache} 
                    className="flex-1" 
                    disabled={savingProfile}
                  >
                    {savingProfile ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Salvando...
                      </span>
                    ) : (
                      "💾 Salvar"
                    )}
                  </Button>
                </div>
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
                    (button) => button.category === category.id,
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
                                className="flex items-center justify-center rounded-lg px-3 py-2 text-center text-sm font-semibold text-white shadow-lg transition-transform duration-150 hover:scale-[1.02] focus-visible:scale-[1.02] hover:bg-white/20 hover:text-white min-h-[56px]"
                                style={{ backgroundColor: btn.color }}
                              >
                                <span className="break-words whitespace-normal leading-tight w-full max-w-full">{btn.label}</span>
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
          <div className="grid grid-cols-2 gap-6 h-[600px]">
            {/* Coluna da esquerda: Campos disponíveis do Chatwoot */}
            <div className="border rounded-lg bg-muted/30 flex flex-col">
              <h3 className="font-semibold p-4 pb-3 text-sm border-b">📋 Campos Disponíveis do Chatwoot</h3>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-2 text-sm">
                <div className="space-y-1">
                  <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide">Contato</p>
                  <div className="ml-4 space-y-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('chatwoot-field', 'contact.name');
                      }}
                      className="w-full justify-start h-8 text-xs font-mono hover:bg-primary/10 cursor-move"
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
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('chatwoot-field', 'contact.email');
                      }}
                      className="w-full justify-start h-8 text-xs font-mono hover:bg-primary/10 cursor-move"
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
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('chatwoot-field', 'contact.phone_number');
                      }}
                      className="w-full justify-start h-8 text-xs font-mono hover:bg-primary/10 cursor-move"
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
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('chatwoot-field', 'contact.thumbnail');
                      }}
                      className="w-full justify-start h-8 text-xs font-mono hover:bg-primary/10 cursor-move"
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
                    {chatwootData?.custom_attributes && Object.keys(chatwootData.custom_attributes).length > 0 ? (
                      Object.keys(chatwootData.custom_attributes).map((key) => (
                        <Button
                          key={key}
                          variant="ghost"
                          size="sm"
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('chatwoot-field', `contact.custom_attributes.${key}`);
                          }}
                          className="w-full justify-start h-8 text-xs font-mono hover:bg-primary/10 cursor-move"
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
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        {chatwootData ? 'Nenhum atributo customizado encontrado' : 'Aguardando dados do Chatwoot...'}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-1 mt-4">
                  <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide">Conversa</p>
                  <div className="ml-4 space-y-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('chatwoot-field', 'conversation.id');
                      }}
                      className="w-full justify-start h-8 text-xs font-mono hover:bg-primary/10 cursor-move"
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
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('chatwoot-field', 'conversation.status');
                      }}
                      className="w-full justify-start h-8 text-xs font-mono hover:bg-primary/10 cursor-move"
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
              </ScrollArea>
            </div>

            {/* Coluna da direita: Configuração dos campos */}
            <ScrollArea className="border rounded-lg">
              <div className="space-y-4 p-4">
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
                            saveFieldMapping(mapping.profile_field, mapping.chatwoot_field, e.target.value, mapping.is_profile_photo);
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
                        placeholder="Arraste um campo aqui ou clique nos campos à esquerda"
                        defaultValue={mapping.chatwoot_field || ''}
                        onBlur={(e) => {
                          saveFieldMapping(mapping.profile_field, e.target.value, mapping.display_name, mapping.is_profile_photo);
                        }}
                        onFocus={(e) => {
                          // Marcar este input como ativo
                          document.querySelectorAll('[data-chatwoot-field-input]').forEach(input => {
                            input.removeAttribute('data-active');
                          });
                          e.target.setAttribute('data-active', 'true');
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.add('ring-2', 'ring-primary');
                        }}
                        onDragLeave={(e) => {
                          e.currentTarget.classList.remove('ring-2', 'ring-primary');
                        }}
                        onDrop={async (e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove('ring-2', 'ring-primary');
                          const fieldValue = e.dataTransfer.getData('chatwoot-field');
                          if (fieldValue) {
                            e.currentTarget.value = fieldValue;
                            await saveFieldMapping(mapping.profile_field, fieldValue, mapping.display_name, mapping.is_profile_photo);
                          }
                        }}
                      />
                    </div>

                    <div className="flex items-center space-x-2 pt-2 border-t">
                      <input
                        type="checkbox"
                        id={`photo-${mapping.profile_field}`}
                        className="h-4 w-4 rounded border-gray-300"
                        defaultChecked={mapping.is_profile_photo || false}
                        onChange={(e) => {
                          saveFieldMapping(mapping.profile_field, mapping.chatwoot_field, mapping.display_name, e.target.checked);
                        }}
                      />
                      <Label htmlFor={`photo-${mapping.profile_field}`} className="text-sm cursor-pointer">
                        Este campo contém a foto de perfil
                      </Label>
                    </div>
                  </div>
                </Card>
              ))}
              </div>
            </ScrollArea>
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

      {/* Modal de Busca por ID */}
      <Dialog open={searchModal} onOpenChange={setSearchModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Buscar Lead por ID do Bitrix</DialogTitle>
            <DialogDescription>
              Digite o ID do lead no Bitrix para carregar suas informações
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="bitrix-id">ID do Bitrix</Label>
              <Input
                id="bitrix-id"
                type="text"
                placeholder="Ex: 12345"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !searchLoading) {
                    loadLeadById(searchId);
                  }
                }}
                disabled={searchLoading}
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchModal(false);
                setSearchId("");
              }}
              disabled={searchLoading}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button 
              onClick={() => loadLeadById(searchId)}
              disabled={searchLoading || !searchId.trim()}
              className="w-full sm:w-auto"
            >
              {searchLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Buscando...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Buscar Lead
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeadTab;
