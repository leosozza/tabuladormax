import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GestaoPageLayout } from "@/components/layouts/GestaoPageLayout";
import LeadDetailModal from "@/components/gestao/LeadDetailModal";
import { LeadAnalysisModal } from "@/components/gestao/LeadAnalysisModal";
import { LeadColumnSelector } from "@/components/gestao/LeadColumnSelector";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Search, Download, PlayCircle, Settings2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { GestaoFiltersComponent } from "@/components/gestao/GestaoFilters";
import { GestaoFilters } from "@/types/filters";
import { createDateFilter } from "@/lib/dateUtils";
import { useLeadColumnConfig, LeadColumnConfigProvider } from "@/hooks/useLeadColumnConfig";
import { useGestaoFieldMappings } from "@/hooks/useGestaoFieldMappings";
import { useBitrixSpa } from "@/hooks/useBitrixSpa";
import { useBitrixEnums } from "@/hooks/useBitrixEnums";
import { toast } from "sonner";
import { TinderCardConfigModal } from "@/components/gestao/TinderCardConfigModal";
import { getFilterableField, resolveJoinFieldValue } from "@/lib/fieldFilterUtils";

function GestaoLeadsContent() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [filters, setFilters] = useState<GestaoFilters>({
    dateFilter: createDateFilter('month'),
    projectId: null,
    scouterId: null,
    additionalFilters: []
  });
  
  // Estados para análise de leads
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<number>>(new Set());
  const [isAnalysisMode, setIsAnalysisMode] = useState(false);
  const [analysisLeads, setAnalysisLeads] = useState<any[]>([]);
  const [currentAnalysisIndex, setCurrentAnalysisIndex] = useState(0);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  
  // Estado para controlar o modal de configuração do cartão
  const [configModalOpen, setConfigModalOpen] = useState(false);
  
  const { visibleColumns } = useLeadColumnConfig();
  const { data: allFields, isLoading: isLoadingFields } = useGestaoFieldMappings();
  
  const { data: leads, isLoading } = useQuery({
    queryKey: ["gestao-leads", searchTerm, filters, visibleColumns],
    queryFn: async () => {
      // Campos obrigatórios (sempre necessários)
      const mandatoryFields = [
        'id', 
        'name', 
        'criado',
        'nome_modelo',
        'scouter',
        'photo_url',
        'projeto_comercial'
      ];
      
      // Separar campos diretos de campos de relacionamento
      const directFields: string[] = [];
      const relationshipFields = new Set<string>();
      
      for (const key of visibleColumns || []) {
        if (key.includes('.')) {
          // Campo de relacionamento (ex: commercial_projects.name)
          const [table] = key.split('.');
          relationshipFields.add(table);
        } else {
          // Campo direto da tabela leads
          directFields.push(key);
        }
      }
      
      // Combinar campos diretos com obrigatórios
      const fieldsToSelect = Array.from(new Set([
        ...mandatoryFields,
        ...directFields
      ]));
      
      // Se precisa do relacionamento commercial_projects, garantir que commercial_project_id esteja no SELECT
      if (relationshipFields.has('commercial_projects') && !fieldsToSelect.includes('commercial_project_id')) {
        fieldsToSelect.push('commercial_project_id');
      }
      
      // Sempre incluir commercial_projects nos relacionamentos
      relationshipFields.add('commercial_projects');
      
      // Construir SELECT para campos diretos
      let selectClause = fieldsToSelect.join(',');
      
      // Adicionar relacionamentos necessários (sempre incluir commercial_projects)
      selectClause += ',commercial_projects:commercial_project_id(id,name,code)';
      
      // Construir a query base
      const queryBuilder = supabase
        .from("leads")
        .select(selectClause)
        .order("criado", { ascending: false })
        .limit(100);
      
      // Aplicar filtros de busca por nome, ID ou nome_modelo
      if (searchTerm) {
        // Verificar se é um número (possível ID)
        const isNumeric = /^\d+$/.test(searchTerm);
        if (isNumeric) {
          queryBuilder.or(`name.ilike.%${searchTerm}%,id.eq.${searchTerm},nome_modelo.ilike.%${searchTerm}%`);
        } else {
          queryBuilder.or(`name.ilike.%${searchTerm}%,nome_modelo.ilike.%${searchTerm}%`);
        }
      }

      // Aplicar filtro de data
      queryBuilder
        .gte("criado", filters.dateFilter.startDate.toISOString())
        .lte("criado", filters.dateFilter.endDate.toISOString());

      // Aplicar filtro de projeto
      if (filters.projectId) {
        queryBuilder.eq("commercial_project_id", filters.projectId);
      }

      // Aplicar filtro de scouter
      if (filters.scouterId) {
        queryBuilder.eq("scouter", filters.scouterId);
      }

      // Aplicar filtros adicionais dinamicamente
      if (filters.additionalFilters && filters.additionalFilters.length > 0) {
        for (const additionalFilter of filters.additionalFilters) {
          const { field, value, operator = 'eq' } = additionalFilter;
          
          // 1. Resolver campo real (tratar JOINs)
          const actualField = getFilterableField(field);
          if (!actualField) {
            console.warn(`Campo ${field} não pode ser filtrado diretamente`);
            continue; // Pular filtro inválido
          }
          
          // 2. Buscar tipo do campo
          const fieldMapping = allFields?.find(f => f.key === field);
          const qb = queryBuilder as any;
          
          // 3. Validar valor não vazio
          if (!value || value === '') {
            console.warn(`Valor vazio para filtro em ${field}`);
            continue;
          }
          
          // 4. Tratamento especial para booleanos
          if (fieldMapping?.type === 'boolean' || 
              (typeof value === 'string' && (value === 'true' || value === 'false'))) {
            const boolValue = value === 'true' || value === 'Sim';
            qb.eq(actualField, boolValue);
            continue;
          }
          
          // 5. Tratamento especial para campos JOIN (commercial_projects)
          if (actualField === 'commercial_project_id' && field.startsWith('commercial_projects.')) {
            // Usuário filtrou por nome/code, mas precisa converter para UUID
            const resolvedValue = await resolveJoinFieldValue(field, value);
            
            if (resolvedValue) {
              qb.eq('commercial_project_id', resolvedValue);
            } else {
              console.warn(`Não foi possível resolver ${field} = ${value}`);
            }
            continue;
          }
          
          // 6. Aplicar filtro baseado no operador
          switch (operator) {
            case 'eq':
              qb.eq(actualField, value);
              break;
            case 'contains':
              qb.ilike(actualField, `%${value}%`);
              break;
            case 'gt':
              qb.gt(actualField, value);
              break;
            case 'lt':
              qb.lt(actualField, value);
              break;
            case 'gte':
              qb.gte(actualField, value);
              break;
            case 'lte':
              qb.lte(actualField, value);
              break;
            default:
              console.warn(`Operador ${operator} não suportado`);
          }
        }
      }
      
      const { data, error } = await queryBuilder;
      if (error) throw error;
      return data as any[];
    },
  });

  // Get visible field configurations from dynamic mappings in the correct order
  const visibleFields = visibleColumns
    .map(key => allFields?.find(field => field.key === key))
    .filter((field): field is NonNullable<typeof field> => field !== undefined);

  // Montar requisições SPA para resolver IDs antigos
  const spaRequests = useMemo(() => {
    if (!leads || !visibleFields) return [];

    const requests: { bitrixField: string; bitrixItemId: number }[] = [];
    const seen = new Set<string>();

    for (const lead of leads) {
      for (const field of visibleFields) {
        if (field.bitrixFieldType !== 'crm_entity' || !field.bitrixField) continue;
        
        const raw = lead[field.key as keyof typeof lead];
        const id = raw != null ? Number(raw) : NaN;
        
        if (!Number.isNaN(id) && id > 0) {
          const key = `${field.bitrixField}-${id}`;
          if (!seen.has(key)) {
            seen.add(key);
            requests.push({ bitrixField: field.bitrixField, bitrixItemId: id });
          }
        }
      }
    }

    return requests;
  }, [leads, visibleFields]);

  const { data: spaResolutions } = useBitrixSpa(spaRequests);

  // Montar requisições de enum para resolver códigos técnicos
  const enumRequests = useMemo(() => {
    if (!leads || !visibleFields) return [];

    const requests: { bitrixField: string; value: unknown; bitrixFieldType?: string }[] = [];
    const seen = new Set<string>();

    for (const lead of leads) {
      for (const field of visibleFields) {
        if (!field.bitrixField || !field.bitrixFieldType) continue;
        if (!['enumeration', 'crm_status', 'crm_stage'].includes(field.bitrixFieldType)) continue;

        const rawValue = lead[field.key as keyof typeof lead];
        if (rawValue == null || rawValue === '') continue;

        const key = `${field.bitrixField}:${rawValue}`;
        if (!seen.has(key)) {
          seen.add(key);
          requests.push({
            bitrixField: field.bitrixField,
            value: rawValue,
            bitrixFieldType: field.bitrixFieldType,
          });
        }
      }
    }

    return requests;
  }, [leads, visibleFields]);

  const { getResolution } = useBitrixEnums(enumRequests);

  // Funções de seleção de leads
  const toggleSelectAll = () => {
    if (selectedLeadIds.size === leads?.length) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(leads?.map(l => l.id) || []));
    }
  };

  const toggleSelectLead = (leadId: number) => {
    const newSet = new Set(selectedLeadIds);
    if (newSet.has(leadId)) {
      newSet.delete(leadId);
    } else {
      newSet.add(leadId);
    }
    setSelectedLeadIds(newSet);
  };

  // Iniciar análise
  const handleStartAnalysis = () => {
    const leadsToAnalyze = leads?.filter(l => selectedLeadIds.has(l.id)) || [];
    if (leadsToAnalyze.length === 0) {
      toast.error('Selecione ao menos um lead para analisar');
      return;
    }
    
    // Garantir que os campos essenciais estejam presentes para análise
    const enrichedLeads = leadsToAnalyze.map(lead => ({
      ...lead,
      // Mapear projeto comercial do relacionamento se existir
      projeto_comercial: lead.commercial_projects?.name || lead.projeto_comercial || 'Sem projeto',
      // Garantir outros campos essenciais com fallbacks
      nome_modelo: lead.nome_modelo || 'Não informado',
      scouter: lead.scouter || 'Não informado',
      criado: lead.criado || new Date().toISOString(),
    }));
    
    setAnalysisLeads(enrichedLeads);
    setCurrentAnalysisIndex(0);
    setIsAnalysisMode(true);
  };

  // Funções de análise
  const moveToNextLead = () => {
    if (currentAnalysisIndex < analysisLeads.length - 1) {
      setCurrentAnalysisIndex(prev => prev + 1);
    } else {
      setIsAnalysisMode(false);
      setSelectedLeadIds(new Set());
      toast.success('Análise concluída!');
      queryClient.invalidateQueries({ queryKey: ['gestao-leads'] });
    }
  };

  const handleApprove = async () => {
    const currentLead = analysisLeads[currentAnalysisIndex];
    setIsProcessingAction(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('leads')
        .update({
          qualidade_lead: 'aprovado',
          data_analise: new Date().toISOString(),
          analisado_por: user?.id
        })
        .eq('id', currentLead.id);
      
      if (error) throw error;
      
      toast.success('Lead aprovado!');
      moveToNextLead();
    } catch (error) {
      console.error('Erro ao aprovar lead:', error);
      toast.error('Erro ao aprovar lead');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleReject = async () => {
    const currentLead = analysisLeads[currentAnalysisIndex];
    setIsProcessingAction(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('leads')
        .update({
          qualidade_lead: 'reprovado',
          data_analise: new Date().toISOString(),
          analisado_por: user?.id
        })
        .eq('id', currentLead.id);
      
      if (error) throw error;
      
      toast.success('Lead reprovado');
      moveToNextLead();
    } catch (error) {
      console.error('Erro ao reprovar lead:', error);
      toast.error('Erro ao reprovar lead');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleSuperApprove = async () => {
    const currentLead = analysisLeads[currentAnalysisIndex];
    setIsProcessingAction(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('leads')
        .update({
          qualidade_lead: 'super_aprovado',
          data_analise: new Date().toISOString(),
          analisado_por: user?.id
        })
        .eq('id', currentLead.id);
      
      if (error) throw error;
      
      toast.success('Lead super aprovado! ⭐');
      moveToNextLead();
    } catch (error) {
      console.error('Erro ao super aprovar lead:', error);
      toast.error('Erro ao super aprovar lead');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleSkip = () => {
    moveToNextLead();
  };

  // Atalhos de teclado para análise
  useEffect(() => {
    if (!isAnalysisMode || isProcessingAction) return;
    
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handleReject();
      if (e.key === 'ArrowRight') handleApprove();
      if (e.key === 'ArrowUp') handleSuperApprove();
      if (e.key === 'ArrowDown') handleSkip();
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isAnalysisMode, currentAnalysisIndex, isProcessingAction]);

  const handleExport = () => {
    if (!leads) return;
    
    const headers = visibleFields.map(field => field.label);
    const rows = leads.map(lead => 
      visibleFields.map(field => {
        // Lidar com campos aninhados no export
        let value;
        if (field.key.includes('.')) {
          const [table, column] = field.key.split('.');
          value = lead[table]?.[column];
        } else {
          value = lead[field.key];
        }
        
        // Apply formatter if available
        if (field.formatter) {
          const formatted = field.formatter(value, lead);
          // Se o formatter retorna um ReactNode, tentar extrair texto
          return typeof formatted === 'string' ? formatted : value;
        }
        
        return value || "-";
      })
    );
    
    const csv = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  const handleLeadClick = (lead: any) => {
    setSelectedLead(lead);
    setModalOpen(true);
  };

  // Renderizar valor da célula com badges para qualidade_lead
  const renderCellValue = (field: any, value: any, lead: any) => {
    if (field.key === 'qualidade_lead') {
      const status = value as string;
      if (status === 'aprovado') {
        return (
          <Badge variant="default" className="bg-green-500">
            ✓ Aprovado
          </Badge>
        );
      }
      if (status === 'reprovado') {
        return (
          <Badge variant="destructive">
            ✗ Reprovado
          </Badge>
        );
      }
      if (status === 'super_aprovado') {
        return (
          <Badge variant="default" className="bg-yellow-500">
            ⭐ Super
          </Badge>
        );
      }
      return <span className="text-muted-foreground">-</span>;
    }

    // Lidar com campos aninhados (e.g., commercial_projects.name)
    let displayValue;
    if (field.key.includes('.')) {
      const [table, column] = field.key.split('.');
      displayValue = lead[table]?.[column];
    } else {
      displayValue = value;
    }
    
    let formattedValue = field.formatter 
      ? field.formatter(displayValue, lead) 
      : displayValue || "-";

    // Resolver SPA (ex: scouter, projeto_comercial)
    if (field.bitrixFieldType === 'crm_entity' && field.bitrixField && displayValue != null) {
      const id = Number(displayValue);
      if (!Number.isNaN(id) && id > 0) {
        const spaKey = `${field.bitrixField}-${id}`;
        const spaResolution = spaResolutions?.[spaKey];
        if (spaResolution) {
          formattedValue = spaResolution.name;
        }
      }
    }

    // Resolver Enum (ex: etapa, status_fluxo)
    if (field.bitrixField && field.bitrixFieldType && 
        ['enumeration', 'crm_status', 'crm_stage'].includes(field.bitrixFieldType) &&
        displayValue != null && displayValue !== '') {
      const enumResolution = getResolution(field.bitrixField, displayValue);
      if (enumResolution) {
        formattedValue = enumResolution.label;
      }
    }

    return formattedValue;
  };

  return (
    <GestaoPageLayout
      title="Gestão de Leads"
      actions={
        <div className={cn(
          "flex gap-2 flex-wrap",
          searchExpanded && "hidden md:flex"
        )}>
          <LeadColumnSelector />
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfigModalOpen(true)}
            className="gap-2"
          >
            <Settings2 className="w-4 h-4" />
            <span className="hidden lg:inline">Personalizar</span>
          </Button>
          
          {selectedLeadIds.size > 0 && (
            <Button
              onClick={handleStartAnalysis}
              variant="default"
              size="sm"
            >
              <PlayCircle className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Análise </span>({selectedLeadIds.size})
            </Button>
          )}
          
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="h-4 w-4" />
            <span className="hidden lg:inline ml-2">Exportar</span>
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Busca e Filtros */}
        <div className="flex gap-2 items-end w-full">
          {/* Desktop: Barra sempre visível */}
          <div className="hidden md:flex flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, ID ou modelo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Mobile: Ícone de lupa que expande */}
          <div className="flex md:hidden gap-2 items-center flex-1">
            {!searchExpanded ? (
              // Botão de lupa colapsado
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSearchExpanded(true)}
                className="shrink-0"
              >
                <Search className="h-4 w-4" />
              </Button>
            ) : (
              // Barra de busca expandida em mobile
              <div className="flex gap-2 w-full animate-in slide-in-from-right-5">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Nome, ID ou modelo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-9"
                    autoFocus
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSearchExpanded(false);
                    setSearchTerm("");
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Filtros */}
          <GestaoFiltersComponent
            filters={filters}
            onChange={setFilters}
          />
        </div>

        <div className="flex-1 overflow-auto">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-3 sm:w-4 md:w-6 lg:w-8 p-1 text-center h-8 md:h-10">
                    <Checkbox
                      className="h-1 w-1 md:h-1.5 md:w-1.5"
                      checked={selectedLeadIds.size === leads?.length && leads.length > 0}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Selecionar todos"
                    />
                  </TableHead>
                  {visibleFields.map((field) => (
                    <TableHead key={field.key}>{field.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={visibleFields.length + 1} className="text-center">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : !leads?.length ? (
                  <TableRow>
                    <TableCell colSpan={visibleFields.length + 1} className="text-center">
                      Nenhum lead encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  leads?.map((lead) => (
                    <TableRow 
                      key={lead.id}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      <TableCell 
                        onClick={(e) => e.stopPropagation()}
                        className="w-3 sm:w-4 md:w-6 lg:w-8 p-1 text-center"
                      >
                        <Checkbox
                          className="h-1 w-1 md:h-1.5 md:w-1.5"
                          checked={selectedLeadIds.has(lead.id)}
                          onCheckedChange={() => toggleSelectLead(lead.id)}
                          aria-label={`Selecionar lead ${lead.id}`}
                        />
                      </TableCell>
                      {visibleFields.map((field) => {
                        const value = lead[field.key];
                        return (
                          <TableCell 
                            key={field.key} 
                            className={field.key === 'name' ? 'font-medium' : ''}
                            onClick={() => handleLeadClick(lead)}
                          >
                            {renderCellValue(field, value, lead)}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <LeadDetailModal
        lead={selectedLead}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />

      {isAnalysisMode && analysisLeads.length > 0 && (
        <LeadAnalysisModal
          lead={analysisLeads[currentAnalysisIndex]}
          open={isAnalysisMode}
          onOpenChange={(open) => {
            if (!open) {
              setIsAnalysisMode(false);
              setSelectedLeadIds(new Set());
            }
          }}
          onSwipe={(direction) => {
            if (direction === 'left') handleReject();
            else if (direction === 'right') handleApprove();
            else if (direction === 'up') handleSuperApprove();
            else if (direction === 'down') handleSkip();
          }}
          onApprove={handleApprove}
          onReject={handleReject}
          onSuperApprove={handleSuperApprove}
          onSkip={handleSkip}
          disabled={isProcessingAction}
          currentIndex={currentAnalysisIndex}
          totalLeads={analysisLeads.length}
        />
      )}
      
      <TinderCardConfigModal 
        open={configModalOpen} 
        onOpenChange={setConfigModalOpen} 
      />
    </GestaoPageLayout>
  );
}

export default function GestaoLeads() {
  return (
    <LeadColumnConfigProvider>
      <GestaoLeadsContent />
    </LeadColumnConfigProvider>
  );
}
