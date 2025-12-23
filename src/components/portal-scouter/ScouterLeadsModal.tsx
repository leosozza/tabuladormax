import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2, MapPin, Calendar, User, Hash, Search, CheckCircle2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useCallback, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { LeadActions } from "./LeadActions";
import { LeadEditModal } from "./LeadEditModal";

interface ScouterLeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  scouterName: string;
  filterType: string;
  filterLabel: string;
  dateFrom: Date | null;
  dateTo: Date | null;
  projectId: string | null;
}

interface LeadData {
  lead_id: number;
  nome_modelo: string | null;
  nome_responsavel: string | null;
  criado: string | null;
  address: string | null;
  etapa_lead: string | null;
  celular: string | null;
  commercial_project_id: string | null;
  // Campos de duplicado (preenchidos após verificação)
  has_duplicate?: boolean;
  is_duplicate_deleted?: boolean;
}

interface DuplicateCheckProgress {
  phase: 'idle' | 'internal' | 'database' | 'complete';
  progress: number;
  message: string;
}

const ITEMS_PER_PAGE = 10;

export function ScouterLeadsModal({
  isOpen,
  onClose,
  scouterName,
  filterType,
  filterLabel,
  dateFrom,
  dateTo,
  projectId,
}: ScouterLeadsModalProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [duplicateStatus, setDuplicateStatus] = useState<Map<number, { has_duplicate: boolean; is_duplicate_deleted: boolean }>>(new Map());
  const [checkProgress, setCheckProgress] = useState<DuplicateCheckProgress>({ phase: 'idle', progress: 0, message: '' });
  const [editingLead, setEditingLead] = useState<LeadData | null>(null);
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

  // Reset estado quando modal fecha ou leads mudam
  useEffect(() => {
    if (!isOpen) {
      setDuplicateStatus(new Map());
      setCheckProgress({ phase: 'idle', progress: 0, message: '' });
      setCurrentPage(1);
    }
  }, [isOpen]);

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

  const totalPages = Math.ceil((leads?.length || 0) / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedLeads = leads?.slice(startIndex, startIndex + ITEMS_PER_PAGE) || [];

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

  const duplicatesCount = duplicateStatus.size;
  const uniqueLeadsCount = (leads?.length || 0) - duplicatesCount;
  const isChecking = checkProgress.phase !== 'idle' && checkProgress.phase !== 'complete';

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
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

        {/* Botão Verificar Duplicados + Progresso - APENAS para Total de Leads */}
        {leads && leads.length > 0 && filterType === 'all' && (
          <div className="flex flex-col gap-2 py-2 border-b border-border">
            <div className="flex items-center gap-3">
              <Button
                variant={checkProgress.phase === 'complete' ? 'secondary' : 'default'}
                size="sm"
                onClick={checkDuplicates}
                disabled={isChecking}
                className="gap-2"
              >
                {isChecking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : checkProgress.phase === 'complete' ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                {checkProgress.phase === 'complete' ? 'Verificado' : 'Verificar Duplicados'}
              </Button>
              
              {checkProgress.phase !== 'idle' && (
                <span className="text-sm text-muted-foreground">
                  {checkProgress.message}
                </span>
              )}
            </div>
            
            {isChecking && (
              <Progress value={checkProgress.progress} className="h-1.5" />
            )}
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
                      <div className="flex items-center gap-2">
                        {renderDuplicateBadge(lead)}
                        <LeadActions
                          lead={lead}
                          onEdit={() => setEditingLead(lead)}
                          onActionComplete={() => {
                            queryClient.invalidateQueries({ queryKey: ['scouter-leads-simple'] });
                          }}
                        />
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
                          {lead.address || '-'}
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
                      <TableCell className="text-sm">
                        {lead.address || '-'}
                      </TableCell>
                      <TableCell>
                        {renderDuplicateBadge(lead)}
                      </TableCell>
                      <TableCell>
                        <LeadActions
                          lead={lead}
                          onEdit={() => setEditingLead(lead)}
                          onActionComplete={() => {
                            queryClient.invalidateQueries({ queryKey: ['scouter-leads-simple'] });
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </div>

        {/* Pagination */}
        {leads && leads.length > ITEMS_PER_PAGE && (
          <div className="flex items-center justify-between pt-4 border-t gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="h-8 px-2 sm:px-3"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Anterior</span>
            </Button>
            <span className="text-xs sm:text-sm text-muted-foreground">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="h-8 px-2 sm:px-3"
            >
              <span className="hidden sm:inline mr-1">Próxima</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
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
    </Dialog>
  );
}
