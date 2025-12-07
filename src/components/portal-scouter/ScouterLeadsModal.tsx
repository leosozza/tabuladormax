import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2, MapPin, Calendar, User, Hash } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

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
  id: number;
  nome_modelo: string | null;
  criado: string | null;
  local_abordagem: string | null;
  etapa: string | null;
  has_duplicate: boolean;
  is_duplicate_deleted: boolean;
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

  const { data: leads, isLoading } = useQuery({
    queryKey: ['scouter-leads', scouterName, filterType, dateFrom, dateTo, projectId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_scouter_leads', {
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

  const totalPages = Math.ceil((leads?.length || 0) / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedLeads = leads?.slice(startIndex, startIndex + ITEMS_PER_PAGE) || [];

  const handlePrevPage = () => setCurrentPage((prev) => Math.max(1, prev - 1));
  const handleNextPage = () => setCurrentPage((prev) => Math.min(totalPages, prev + 1));

  // Reset page when modal opens
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
      setCurrentPage(1);
    }
  };

  const renderDuplicateBadge = (lead: LeadData) => {
    if (lead.is_duplicate_deleted) {
      return (
        <Badge variant="destructive" className="text-xs whitespace-nowrap">
          Duplicado Excluído
        </Badge>
      );
    }
    if (lead.has_duplicate) {
      return (
        <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-xs whitespace-nowrap">
          Duplicado
        </Badge>
      );
    }
    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[95vw] max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 text-base sm:text-lg">
            {filterLabel}
            {leads && (
              <Badge variant="secondary" className="ml-1">
                {leads.length} leads
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

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
                    key={lead.id} 
                    className="bg-muted/50 rounded-lg p-3 border border-border"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Hash className="h-3 w-3" />
                        <span className="font-mono">{lead.id}</span>
                      </div>
                      {renderDuplicateBadge(lead)}
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
                          {lead.local_abordagem || '-'}
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
                    <TableHead className="w-36">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLeads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-mono text-xs">
                        {lead.id}
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
                        {lead.local_abordagem || '-'}
                      </TableCell>
                      <TableCell>
                        {renderDuplicateBadge(lead)}
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
    </Dialog>
  );
}
