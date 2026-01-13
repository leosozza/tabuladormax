import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Loader2, MapPin, Calendar, User, Hash, Search, CheckCircle2, ArrowUpDown, Camera, X, Check, MessageCircle, AlertCircle, History } from "lucide-react";
import { getLeadPhotoUrl, needsPhotoSync } from '@/lib/leadPhotoUtils';
import noPhotoPlaceholder from '@/assets/no-photo-placeholder.png';
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useCallback, useEffect, useMemo } from "react";
import { Progress } from "@/components/ui/progress";
import { LeadActions } from "./LeadActions";
import { LeadEditModal } from "./LeadEditModal";
import { TemplateHistoryPopover } from "./TemplateHistoryPopover";

interface ScouterLeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  scouterName: string;
  filterType: string;
  filterLabel: string;
  dateFrom: Date | null;
  dateTo: Date | null;
  projectId: string | null;
  onboardingActive?: boolean;
}

interface LeadData {
  lead_id: number;
  nome_modelo: string | null;
  nome_responsavel: string | null;
  criado: string | null;
  celular: string | null;
  address: string | null;
  photo_url: string | null;
  phone_normalized: string | null;
  ficha_confirmada: boolean | null;
  template_status: string | null;
  template_error_reason: string | null;
  template_send_count: number | null;
  // Campos de duplicado (preenchidos após verificação)
  has_duplicate?: boolean;
  is_duplicate_deleted?: boolean;
}

interface DuplicateCheckProgress {
  phase: 'idle' | 'internal' | 'database' | 'complete';
  progress: number;
  message: string;
}

type SortOrder = 'recent' | 'oldest' | 'az' | 'za';

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100] as const;

export function ScouterLeadsModal({
  isOpen,
  onClose,
  scouterName,
  filterType,
  filterLabel,
  dateFrom,
  dateTo,
  projectId,
  onboardingActive = false,
}: ScouterLeadsModalProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [duplicateStatus, setDuplicateStatus] = useState<Map<number, { has_duplicate: boolean; is_duplicate_deleted: boolean }>>(new Map());
  const [checkProgress, setCheckProgress] = useState<DuplicateCheckProgress>({ phase: 'idle', progress: 0, message: '' });
  const [editingLead, setEditingLead] = useState<LeadData | null>(null);
  const [photoPreviewLead, setPhotoPreviewLead] = useState<LeadData | null>(null);
  const [isSyncingPhoto, setIsSyncingPhoto] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('recent');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const queryClient = useQueryClient();

  // Carregar leads filtrados por tipo de card
  const { data: leads, isLoading } = useQuery({
    queryKey: ['scouter-leads-simple', scouterName, dateFrom, dateTo, projectId, filterType],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_scouter_leads_simple', {
        p_scouter_name: scouterName,
        p_date_from: dateFrom?.toISOString() || null,
        p_date_to: dateTo?.toISOString() || null,
        p_project_id: projectId || null,
        p_filter_type: filterType,
      });

      if (error) throw error;
      return data as LeadData[];
    },
    enabled: isOpen && !!scouterName,
  });

  // Reset estado quando modal fecha
  useEffect(() => {
    if (!isOpen) {
      setDuplicateStatus(new Map());
      setCheckProgress({ phase: 'idle', progress: 0, message: '' });
      setCurrentPage(1);
      setSearchTerm('');
      setSortOrder('recent');
      setIsSearchOpen(false);
      setPhotoPreviewLead(null);
      setIsSyncingPhoto(false);
    }
  }, [isOpen]);

  // Sincronização automática de foto ao abrir preview
  useEffect(() => {
    const syncPhotoIfNeeded = async () => {
      if (!photoPreviewLead?.lead_id) return;
      if (!needsPhotoSync(photoPreviewLead.photo_url)) return;
      
      setIsSyncingPhoto(true);
      try {
        const { data, error } = await supabase.functions.invoke('bitrix-photo-sync', {
          body: { leadId: photoPreviewLead.lead_id }
        });
        
        if (error) throw error;
        
        // Atualizar cache
        queryClient.invalidateQueries({ queryKey: ['scouter-leads-simple'] });
        
        // Atualizar o lead atual com a nova URL da foto
        if (data?.publicUrls?.length > 0) {
          setPhotoPreviewLead(prev => prev ? {
            ...prev,
            photo_url: JSON.stringify(data.publicUrls)
          } : null);
        }
      } catch (err: any) {
        console.error('Erro ao sincronizar foto:', err);
        toast.error('Erro ao carregar foto do Bitrix');
      } finally {
        setIsSyncingPhoto(false);
      }
    };
    
    syncPhotoIfNeeded();
  }, [photoPreviewLead?.lead_id, queryClient]);

  // Filtrar e ordenar leads
  const filteredAndSortedLeads = useMemo(() => {
    if (!leads) return [];

    // Filtrar por busca
    let result = leads;
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();
      result = leads.filter(lead => 
        lead.lead_id.toString().includes(search) ||
        lead.nome_modelo?.toLowerCase().includes(search) ||
        lead.nome_responsavel?.toLowerCase().includes(search)
      );
    }

    // Ordenar
    return [...result].sort((a, b) => {
      switch (sortOrder) {
        case 'recent':
          return new Date(b.criado || 0).getTime() - new Date(a.criado || 0).getTime();
        case 'oldest':
          return new Date(a.criado || 0).getTime() - new Date(b.criado || 0).getTime();
        case 'az':
          return (a.nome_modelo || '').localeCompare(b.nome_modelo || '', 'pt-BR');
        case 'za':
          return (b.nome_modelo || '').localeCompare(a.nome_modelo || '', 'pt-BR');
        default:
          return 0;
      }
    });
  }, [leads, searchTerm, sortOrder]);

  // Reset para página 1 quando busca, ordenação ou itens por página mudar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortOrder, itemsPerPage]);

  // Função para verificar duplicados
  const checkDuplicates = useCallback(async () => {
    if (!leads || leads.length === 0) return;

    const newStatus = new Map<number, { has_duplicate: boolean; is_duplicate_deleted: boolean }>();
    
    // FASE 1: Verificar duplicados INTERNOS (entre os próprios leads carregados)
    setCheckProgress({ phase: 'internal', progress: 20, message: 'Verificando entre seus leads...' });
    
    // Agrupar por telefone
    const phoneMap = new Map<string, number[]>();
    leads.forEach(lead => {
      if (lead.celular) {
        const phone = lead.celular.replace(/\D/g, ''); // Normalizar telefone
        if (phone.length >= 8) {
          const existing = phoneMap.get(phone) || [];
          existing.push(lead.lead_id);
          phoneMap.set(phone, existing);
        }
      }
    });

    // Marcar duplicados internos
    phoneMap.forEach((leadIds) => {
      if (leadIds.length > 1) {
        // O primeiro é o original, os outros são duplicados
        leadIds.forEach((id, index) => {
          if (index > 0) {
            newStatus.set(id, { has_duplicate: true, is_duplicate_deleted: false });
          }
        });
      }
    });

    await new Promise(resolve => setTimeout(resolve, 300)); // Pequeno delay para UX

    // FASE 2: Verificar duplicados na BASE DE DADOS
    setCheckProgress({ phase: 'database', progress: 50, message: 'Verificando na base de dados...' });

    try {
      const leadIds = leads.map(l => l.lead_id);
      const { data: duplicates, error } = await supabase.rpc('check_leads_duplicates', {
        p_lead_ids: leadIds,
        p_project_id: projectId || null,
        p_days_back: 60,
      });

      if (error) {
        console.error('Erro ao verificar duplicados:', error);
      } else if (duplicates) {
        setCheckProgress({ phase: 'database', progress: 80, message: 'Processando resultados...' });
        
        (duplicates as Array<{ lead_id: number; has_duplicate: boolean; is_duplicate_deleted: boolean }>).forEach(dup => {
          // Só atualizar se não já foi marcado como duplicado interno
          if (dup.has_duplicate && !newStatus.has(dup.lead_id)) {
            newStatus.set(dup.lead_id, { 
              has_duplicate: true, 
              is_duplicate_deleted: dup.is_duplicate_deleted 
            });
          }
        });
      }
    } catch (err) {
      console.error('Erro na verificação de duplicados:', err);
    }

    // Finalizar
    setDuplicateStatus(newStatus);
    const uniqueCount = leads.length - newStatus.size;
    setCheckProgress({ phase: 'complete', progress: 100, message: `✓ ${uniqueCount} leads únicos (${newStatus.size} duplicados)` });
  }, [leads, projectId]);

  const totalPages = Math.ceil(filteredAndSortedLeads.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLeads = filteredAndSortedLeads.slice(startIndex, startIndex + itemsPerPage);

  // Gerar números de páginas para navegação
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('ellipsis');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
  };

  const handlePrevPage = () => setCurrentPage((prev) => Math.max(1, prev - 1));
  const handleNextPage = () => setCurrentPage((prev) => Math.min(totalPages, prev + 1));

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  const renderDuplicateBadge = (lead: LeadData) => {
    const status = duplicateStatus.get(lead.lead_id);
    if (!status) return null;

    if (status.is_duplicate_deleted) {
      return (
        <Badge variant="destructive" className="text-xs whitespace-nowrap">
          Duplicado Excluído
        </Badge>
      );
    }
    if (status.has_duplicate) {
      return (
        <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-xs whitespace-nowrap">
          Duplicado
        </Badge>
      );
    }
    return null;
  };

  const renderConfirmadoBadge = (lead: LeadData) => {
    if (lead.ficha_confirmada) {
      return (
        <Badge className="bg-green-500 hover:bg-green-600 text-white text-xs whitespace-nowrap">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Confirmado
        </Badge>
      );
    }
    return null;
  };

  // Encontrar o primeiro lead que TEM foto (para o data-tour)
  const firstLeadWithPhoto = useMemo(() => {
    return paginatedLeads.find(lead => 
      lead.photo_url && lead.photo_url !== '' && lead.photo_url !== '[]'
    );
  }, [paginatedLeads]);

  const renderPhotoBadge = (lead: LeadData) => {
    const hasPhoto = lead.photo_url && 
      lead.photo_url !== '' && 
      lead.photo_url !== '[]';
    
    if (hasPhoto) {
      // Adicionar data-tour apenas ao primeiro lead com foto
      const isFirstWithPhoto = firstLeadWithPhoto?.lead_id === lead.lead_id;
      
      return (
        <Badge 
          data-tour={isFirstWithPhoto ? "lead-photo-badge" : undefined}
          className="bg-blue-500 hover:bg-blue-600 text-white text-xs whitespace-nowrap cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            setPhotoPreviewLead(lead);
          }}
        >
          <Camera className="h-3 w-3 mr-1" />
          Foto
        </Badge>
      );
    }
    return null;
  };

  // Traduzir erros de template WhatsApp para português com mensagens mais descritivas
  const translateTemplateError = (reason: string | null): string => {
    if (!reason) return 'Erro no envio';
    
    const lowerReason = reason.toLowerCase();
    
    // Mapeamento detalhado com prioridade (primeiro match ganha)
    const errorPatterns: Array<{ pattern: string; message: string }> = [
      // Saldo
      { pattern: 'low balance', message: 'Saldo insuficiente' },
      { pattern: 'insufficient balance', message: 'Saldo insuficiente' },
      { pattern: 'balance', message: 'Saldo insuficiente' },
      
      // Número sem WhatsApp
      { pattern: 'not a valid whatsapp', message: 'Número sem WhatsApp' },
      { pattern: 'not on whatsapp', message: 'Número sem WhatsApp' },
      { pattern: 'invalid whatsapp', message: 'Número sem WhatsApp' },
      { pattern: 'recipient not found', message: 'Número sem WhatsApp' },
      { pattern: 'user not found', message: 'Número sem WhatsApp' },
      { pattern: 'no whatsapp', message: 'Número sem WhatsApp' },
      
      // Mensagem não entregue (pode ser sem WhatsApp ou bloqueado)
      { pattern: 'message undeliverable', message: 'Sem WhatsApp ou bloqueado' },
      { pattern: 'undeliverable', message: 'Sem WhatsApp ou bloqueado' },
      
      // Bloqueios
      { pattern: 'blocked', message: 'Bloqueado para receber' },
      { pattern: 'spam', message: 'Bloqueado por spam' },
      { pattern: 'opt out', message: 'Usuário optou por não receber' },
      { pattern: 'opted out', message: 'Usuário optou por não receber' },
      
      // Número inválido
      { pattern: 'invalid phone', message: 'Telefone inválido' },
      { pattern: 'invalid number', message: 'Número inválido' },
      { pattern: 'invalid', message: 'Número inválido' },
      
      // Limites e expiração
      { pattern: 'rate limit', message: 'Limite de envio excedido' },
      { pattern: 'template not found', message: 'Template não encontrado' },
      { pattern: 'expired', message: 'Mensagem expirada' },
      { pattern: 'timeout', message: 'Tempo esgotado' },
      
      // Falha genérica
      { pattern: 'failed', message: 'Falha no envio' },
    ];

    for (const { pattern, message } of errorPatterns) {
      if (lowerReason.includes(pattern)) {
        return message;
      }
    }

    return 'Erro no envio';
  };

  const renderTemplateBadge = (lead: LeadData) => {
    if (!lead.template_status) {
      return null; // Nenhum template enviado ainda
    }

    const sendCount = lead.template_send_count || 0;
    
    // Wrapper com histórico (se houver pelo menos 1 envio)
    const wrapWithHistory = (badge: React.ReactNode) => {
      if (sendCount === 0) return badge;
      
      return (
        <TemplateHistoryPopover leadId={lead.lead_id}>
          <div className="inline-flex items-center gap-1 cursor-pointer group">
            {badge}
            {sendCount > 1 && (
              <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors">
                <History className="h-3 w-3 inline" />
                {sendCount}
              </span>
            )}
          </div>
        </TemplateHistoryPopover>
      );
    };

    // Template lido ou entregue = sucesso
    if (lead.template_status === 'read' || lead.template_status === 'delivered') {
      return wrapWithHistory(
        <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs whitespace-nowrap">
          <MessageCircle className="h-3 w-3 mr-1" />
          WhatsApp Enviado
        </Badge>
      );
    }

    // Template falhou
    if (lead.template_status === 'failed') {
      const errorMessage = translateTemplateError(lead.template_error_reason);
      
      // Se já atingiu limite de reenvio (2 tentativas)
      if (sendCount >= 2) {
        return wrapWithHistory(
          <Badge variant="destructive" className="text-xs whitespace-nowrap">
            <AlertCircle className="h-3 w-3 mr-1" />
            {errorMessage} (limite)
          </Badge>
        );
      }
      
      return wrapWithHistory(
        <Badge variant="destructive" className="text-xs whitespace-nowrap">
          <AlertCircle className="h-3 w-3 mr-1" />
          {errorMessage}
        </Badge>
      );
    }

    // Template enviado mas aguardando confirmação
    if (lead.template_status === 'sent') {
      return wrapWithHistory(
        <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-xs whitespace-nowrap">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Aguardando
        </Badge>
      );
    }

    return null;
  };

  // Formatar endereço para exibição resumida
  const formatAddress = (fullAddress: string | null): string => {
    if (!fullAddress) return '-';
    
    // Partes a remover (padrões de geocoding)
    const partsToRemove = [
      /,?\s*Região Imediata de[^,]*/gi,
      /,?\s*Região Metropolitana de[^,]*/gi,
      /,?\s*Região Geográfica Intermediária de[^,]*/gi,
      /,?\s*Região (Sudeste|Norte|Sul|Centro-Oeste|Nordeste)/gi,
      /,?\s*Brasil$/gi,
      /,?\s*\d{5}-\d{3}/g, // CEP
    ];
    
    let cleaned = fullAddress;
    partsToRemove.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });
    
    // Limpar vírgulas duplicadas e espaços extras
    cleaned = cleaned.replace(/,\s*,/g, ',').replace(/\s+/g, ' ').trim();
    cleaned = cleaned.replace(/,\s*$/, '');
    
    // Pegar partes e identificar estado
    const parts = cleaned.split(',').map(p => p.trim()).filter(p => p);
    
    // Tentar identificar cidade e estado (ex: "São Paulo" é cidade e estado)
    const statePattern = /^(São Paulo|Rio de Janeiro|Minas Gerais|Bahia|Paraná|Santa Catarina|Rio Grande do Sul|Goiás|Pernambuco|Ceará|Espírito Santo|Maranhão|Mato Grosso|Mato Grosso do Sul|Amazonas|Pará|Piauí|Sergipe|Alagoas|Paraíba|Rio Grande do Norte|Tocantins|Acre|Amapá|Rondônia|Roraima|Distrito Federal)$/i;
    
    const stateAbbr: { [key: string]: string } = {
      'são paulo': 'SP', 'rio de janeiro': 'RJ', 'minas gerais': 'MG', 'bahia': 'BA',
      'paraná': 'PR', 'santa catarina': 'SC', 'rio grande do sul': 'RS', 'goiás': 'GO',
      'pernambuco': 'PE', 'ceará': 'CE', 'espírito santo': 'ES', 'maranhão': 'MA',
      'mato grosso': 'MT', 'mato grosso do sul': 'MS', 'amazonas': 'AM', 'pará': 'PA',
      'piauí': 'PI', 'sergipe': 'SE', 'alagoas': 'AL', 'paraíba': 'PB',
      'rio grande do norte': 'RN', 'tocantins': 'TO', 'acre': 'AC', 'amapá': 'AP',
      'rondônia': 'RO', 'roraima': 'RR', 'distrito federal': 'DF'
    };
    
    // Encontrar e remover estado, guardando a abreviação
    let stateAbbreviation = '';
    const filteredParts = parts.filter(part => {
      if (statePattern.test(part)) {
        stateAbbreviation = stateAbbr[part.toLowerCase()] || '';
        return false;
      }
      return true;
    });
    
    // Se tiver muitas partes, limitar
    let result = filteredParts.slice(0, 5).join(', ');
    
    // Adicionar estado abreviado à cidade (última parte antes do estado)
    if (stateAbbreviation && filteredParts.length > 0) {
      const lastPart = filteredParts[filteredParts.length - 1];
      result = filteredParts.slice(0, -1).join(', ');
      if (result) result += ', ';
      result += `${lastPart}-${stateAbbreviation}`;
    }
    
    return result || '-';
  };

  const duplicatesCount = duplicateStatus.size;
  const uniqueLeadsCount = (leads?.length || 0) - duplicatesCount;
  const isChecking = checkProgress.phase !== 'idle' && checkProgress.phase !== 'complete';

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange} modal={!onboardingActive}>
      <DialogContent className="w-[95vw] max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 text-base sm:text-lg">
            {filterLabel}
            {leads && (
              <>
                {checkProgress.phase === 'complete' ? (
                  <>
                    <Badge className="ml-1 bg-green-600 hover:bg-green-700">
                      {uniqueLeadsCount} leads únicos
                    </Badge>
                    {duplicatesCount > 0 && (
                      <Badge variant="destructive" className="ml-1">
                        {duplicatesCount} duplicado(s)
                      </Badge>
                    )}
                  </>
                ) : (
                  <Badge variant="secondary" className="ml-1">
                    {leads.length} leads
                  </Badge>
                )}
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Controles: Verificar Duplicados + Busca + Ordenação */}
        {leads && leads.length > 0 && (
          <div className="flex flex-col gap-2 py-2 border-b border-border">
            <div className="flex items-center justify-between gap-3">
              {/* Lado esquerdo: Verificar Duplicados (apenas para Total de Leads) */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {filterType === 'all' && (
                  <>
                    <Button
                      variant={checkProgress.phase === 'complete' ? 'secondary' : 'default'}
                      size="sm"
                      onClick={checkDuplicates}
                      disabled={isChecking}
                      className="gap-2 flex-shrink-0"
                    >
                      {isChecking ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : checkProgress.phase === 'complete' ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                      <span className="hidden sm:inline">
                        {checkProgress.phase === 'complete' ? 'Verificado' : 'Verificar Duplicados'}
                      </span>
                    </Button>
                    
                    {checkProgress.phase !== 'idle' && (
                      <span className="text-sm text-muted-foreground truncate">
                        {checkProgress.message}
                      </span>
                    )}
                  </>
                )}
              </div>
              
              {/* Lado direito: Ícones de Busca e Ordenação */}
              <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                {/* Busca expansível */}
                {isSearchOpen ? (
                  <div className="flex items-center gap-1 md:gap-2">
                    <Input
                      autoFocus
                      placeholder="Buscar..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-9 md:h-10 w-32 sm:w-48 md:w-56"
                    />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 md:h-10 md:w-10 flex-shrink-0"
                      onClick={() => {
                        setIsSearchOpen(false);
                        setSearchTerm('');
                      }}
                    >
                      <X className="h-4 w-4 md:h-5 md:w-5" />
                    </Button>
                  </div>
                ) : (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9 md:h-10 md:w-10"
                    onClick={() => setIsSearchOpen(true)}
                  >
                    <Search className="h-4 w-4 md:h-5 md:w-5" />
                  </Button>
                )}

                {/* Ordenação com Popover */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 md:h-10 md:w-10">
                      <ArrowUpDown className="h-4 w-4 md:h-5 md:w-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-44 p-1" align="end">
                    <div className="flex flex-col">
                      {[
                        { value: 'recent', label: 'Mais Recentes' },
                        { value: 'oldest', label: 'Mais Antigos' },
                        { value: 'az', label: 'Alfabético A-Z' },
                        { value: 'za', label: 'Alfabético Z-A' },
                      ].map((option) => (
                        <Button
                          key={option.value}
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "justify-start font-normal",
                            sortOrder === option.value && "bg-accent font-medium"
                          )}
                          onClick={() => setSortOrder(option.value as SortOrder)}
                        >
                          {sortOrder === option.value && <Check className="h-4 w-4 mr-2" />}
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            {isChecking && (
              <Progress value={checkProgress.progress} className="h-1.5" />
            )}
          </div>
        )}

        {/* Contador de resultados e Itens por página */}
        {leads && leads.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-2">
            <div className="text-xs text-muted-foreground">
              Mostrando {Math.min(startIndex + 1, filteredAndSortedLeads.length)}-{Math.min(startIndex + itemsPerPage, filteredAndSortedLeads.length)} de {filteredAndSortedLeads.length} leads
              {searchTerm && ` (filtrado de ${leads.length})`}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Itens por página:</span>
              <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                <SelectTrigger className="w-[80px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option.toString()}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto -mx-4 px-4 sm:-mx-6 sm:px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !leads || leads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum lead encontrado
            </div>
          ) : filteredAndSortedLeads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum lead encontrado para "{searchTerm}"
            </div>
          ) : (
            <>
              {/* Mobile Card Layout */}
              <div className="md:hidden space-y-3">
                {paginatedLeads.map((lead) => (
                  <div 
                    key={lead.lead_id} 
                    className="bg-muted/50 rounded-lg p-3 border border-border"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Hash className="h-3 w-3" />
                        <span className="font-mono">{lead.lead_id}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {renderTemplateBadge(lead)}
                        {renderPhotoBadge(lead)}
                        {renderConfirmadoBadge(lead)}
                        {renderDuplicateBadge(lead)}
                        <div data-tour={paginatedLeads.indexOf(lead) === 0 ? "lead-actions-menu" : undefined}>
                          <LeadActions
                            lead={lead}
                            onEdit={() => setEditingLead(lead)}
                            onActionComplete={() => {
                              queryClient.invalidateQueries({ queryKey: ['scouter-leads-simple'] });
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm font-medium truncate">
                          {lead.nome_modelo || '-'}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs text-muted-foreground">
                          {lead.criado
                            ? format(new Date(lead.criado), "dd/MM/yyyy HH:mm", { locale: ptBR })
                            : '-'}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs text-muted-foreground truncate">
                          {formatAddress(lead.address)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table Layout */}
              <Table className="hidden md:table">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">ID</TableHead>
                    <TableHead>Nome do Modelo</TableHead>
                    <TableHead className="w-32">Data Criação</TableHead>
                    <TableHead>Local de Abordagem</TableHead>
                    <TableHead className="w-28">Status</TableHead>
                    <TableHead className="w-16">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLeads.map((lead) => (
                    <TableRow key={lead.lead_id}>
                      <TableCell className="font-mono text-xs">
                        {lead.lead_id}
                      </TableCell>
                      <TableCell>
                        {lead.nome_modelo || '-'}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {lead.criado
                          ? format(new Date(lead.criado), "dd/MM/yyyy HH:mm", { locale: ptBR })
                          : '-'}
                      </TableCell>
                      <TableCell className="text-sm max-w-[250px]">
                        <span className="truncate block" title={lead.address || ''}>
                          {formatAddress(lead.address)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 flex-wrap">
                          {renderTemplateBadge(lead)}
                          {renderPhotoBadge(lead)}
                          {renderConfirmadoBadge(lead)}
                          {renderDuplicateBadge(lead)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div data-tour={paginatedLeads.indexOf(lead) === 0 ? "lead-actions-menu" : undefined}>
                          <LeadActions
                            lead={lead}
                            onEdit={() => setEditingLead(lead)}
                            onActionComplete={() => {
                              queryClient.invalidateQueries({ queryKey: ['scouter-leads-simple'] });
                            }}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-4 border-t">
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className="h-8 px-2"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              {getPageNumbers().map((page, index) => (
                page === 'ellipsis' ? (
                  <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">...</span>
                ) : (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="h-8 w-8 p-0"
                  >
                    {page}
                  </Button>
                )
              ))}
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="h-8 px-2"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>

      {/* Edit Lead Modal */}
      <LeadEditModal
        isOpen={!!editingLead}
        onClose={() => setEditingLead(null)}
        lead={editingLead}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['scouter-leads-simple'] });
        }}
      />

      {/* Modal de Preview de Foto */}
      <Dialog open={!!photoPreviewLead} onOpenChange={() => setPhotoPreviewLead(null)} modal={!onboardingActive}>
        <DialogContent className="max-w-lg p-0 bg-black/95 border-none overflow-hidden">
          <div className="relative w-full flex flex-col items-center">
            {/* Header com nome do lead */}
            <div className="w-full bg-black/80 px-4 py-3 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">#{photoPreviewLead?.lead_id}</p>
                  <p className="text-sm text-gray-300">
                    {photoPreviewLead?.nome_modelo || photoPreviewLead?.nome_responsavel || 'Sem nome'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={() => setPhotoPreviewLead(null)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
            
            {/* Foto */}
            <div className="w-full flex items-center justify-center p-4 min-h-[200px]">
              {isSyncingPhoto ? (
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <p className="text-sm">Carregando foto do Bitrix...</p>
                </div>
              ) : (
                <img
                  src={getLeadPhotoUrl(photoPreviewLead?.photo_url)}
                  alt={`Foto do lead ${photoPreviewLead?.lead_id}`}
                  className="max-w-full max-h-[60vh] object-contain rounded-lg"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = noPhotoPlaceholder;
                  }}
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
