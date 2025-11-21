import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Edit, HelpCircle, Loader2, X, Settings, Plus, Minus, Search, Info, GripVertical, ChevronUp, ChevronDown, BarChart3, RefreshCw } from "lucide-react";
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ScrollArea } from "@/components/ui/scroll-area";
import UserMenu from "@/components/UserMenu";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useHotkeys } from "@/hooks/useHotkeys";
import { saveChatwootContact, extractChatwootData, type ChatwootEventData } from "@/lib/chatwoot";
import { getLead, type BitrixLead, getLeadFields, type BitrixField } from "@/lib/bitrix";
import { getTelemarketingId } from "@/handlers/tabular";
import {
  BUTTON_CATEGORIES,
  categoryOrder,
  ensureButtonLayout,
  type ButtonCategory,
  type ButtonLayout,
} from "@/lib/button-layout";
import { cn } from "@/lib/utils";

// Profile é agora dinâmico, baseado nos field mappings
type DynamicProfile = Record<string, unknown>;

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
  value?: string;
  field_type: string;
  action_type: string;
  hotkey?: string;
  sort: number;
  pos: any;
  sub_buttons: any;
  category?: string | null;
  sync_target?: 'bitrix' | 'supabase';
  additional_fields?: Array<{ field: string; value: string }>;
  transfer_conversation?: boolean;
}

interface FieldMapping {
  id?: string;
  profile_field: string;
  chatwoot_field: string;
  display_name?: string;
  is_profile_photo?: boolean;
  sort_order?: number;
}

const emptyProfile: DynamicProfile = {};

const mapChatwootToProfile = (contact: any, fieldMappings: FieldMapping[]): DynamicProfile => {
  console.log("🔄 mapChatwootToProfile chamado com:", {
    hasContact: !!contact,
    hasCurrentAgent: !!(contact?.currentAgent || contact?.assignee),
    currentAgent: contact?.currentAgent || contact?.assignee,
    fieldMappingsCount: fieldMappings.length
  });

  const profile: DynamicProfile = {};
  
  // Mapear todos os campos configurados
  fieldMappings.forEach(mapping => {
    let value = "";
    const field = mapping.chatwoot_field;
    
    // Limpar prefixos para determinar a fonte de dados
    let cleanPath = field
      .replace(/^data\.contact\./, '')
      .replace(/^contact\./, '')
      .replace(/^data\./, '');
    
    console.log(`🔍 Mapeando ${mapping.profile_field} <- ${field} (limpo: ${cleanPath})`);
    
    // Se o campo for do agente atual, buscar em currentAgent ou assignee
    if (cleanPath.startsWith('currentAgent.') || cleanPath.startsWith('assignee.')) {
      const agentPath = cleanPath.replace(/^currentAgent\./, '').replace(/^assignee\./, '');
      const agentData = contact?.currentAgent || contact?.assignee;
      
      if (agentData) {
        value = getNestedValue(agentData, agentPath);
        console.log(`  👤 Campo de agente: ${agentPath} = ${value}`);
      } else {
        console.log(`  ⚠️ Nenhum dado de agente disponível`);
      }
    } else {
      // Para outros campos, buscar normalmente no objeto contact
      value = getNestedValue(contact, cleanPath);
      console.log(`  📋 Campo normal: ${cleanPath} = ${value}`);
    }
    
    profile[mapping.profile_field] = value || "";
  });

  console.log("✅ Profile mapeado:", profile);
  return profile;
};

const mapBitrixToProfile = (bitrixLead: BitrixLead, fieldMappings: FieldMapping[]): DynamicProfile => {
  const profile: DynamicProfile = {};
  
  // Para cada field mapping, buscar o valor correspondente no Bitrix
  fieldMappings.forEach(mapping => {
    const profileField = mapping.profile_field;
    const chatwootField = mapping.chatwoot_field;
    
    // Remover prefixos "contact." ou "data.contact." para obter o caminho real
    const cleanPath = chatwootField
      .replace('data.contact.', '')
      .replace('contact.', '');
    
    // Se for custom_attributes, buscar dentro de custom_attributes do lead
    if (cleanPath.startsWith('custom_attributes.')) {
      const attrKey = cleanPath.replace('custom_attributes.', '');
      // Tentar diferentes variações de nomes de campos do Bitrix
      profile[profileField] = bitrixLead[`UF_CRM_${attrKey.toUpperCase()}`] || 
                              bitrixLead[`UF_${attrKey.toUpperCase()}`] ||
                              bitrixLead[attrKey.toUpperCase()] ||
                              (bitrixLead as any)[attrKey] || '';
    } else if (cleanPath === 'name') {
      profile[profileField] = bitrixLead.NAME || bitrixLead.TITLE || '';
    } else if (cleanPath === 'phone_number') {
      // Extrair telefone do array PHONE se existir
      const phones = bitrixLead.PHONE;
      if (Array.isArray(phones) && phones.length > 0) {
        profile[profileField] = phones[0].VALUE || '';
      } else {
        profile[profileField] = '';
      }
    } else {
      // Para outros campos, tentar buscar diretamente
      profile[profileField] = getNestedValue(bitrixLead, cleanPath);
    }
  });

  return profile;
};

const mapSupabaseLeadToProfile = (lead: any): DynamicProfile => {
  return {
    'ID Bitrix': lead.id?.toString() || '—',
    'Responsável': lead.responsible || '—',
    'Nome': lead.name || '—',
    'Idade': lead.age?.toString() || '—',
    'Scouter': lead.scouter || '—',
    'Telefone': lead.celular || lead.telefone_trabalho || lead.telefone_casa || '—',
    'Endereço': lead.address || '—',
    'Data da última tabulação': lead.date_modify 
      ? new Date(lead.date_modify).toLocaleString('pt-BR') 
      : '—',
    'Última tabulação': lead.etapa || '—',
    'Agente': lead.telemarketing || lead.responsible || '—',
  };
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
  const location = useLocation();

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
  const [timeOptions, setTimeOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [chatwootData, setChatwootData] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingButtons, setLoadingButtons] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [showFieldMappingModal, setShowFieldMappingModal] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const [buttonColumns, setButtonColumns] = useState(3); // 3, 4 ou 5 colunas
  const [bitrixFields, setBitrixFields] = useState<BitrixField[]>([]);
  const [bitrixResponseModal, setBitrixResponseModal] = useState(false);
  const [bitrixResponseMessage, setBitrixResponseMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string>('');
  

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setCurrentUserId(user.id);

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
        .select("*")
        .order('sort_order', { ascending: true });

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
    const maxSortOrder = Math.max(...fieldMappings.map(m => m.sort_order || 0), 0);
    
    const { error } = await supabase
      .from("profile_field_mapping")
      .insert({
        profile_field: newFieldKey,
        chatwoot_field: '',
        display_name: 'Novo Campo',
        sort_order: maxSortOrder + 1
      });
    
    if (!error) {
      toast.success("Novo campo adicionado!");
      loadFieldMappings();
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;
    
    const oldIndex = fieldMappings.findIndex(m => m.id === active.id);
    const newIndex = fieldMappings.findIndex(m => m.id === over.id);
    
    const reordered = arrayMove(fieldMappings, oldIndex, newIndex);
    
    // Atualizar sort_order no banco
    for (let i = 0; i < reordered.length; i++) {
      await supabase
        .from('profile_field_mapping')
        .update({ sort_order: i })
        .eq('id', reordered[i].id);
    }
    
    toast.success("Ordem atualizada!");
    loadFieldMappings();
  };

  const moveFieldUp = async (index: number) => {
    if (index === 0) return;
    
    const reordered = [...fieldMappings];
    [reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]];
    
    // Atualizar sort_order no banco
    for (let i = 0; i < reordered.length; i++) {
      await supabase
        .from('profile_field_mapping')
        .update({ sort_order: i })
        .eq('id', reordered[i].id);
    }
    
    loadFieldMappings();
  };

  const moveFieldDown = async (index: number) => {
    if (index === fieldMappings.length - 1) return;
    
    const reordered = [...fieldMappings];
    [reordered[index], reordered[index + 1]] = [reordered[index + 1], reordered[index]];
    
    // Atualizar sort_order no banco
    for (let i = 0; i < reordered.length; i++) {
      await supabase
        .from('profile_field_mapping')
        .update({ sort_order: i })
        .eq('id', reordered[i].id);
    }
    
    loadFieldMappings();
  };

  const loadLeadById = async (bitrixId: string, silent = false, forceBitrix = false) => {
    if (!bitrixId || !bitrixId.trim()) {
      if (!silent) toast.error("Digite um ID válido");
      return;
    }

    setSearchLoading(true);
    try {
      // 1️⃣ BUSCAR NA TABELA LEADS DO SUPABASE (mais rápido)
      if (!forceBitrix) {
        console.log("🔍 Buscando lead no Supabase...", bitrixId);
        const { data: supabaseLead, error: supabaseError } = await supabase
          .from('leads')
          .select('*')
          .eq('id', Number(bitrixId))
          .maybeSingle();

        if (supabaseError) {
          console.error("Erro ao buscar no Supabase:", supabaseError);
        }

        if (supabaseLead) {
          console.log("✅ Lead encontrado no Supabase:", supabaseLead);
          
          // Mapear lead do Supabase → Profile
          const newProfile = mapSupabaseLeadToProfile(supabaseLead);
          setProfile(newProfile);
          
          // Salvar também no chatwoot_contacts para compatibilidade
          const contactData = {
            bitrix_id: bitrixId,
            name: supabaseLead.name || '',
            phone_number: supabaseLead.celular || supabaseLead.telefone_trabalho || supabaseLead.telefone_casa || '',
            custom_attributes: { idbitrix: bitrixId },
            additional_attributes: {},
            conversation_id: null,
            contact_id: null,
          };
          setChatwootData(contactData);
          
          toast.success("Lead carregado (Supabase)");
          setSearchModal(false);
          setSearchId("");
          setSearchLoading(false);
          return;
        }
      }

      // 2️⃣ SE NÃO ENCONTRAR OU forceBitrix=true, BUSCAR NO BITRIX
      console.log(forceBitrix ? "🔄 Forçando busca no Bitrix..." : "⚠️ Lead não encontrado no Supabase, buscando no Bitrix...");
      const bitrixLead = await getLead(bitrixId);
      
      console.log("✅ Lead encontrado no Bitrix:", bitrixLead);

      // 3. Mapear Bitrix → Profile
      const newProfile = mapBitrixToProfile(bitrixLead, fieldMappings);
      setProfile(newProfile);

      // 4. Salvar no cache para próximas buscas
      // Construir custom_attributes dinamicamente baseado nos field mappings
      const customAttributes: Record<string, unknown> = {
        idbitrix: bitrixId
      };
      
      fieldMappings.forEach(mapping => {
        const chatwootField = mapping.chatwoot_field;
        const cleanPath = chatwootField
          .replace('data.contact.', '')
          .replace('contact.', '');
        
        if (cleanPath.startsWith('custom_attributes.')) {
          const attrKey = cleanPath.replace('custom_attributes.', '');
          // Buscar valor no Bitrix usando diferentes variações
          const value = bitrixLead[`UF_CRM_${attrKey.toUpperCase()}`] || 
                       bitrixLead[`UF_${attrKey.toUpperCase()}`] ||
                       bitrixLead[attrKey.toUpperCase()] ||
                       (bitrixLead as any)[attrKey] || '';
          customAttributes[attrKey] = value;
        }
      });

      // Extrair telefone
      let phoneNumber = '';
      const phones = bitrixLead.PHONE;
      if (Array.isArray(phones) && phones.length > 0) {
        phoneNumber = phones[0].VALUE || '';
      }

      const contactData = {
        bitrix_id: bitrixId,
        name: bitrixLead.NAME || bitrixLead.TITLE || '',
        phone_number: phoneNumber,
        email: '',
        thumbnail: '',
        custom_attributes: customAttributes,
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
          celular: phoneNumber,
          etapa: bitrixLead.STATUS_ID || '',
          telemarketing: bitrixLead.UF_RESPONSAVEL || bitrixLead.ASSIGNED_BY_NAME || '',
        }], { onConflict: 'id' });

      toast.success(forceBitrix ? "Lead atualizado do Bitrix!" : "Lead carregado do Bitrix!");
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
    const initialize = async () => {
      checkUserRole();
      loadButtons();
      loadFieldMappings();
      
      // Carregar metadados dos campos Bitrix para conversão automática
      try {
        console.log('🔄 Carregando metadados dos campos Bitrix...');
        const fields = await getLeadFields();
        setBitrixFields(fields);
        console.log('✅ Metadados carregados:', fields.length, 'campos');
      } catch (error) {
        console.error('❌ Erro ao carregar campos Bitrix:', error);
      }
      
      // FASE 2: Carregar lead via query param ?id= ou ?lead=
      const searchParams = new URLSearchParams(location.search);
      const leadId = searchParams.get('id') || searchParams.get('lead');
      if (leadId) {
        console.log('🔍 Carregando lead do query param:', leadId);
        await loadLeadById(leadId, true); // silent = true para não mostrar toast de erro
      }
    };
    
    initialize();
  }, [location.search]); // Reexecutar quando query param mudar

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
        
        // Extrair dados do agente - PRIORIDADE: data.currentAgent, FALLBACK: conversation.meta.assignee
        const currentAgent = raw?.data?.currentAgent;
        const assigneeFromMeta = raw?.conversation?.meta?.assignee;
        const agentData = currentAgent || assigneeFromMeta;
        
        console.log("👤 Dados do agente disponíveis:", {
          hasCurrentAgent: !!currentAgent,
          hasAssigneeFromMeta: !!assigneeFromMeta,
          usingSource: currentAgent ? 'data.currentAgent' : (assigneeFromMeta ? 'conversation.meta.assignee' : 'none'),
          agentData
        });
        
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
            
            // Determinar de onde buscar os dados baseado no campo
            let sourceData: any = sender;
            
            // Se o campo for do agente atual, usar os dados do agente (currentAgent ou assignee)
            if (cleanPath.startsWith('currentAgent.') || cleanPath.startsWith('assignee.')) {
              if (!agentData) {
                console.log(`  ⚠️ Campo de agente solicitado (${cleanPath}), mas nenhum dado de agente disponível`);
                value = "";
              } else {
                sourceData = agentData;
                cleanPath = cleanPath.replace(/^currentAgent\./, '').replace(/^assignee\./, '');
                console.log(`  👤 Campo de agente detectado, usando ${currentAgent ? 'data.currentAgent' : 'conversation.meta.assignee'}. Novo caminho: ${cleanPath}`);
              }
            }
            // Se o campo for da conversa, usar os dados da conversation
            else if (cleanPath.startsWith('conversation.')) {
              sourceData = raw?.conversation || raw?.data?.conversation;
              cleanPath = cleanPath.replace(/^conversation\./, ''); // Remove "conversation."
              console.log(`  💬 Campo de conversa detectado, usando conversation. Novo caminho: ${cleanPath}`);
            }
            
            // Só navegar se não foi definido como vazio acima
            if (value === "" && sourceData) {
              // Navegar pelo caminho limpo
              const parts = cleanPath.split('.');
              let temp: any = sourceData;
              
              console.log(`  📍 Navegando por: ${parts.join(' -> ')}`);
              
              for (const part of parts) {
                console.log(`    🔹 Buscando "${part}" em:`, temp);
                temp = temp?.[part];
                console.log(`    ✓ Resultado:`, temp);
                if (temp === undefined || temp === null) break;
              }
              
              value = temp || "";
            }
            
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
          // Extrair dados do agente - PRIORIDADE: data.currentAgent, FALLBACK: conversation.meta.assignee
          const currentAgent = raw?.data?.currentAgent;
          const assigneeFromMeta = raw?.conversation?.meta?.assignee;
          const agentData = currentAgent || assigneeFromMeta;
          
          console.log("💾 Preparando dados do contato para salvar:", {
            bitrix_id: attrs.idbitrix,
            hasCurrentAgent: !!currentAgent,
            hasAssigneeFromMeta: !!assigneeFromMeta,
            usingSource: currentAgent ? 'data.currentAgent' : (assigneeFromMeta ? 'conversation.meta.assignee' : 'none'),
            agentData
          });
          
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
            // Adicionar dados do agente atual (usa data.currentAgent como prioridade)
            currentAgent: agentData ? {
              id: agentData.id,
              name: agentData.name,
              email: agentData.email,
              role: agentData.role
            } : undefined,
            // Adicionar também como assignee para retrocompatibilidade
            assignee: agentData ? {
              id: agentData.id,
              name: agentData.name,
              email: agentData.email,
              role: agentData.role
            } : undefined,
          };

          console.log("📦 Dados do contato completos:", {
            bitrix_id: contactData.bitrix_id,
            hasCurrentAgent: !!contactData.currentAgent,
            hasAssignee: !!contactData.assignee,
            currentAgent: contactData.currentAgent,
            assignee: contactData.assignee
          });

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

    console.log('🔵 Botões carregados do Supabase - DEBUG transfer_conversation:', data?.map(b => ({
      label: b.label,
      has_transfer: 'transfer_conversation' in b,
      transfer_value: b.transfer_conversation,
      transfer_type: typeof b.transfer_conversation
    })));
    
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
        description: entry.description || "",
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
        additional_fields: (entry as any).additional_fields || [],
        transfer_conversation: (entry as any).transfer_conversation || false,
        sync_target: (entry as any).sync_target || 'bitrix',
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
      
      console.log("🔄 Atualizando cache com field mappings:", fieldMappings.length);
      
      fieldMappings.forEach(mapping => {
        const value = profile[mapping.profile_field];
        if (value !== undefined && value !== '') {
          const field = mapping.chatwoot_field;
          
          console.log(`  📝 Processando ${mapping.profile_field} -> ${field} = ${value}`);
          
          // Atualizar custom_attributes.*
          if (field.startsWith('contact.custom_attributes.') || field.startsWith('data.contact.custom_attributes.')) {
            const attrKey = field.replace('contact.custom_attributes.', '').replace('data.contact.custom_attributes.', '');
            updatedAttributes[attrKey] = value;
            console.log(`    ✓ Atualizado custom_attributes.${attrKey}`);
          }
          // Atualizar campos diretos do contato (nome, telefone, email, etc.)
          else if (field.startsWith('contact.') || field.startsWith('data.contact.')) {
            const contactKey = field.replace('contact.', '').replace('data.contact.', '');
            if (contactKey !== 'custom_attributes' && contactKey !== 'additional_attributes') {
              updatedChatwootData[contactKey] = value;
              console.log(`    ✓ Atualizado contact.${contactKey}`);
            }
          }
          // Atualizar additional_attributes.*
          else if (field.startsWith('additional_attributes.')) {
            const attrKey = field.replace('additional_attributes.', '');
            if (!updatedChatwootData.additional_attributes) {
              updatedChatwootData.additional_attributes = {};
            }
            updatedChatwootData.additional_attributes[attrKey] = value;
            console.log(`    ✓ Atualizado additional_attributes.${attrKey}`);
          }
          // Atualizar campos do agente (currentAgent ou assignee)
          // Nota: Campos do agente geralmente são read-only do ponto de vista do Chatwoot,
          // mas permitimos armazenar localmente para consulta
          else if (field.startsWith('currentAgent.') || field.startsWith('assignee.')) {
            const agentKey = field.replace('currentAgent.', '').replace('assignee.', '');
            if (!updatedChatwootData.currentAgent) {
              updatedChatwootData.currentAgent = {};
            }
            if (!updatedChatwootData.assignee) {
              updatedChatwootData.assignee = {};
            }
            updatedChatwootData.currentAgent[agentKey] = value;
            updatedChatwootData.assignee[agentKey] = value;
            console.log(`    ℹ️ Atualizado currentAgent/assignee.${agentKey} (somente local)`);
          }
        }
      });

      // Aplicar custom_attributes atualizados (preservar campos não mapeados)
      updatedChatwootData.custom_attributes = { ...chatwootData.custom_attributes, ...updatedAttributes };
      
      // Preservar dados do agente se não foram alterados
      if (!updatedChatwootData.currentAgent && chatwootData.currentAgent) {
        updatedChatwootData.currentAgent = chatwootData.currentAgent;
      }
      if (!updatedChatwootData.assignee && chatwootData.assignee) {
        updatedChatwootData.assignee = chatwootData.assignee;
      }

      console.log("💾 Salvando dados atualizados:", {
        hasCurrentAgent: !!updatedChatwootData.currentAgent,
        hasAssignee: !!updatedChatwootData.assignee,
        customAttributesCount: Object.keys(updatedChatwootData.custom_attributes || {}).length
      });

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

  const executeAction = async (button: ButtonConfig, subButton?: SubButton, scheduledDate?: string, scheduledTime?: string) => {
    if (!chatwootData) {
      toast.error("Nenhum dado do Chatwoot disponível");
      return;
    }

    // Guardar o valor selecionado para exibir nas mensagens (disponível em todo o escopo da função)
    const selectedValueDisplay = subButton?.subValue || button.value || scheduledDate || "";

    try {
      const webhookUrl = subButton?.subWebhook || button.webhook_url;
      const field = subButton?.subField || button.field;
      const value = scheduledDate || subButton?.subValue || button.value || "";
      const syncTarget = button.sync_target || 'bitrix';
      const bitrixId = Number(chatwootData.bitrix_id);
      
      // Buscar ID do telemarketing do usuário atual para substituição de placeholders
      const telemarketingId = await getTelemarketingId({ userId: currentUserId });
      console.log(`📋 Telemarketing ID do usuário atual: ${telemarketingId}`);
      
      // Função para processar placeholders dinâmicos
      // Inclui substituição do placeholder {{telemarketing}} pelo ID numérico
      const replacePlaceholders = (inputValue: string): string => {
        if (typeof inputValue !== 'string') return inputValue;
        
        return inputValue
          .replace(/\{\{valor_botao\}\}/g, value)
          .replace(/\{\{data\}\}/g, scheduledDate || new Date().toISOString().split('T')[0])
          .replace(/\{\{horario\}\}/g, scheduledTime || '')
          .replace(/\{\{nome_lead\}\}/g, String(chatwootData.name || ''))
          .replace(/\{\{id_lead\}\}/g, String(bitrixId))
          .replace(/\{\{telefone\}\}/g, String((profile as any).phone_number || chatwootData.phone_number || ''))
          .replace(/\{\{email\}\}/g, String((profile as any).email || chatwootData.email || ''))
          .replace(/\{\{responsavel\}\}/g, String((profile as any).responsible || ''))
          .replace(/\{\{endereco\}\}/g, String((profile as any).address || ''))
          .replace(/\{\{idade\}\}/g, (profile as any).age ? String((profile as any).age) : '')
          .replace(/\{\{scouter\}\}/g, String((profile as any).scouter || ''))
          // Substituir {{telemarketing}} pelo ID numérico do telemarketing
          .replace(/\{\{telemarketing\}\}/g, String(telemarketingId));
      };
      
      // Preparar campos adicionais com processamento de placeholders
      const additionalFields: Record<string, unknown> = {};
      if (button.additional_fields && Array.isArray(button.additional_fields)) {
        button.additional_fields.forEach(({ field: addField, value: addValue }) => {
          // Processar placeholders no valor - pular campos vazios
          const processedValue = replacePlaceholders(addValue);
          if (processedValue !== '' && addField) {
            additionalFields[addField] = processedValue;
            // Log detalhado do campo processado
            console.log(`📝 Campo adicional processado: ${addField} = ${processedValue}${addValue.includes('{{telemarketing}}') ? ' (substituído de {{telemarketing}})' : ''}`);
          }
        });
      }

      // Processar subAdditionalFields se houver sub-button
      if (subButton?.subAdditionalFields && Array.isArray(subButton.subAdditionalFields)) {
        subButton.subAdditionalFields.forEach(({ field: addField, value: addValue }) => {
          const processedValue = replacePlaceholders(addValue);
          if (processedValue !== '' && addField) {
            additionalFields[addField] = processedValue;
            // Log detalhado do campo processado
            console.log(`📝 Campo adicional (sub) processado: ${addField} = ${processedValue}${addValue.includes('{{telemarketing}}') ? ' (substituído de {{telemarketing}})' : ''}`);
          }
        });
      }

      console.log('📋 Campos adicionais processados:', {
        button_additional_fields: button.additional_fields,
        sub_additional_fields: subButton?.subAdditionalFields,
        resultado_final: additionalFields
      });

      console.log('🔀 Fluxo escolhido:', syncTarget === 'supabase' ? 'Edge Function' : 'Webhook Direto');

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
          const { data: syncData, error: syncError } = await supabase.functions.invoke('sync-to-bitrix', {
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
            const errorMessage = `Valor selecionado: ${selectedValueDisplay}\n\nErro ao sincronizar com Bitrix: ${syncError.message || String(syncError)}`;
            setBitrixResponseMessage(errorMessage);
            setBitrixResponseModal(true);
            toast.warning("Dados salvos localmente, mas houve erro ao sincronizar com Bitrix");
          } else {
            // Exibir resposta de sucesso
            const successMessage = syncData 
              ? `Valor selecionado: ${selectedValueDisplay}\n\nSucesso! Dados sincronizados via Supabase → Bitrix. Lead ${bitrixId}.`
              : `Valor selecionado: ${selectedValueDisplay}\n\nDados sincronizados com sucesso!`;
            setBitrixResponseMessage(successMessage);
            setBitrixResponseModal(true);
          }
        } else {
          // Sem webhook, apenas salvo localmente
          setBitrixResponseMessage(`Valor selecionado: ${selectedValueDisplay}\n\nDados salvos localmente no Supabase. Lead ${bitrixId}.`);
          setBitrixResponseModal(true);
        }
      } else {
        // FLUXO ATUAL: Bitrix como fonte da verdade
        // 1. Atualizar Bitrix via webhook primeiro
        if (webhookUrl) {
          // Helper AUTOMÁTICO para converter labels de campos enumeration para IDs
          const convertEnumerationValue = (fieldName: string, value: string): string => {
            // Se não temos metadados ainda, retornar valor original
            if (bitrixFields.length === 0) {
              console.warn('⚠️ Metadados Bitrix ainda não carregados');
              return value;
            }
            
            // Encontrar a definição do campo
            const fieldDef = bitrixFields.find(f => 
              f.ID === fieldName || 
              f.FIELD_NAME === fieldName || 
              f.name === fieldName
            );
            
            // Se não for campo enumeration, retornar valor original
            if (!fieldDef || fieldDef.type !== 'enumeration' || !fieldDef.items) {
              return value;
            }
            
            // Procurar o item que corresponde ao valor (label)
            const item = fieldDef.items.find((i: any) => 
              i.VALUE === value || 
              i.ID === value
            );
            
            if (item) {
              console.log(`🔄 Convertendo "${value}" → ID "${item.ID}" (campo: ${fieldName})`);
              return item.ID;
            }
            
            // Se não encontrou, pode ser que já seja o ID
            console.warn(`⚠️ Valor "${value}" não encontrado nos items do campo ${fieldName}`);
            return value;
          };

          // Converter valores de campos adicionais (enumeration labels -> IDs)
          const processedAdditionalFields = Object.fromEntries(
            Object.entries(additionalFields).map(([key, val]) => [
              key,
              typeof val === 'string' ? convertEnumerationValue(key, val) : val
            ])
          );

          // Combinar campo principal com campos adicionais processados
          const mainValue = typeof value === 'string' ? convertEnumerationValue(field, value) : value;
          const allFields = {
            [field]: mainValue,
            ...processedAdditionalFields
          };
          
          // Log detalhado de todos os campos a serem enviados ao Bitrix
          console.log('🔍 DEBUG - Antes de enviar ao Bitrix:', {
            bitrixId,
            webhookUrl,
            campo_principal: field,
            valor_principal: value,
            campos_adicionais: additionalFields,
            campos_combinados: allFields
          });
          console.log('📊 Detalhes dos campos a enviar:');
          Object.entries(allFields).forEach(([key, val]) => {
            console.log(`  - ${key}: ${val} (tipo: ${typeof val})`);
          });
          
          // Construir URL com query parameters no formato Bitrix
          const params = new URLSearchParams();
          params.append('ID', String(bitrixId));
          
          // Adicionar todos os campos no formato correto para Bitrix
          Object.entries(allFields).forEach(([key, val]) => {
            if (Array.isArray(val)) {
              // Para arrays, adicionar cada item com índice: FIELDS[CAMPO][]=VALOR
              val.forEach((item) => {
                params.append(`FIELDS[${key}][]`, String(item));
              });
            } else if (typeof val === 'object' && val !== null) {
              // Para objetos, adicionar cada propriedade: FIELDS[CAMPO][PROP]=VALOR
              Object.entries(val).forEach(([subKey, subVal]) => {
                params.append(`FIELDS[${key}][${subKey}]`, String(subVal));
              });
            } else {
              // Para valores simples: FIELDS[CAMPO]=VALOR
              params.append(`FIELDS[${key}]`, String(val));
            }
          });
          
          const fullUrl = `${webhookUrl}?${params.toString()}`;
          console.log('🔗 URL completa do Bitrix:', fullUrl);
          console.log('📤 Parâmetros:', params.toString());
          
          // Fazer requisição GET (formato esperado pelo Bitrix)
          const response = await fetch(fullUrl, {
            method: 'GET'
          });

          console.log('📥 Resposta do Bitrix - Status:', response.status);
          
          const responseData = await response.json();
          console.log('📥 Resposta COMPLETA do Bitrix:', responseData);
          
          // Verificar se há mensagens de erro mesmo com result: true
          if (responseData.error) {
            console.error('❌ Erro do Bitrix:', responseData.error_description || responseData.error);
            const errorMessage = `Valor selecionado: ${selectedValueDisplay}\n\nErro do Bitrix: ${responseData.error_description || responseData.error}`;
            setBitrixResponseMessage(errorMessage);
            setBitrixResponseModal(true);
            throw new Error(errorMessage);
          }

          if (!response.ok) {
            console.error('❌ Erro na resposta do Bitrix (HTTP):', responseData);
            const errorMessage = `Valor selecionado: ${selectedValueDisplay}\n\nErro ao atualizar Bitrix: ${JSON.stringify(responseData)}`;
            setBitrixResponseMessage(errorMessage);
            setBitrixResponseModal(true);
            throw new Error(errorMessage);
          }
          
          console.log('✅ Bitrix atualizado com sucesso!');
          
          // Salvar resposta do Bitrix para exibir ao usuário
          const successMessage = responseData.result 
            ? `Valor selecionado: ${selectedValueDisplay}\n\nSucesso! Lead ${bitrixId} atualizado no Bitrix.${responseData.result.ID ? ` ID: ${responseData.result.ID}` : ''}`
            : `Valor selecionado: ${selectedValueDisplay}\n\nLead atualizado com sucesso no Bitrix!`;
          setBitrixResponseMessage(successMessage);
          setBitrixResponseModal(true);
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

        // 3. Atualizar tabela leads - APENAS campos que existem na tabela
        // Não tentar salvar campos customizados do Bitrix (UF_CRM_*) aqui
        const leadUpdateFields: any = {
          id: Number(bitrixId),
        };
        
        // Adicionar apenas campos que existem na tabela leads
        const validLeadFields = ['name', 'age', 'address', 'photo_url', 'responsible', 'scouter'];
        if (validLeadFields.includes(field)) {
          leadUpdateFields[field] = value;
        }
        
        console.log('💾 Atualizando tabela leads com:', leadUpdateFields);
        
        await supabase
          .from('leads')
          .upsert([leadUpdateFields], { onConflict: 'id' });
      }

      // 4. Transferir conversa para o agente que tabulou (se configurado)
      console.log('🔍 DEBUG transfer_conversation - VALORES INDIVIDUAIS:');
      console.log('  button.transfer_conversation =', button.transfer_conversation);
      console.log('  typeof button.transfer_conversation =', typeof button.transfer_conversation);
      console.log('  button.transfer_conversation === true?', button.transfer_conversation === true);
      console.log('  button.transfer_conversation == true?', button.transfer_conversation == true);
      console.log('  !!button.transfer_conversation?', !!button.transfer_conversation);
      console.log('  subButton?.transfer_conversation =', subButton?.transfer_conversation);
      console.log('  chatwootData?.conversation_id =', chatwootData?.conversation_id);
      console.log('  Condição OR completa:', (button.transfer_conversation || subButton?.transfer_conversation));
      
      const shouldTransfer = Boolean(button.transfer_conversation) || Boolean(subButton?.transfer_conversation);
      console.log('🔄 shouldTransfer (após Boolean()) =', shouldTransfer);
      
      if (shouldTransfer) {
        console.log('🔄 Iniciando transferência de conversa...');
        
        let conversationId = chatwootData?.conversation_id;
        console.log('📍 conversation_id inicial:', conversationId, '(tipo:', typeof conversationId, ')');
        
        // Se não tiver conversation_id, buscar do banco
        if (!conversationId || conversationId === 0) {
          console.log('🔍 Buscando conversation_id do banco de dados...');
          const { data: savedContact, error: fetchError } = await supabase
            .from('chatwoot_contacts')
            .select('conversation_id')
            .eq('bitrix_id', String(bitrixId))
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (fetchError) {
            console.error('❌ Erro ao buscar conversation_id:', fetchError);
          } else if (savedContact?.conversation_id) {
            conversationId = savedContact.conversation_id;
            console.log('✅ conversation_id recuperado do banco:', conversationId);
          }
        }
        
        if (!conversationId || conversationId === 0) {
          console.warn('⚠️ Nenhuma conversa ativa encontrada para este lead');
          toast.warning('Nenhuma conversa ativa encontrada. A transferência requer uma conversa aberta no Chatwoot.');
        } else {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
              throw new Error('Usuário não autenticado');
            }

            console.log('📞 Transferindo conversa:', {
              conversation_id: conversationId,
              operator_user_id: user.id,
              lead_id: bitrixId
            });

            const { data: transferData, error: transferError } = await supabase.functions.invoke('chatwoot-transfer', {
              body: {
                conversation_id: conversationId,
                operator_user_id: user.id,
                lead_id: bitrixId
              }
            });

            if (transferError) {
              console.error('❌ Erro ao transferir conversa:', transferError);
              toast.error('Erro ao transferir conversa: ' + transferError.message);
            } else {
              console.log('✅ Conversa transferida com sucesso:', transferData);
              toast.success(`Conversa transferida para você!`);
            }
          } catch (error) {
            console.error('❌ Erro ao transferir conversa:', error);
            toast.error('Erro ao transferir conversa');
          }
        }
      }

      const { error: logError } = await supabase.from('actions_log').insert([{
        lead_id: bitrixId,
        action_label: subButton ? `${button.label} / ${subButton.subLabel}` : button.label,
        payload: { 
          webhook: webhookUrl, 
          field, 
          value,
          additional_fields: additionalFields,
          all_fields: { [field]: value, ...additionalFields },
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
      
      // Exibir mensagem de erro no modal
      const errorMsg = error instanceof Error ? error.message : String(error);
      // Se a mensagem já contém "Valor selecionado:", não adicionar novamente
      const finalErrorMsg = errorMsg.includes('Valor selecionado:') 
        ? errorMsg 
        : `Valor selecionado: ${selectedValueDisplay}\n\nErro: ${errorMsg}`;
      setBitrixResponseMessage(finalErrorMsg);
      setBitrixResponseModal(true);
      
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

  // Função auxiliar para criar opções de horário padrão
  const createFallbackTimeOptions = () => {
    const fallbackOptions = [];
    for (let h = 8; h <= 18; h++) {
      for (let m of [0, 30]) {
        if (h === 18 && m === 30) break; // Parar em 18:00
        const hour = String(h).padStart(2, '0');
        const min = String(m).padStart(2, '0');
        const time = `${hour}:${min}`;
        fallbackOptions.push({
          id: time,
          name: time
        });
      }
    }
    return fallbackOptions;
  };

  const handleButtonClick = async (button: ButtonConfig) => {
    console.log('🔘 Botão clicado - DEBUG COMPLETO:', {
      label: button.label,
      transfer_conversation: button.transfer_conversation,
      transfer_conversation_type: typeof button.transfer_conversation,
      has_property: 'transfer_conversation' in button,
      button_completo: button
    });
    
    setSelectedButton(button);

    if (button.sub_buttons && button.sub_buttons.length > 0) {
      setSubButtonModal(true);
      return;
    }

    if (button.action_type === 'schedule' || button.field_type === 'datetime') {
      // Carregar opções de hora se houver campo de lista
      const hourField = button.additional_fields?.find(f => f.field === 'UF_CRM_1740755176');
      if (hourField) {
        try {
          console.log('🕐 Buscando opções de horário do Bitrix...');
          const fields = await getLeadFields();
          console.log('📋 Todos os campos:', fields.map(f => ({ 
            ID: f.ID, 
            name: f.name, 
            type: f.type,
            hasItems: !!f.items 
          })));
          
          // Buscar pelo campo usando diferentes variações de nome
          const hourFieldData = fields.find(f => {
            const fieldId = f.ID || f.FIELD_NAME || f.name;
            const matches = fieldId === 'UF_CRM_1740755176';
            
            if (matches) {
              console.log(`🔍 Campo encontrado:`, {
                fieldId,
                type: f.type,
                hasItems: !!f.items,
                itemsCount: f.items ? (Array.isArray(f.items) ? f.items.length : Object.keys(f.items).length) : 0,
                itemsSample: f.items ? JSON.stringify(f.items).slice(0, 200) : null
              });
            }
            
            return matches;
          });
          
          if (hourFieldData?.items) {
            console.log('✅ Items completos:', JSON.stringify(hourFieldData.items, null, 2));
            
            let options = [];
            
            // Suportar formato array
            if (Array.isArray(hourFieldData.items)) {
              options = hourFieldData.items.map((item: any) => ({
                id: item.ID || item.id,
                name: item.VALUE || item.value || item.NAME || item.name
              }));
            } 
            // Suportar formato objeto
            else {
              options = Object.entries(hourFieldData.items).map(([key, item]: [string, any]) => {
                const id = item.ID || key;
                const name = item.VALUE || item.value || item.NAME || item;
                return { id, name };
              });
            }
            
            // Filtrar opções inválidas
            options = options.filter(opt => opt.id && opt.name);
            
            console.log('⏰ Opções processadas:', options);
            
            if (options.length > 0) {
              setTimeOptions(options);
            } else {
              console.warn('⚠️ Nenhuma opção válida após processamento, usando fallback');
              setTimeOptions(createFallbackTimeOptions());
            }
          } else {
            console.warn('⚠️ Campo de hora não tem items, usando fallback');
            setTimeOptions(createFallbackTimeOptions());
          }
        } catch (error) {
          console.error('❌ Erro ao carregar opções de hora, usando fallback:', error);
          setTimeOptions(createFallbackTimeOptions());
        }
      }
      
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
    
    // Atualizar automaticamente os campos correspondentes no profile
    if (selectedButton.field) {
      const updates: Record<string, unknown> = {
        [selectedButton.field]: scheduleDate,
      };
      
      // Se houver campo de horário nos additional_fields, atualizar também
      const horarioField = selectedButton.additional_fields?.find(f => f.field === 'UF_CRM_1740755176');
      if (horarioField) {
        updates[horarioField.field] = scheduleTime;
      }
      
      setProfile((prev) => ({
        ...prev,
        ...updates,
      }));
      toast.success("Data e horário preenchidos automaticamente!");
    }
    
    executeAction(selectedButton, undefined, scheduleDate, scheduleTime);
    setScheduleModal(false);
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
                  variant="outline"
                  disabled={loadingProfile}
                  title="Editar Perfil"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              )}
              {profile['ID Bitrix'] && profile['ID Bitrix'] !== '—' && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const bitrixId = profile['ID Bitrix'];
                    loadLeadById(String(bitrixId), false, true);
                  }}
                  disabled={searchLoading}
                  title="Atualizar do Bitrix"
                >
                  <RefreshCw className={`w-4 h-4 ${searchLoading ? 'animate-spin' : ''}`} />
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
                        {String((profile as any)[mapping.profile_field] || '—')}
                      </p>
                    ))}
                </div>

                <div className="flex flex-col gap-2 w-full mt-4">
                  <div className="flex gap-2 w-full">
                    <Button
                      variant="secondary"
                      onClick={() => navigate('/dashboard')}
                      className="flex-1 gap-2"
                    >
                      <BarChart3 className="w-4 h-4" />
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
                <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext 
                    items={fieldMappings
                      .filter(mapping => !mapping.is_profile_photo)
                      .map(m => m.id || m.profile_field)} 
                    strategy={verticalListSortingStrategy}
                  >
                    {fieldMappings
                      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
                      .filter(mapping => !mapping.is_profile_photo)
                      .map((mapping) => {
                        const SortableFieldInput = () => {
                          const {
                            attributes,
                            listeners,
                            setNodeRef,
                            transform,
                            transition,
                          } = useSortable({ id: mapping.id || mapping.profile_field });

                          const style = {
                            transform: CSS.Transform.toString(transform),
                            transition,
                          };

                          return (
                            <div ref={setNodeRef} style={style} key={mapping.profile_field} className="flex gap-2 items-end">
                              <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing pb-2">
                                <GripVertical className="h-5 w-5 text-muted-foreground" />
                              </div>
                              <div className="flex-1">
                                <Label>{mapping.display_name || mapping.profile_field}</Label>
                                <Input
                                  value={String((profile as any)[mapping.profile_field] || '')}
                                  onChange={(e) => setProfile({ 
                                    ...profile, 
                                    [mapping.profile_field]: e.target.value 
                                  })}
                                  placeholder={`Digite ${mapping.display_name || mapping.profile_field}`}
                                />
                              </div>
                            </div>
                          );
                        };
                        return <SortableFieldInput key={mapping.profile_field} />;
                      })}
                  </SortableContext>
                </DndContext>

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
                            const ButtonContent = (
                              <Button
                                variant="ghost"
                                key={btn.id}
                                data-btn-id={btn.id}
                                onClick={() => handleButtonClick(btn)}
                                className="flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-center text-sm font-semibold text-white shadow-lg transition-transform duration-150 hover:scale-[1.02] focus-visible:scale-[1.02] hover:bg-white/20 hover:text-white min-h-[56px] w-full"
                                style={{ backgroundColor: btn.color }}
                              >
                                {btn.description && <Info className="w-3 h-3 flex-shrink-0" />}
                                <span className="break-words whitespace-normal leading-tight flex-1">{btn.label}</span>
                              </Button>
                            );

                            if (btn.description) {
                              return (
                                <TooltipProvider key={btn.id}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      {ButtonContent}
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-xs">
                                      <p className="text-xs">{btn.description}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              );
                            }

                            return ButtonContent;
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
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Horário</Label>
              {timeOptions.length > 0 ? (
                <Select value={scheduleTime} onValueChange={setScheduleTime}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o horário" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                />
              )}
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

                <div className="space-y-1 mt-4">
                  <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide">Agente Atual</p>
                  <div className="ml-4 space-y-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('chatwoot-field', 'currentAgent.id');
                      }}
                      className="w-full justify-start h-8 text-xs font-mono hover:bg-primary/10 cursor-move"
                      onClick={() => {
                        const input = document.querySelector(`[data-chatwoot-field-input][data-active="true"]`) as HTMLInputElement;
                        if (input) {
                          input.value = 'currentAgent.id';
                          input.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                      }}
                    >
                      currentAgent.id
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('chatwoot-field', 'currentAgent.name');
                      }}
                      className="w-full justify-start h-8 text-xs font-mono hover:bg-primary/10 cursor-move"
                      onClick={() => {
                        const input = document.querySelector(`[data-chatwoot-field-input][data-active="true"]`) as HTMLInputElement;
                        if (input) {
                          input.value = 'currentAgent.name';
                          input.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                      }}
                    >
                      currentAgent.name
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('chatwoot-field', 'currentAgent.email');
                      }}
                      className="w-full justify-start h-8 text-xs font-mono hover:bg-primary/10 cursor-move"
                      onClick={() => {
                        const input = document.querySelector(`[data-chatwoot-field-input][data-active="true"]`) as HTMLInputElement;
                        if (input) {
                          input.value = 'currentAgent.email';
                          input.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                      }}
                    >
                      currentAgent.email
                    </Button>
                  </div>
                </div>
                </div>
              </ScrollArea>
            </div>

            {/* Coluna da direita: Configuração dos campos */}
            <ScrollArea className="border rounded-lg">
              <div className="space-y-4 p-4">
              <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext 
                  items={fieldMappings.map(m => m.id || m.profile_field)} 
                  strategy={verticalListSortingStrategy}
                >
                  {fieldMappings.map((mapping, index) => {
                    const SortableFieldCard = () => {
                      const {
                        attributes,
                        listeners,
                        setNodeRef,
                        transform,
                        transition,
                      } = useSortable({ id: mapping.id || mapping.profile_field });

                      const style = {
                        transform: CSS.Transform.toString(transform),
                        transition,
                      };

                      return (
                        <Card ref={setNodeRef} style={style} key={mapping.profile_field} className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
                                  <GripVertical className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <Label className="font-semibold">Campo #{index + 1}</Label>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => moveFieldUp(index)}
                                  disabled={index === 0}
                                  className="h-8 w-8"
                                  title="Mover para cima"
                                >
                                  <ChevronUp className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => moveFieldDown(index)}
                                  disabled={index === fieldMappings.length - 1}
                                  className="h-8 w-8"
                                  title="Mover para baixo"
                                >
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteFieldMapping(mapping.profile_field)}
                                  className="h-8 w-8"
                                  title="Remover campo"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
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
                      );
                    };

                    return <SortableFieldCard key={mapping.id || mapping.profile_field} />;
                  })}
                </SortableContext>
              </DndContext>
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

      {/* Modal de Resposta do Bitrix */}
      <Dialog open={bitrixResponseModal} onOpenChange={setBitrixResponseModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resposta do Bitrix</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm whitespace-pre-wrap break-words">{bitrixResponseMessage}</p>
          </div>
          <DialogFooter>
            <Button 
              onClick={() => setBitrixResponseModal(false)}
              className="w-full sm:w-auto"
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeadTab;
