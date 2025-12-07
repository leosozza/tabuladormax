import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
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

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {filterLabel}
            {leads && (
              <Badge variant="secondary" className="ml-2">
                {leads.length} leads
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !leads || leads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum lead encontrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">ID</TableHead>
                  <TableHead>Nome do Modelo</TableHead>
                  <TableHead className="w-32">Data Criação</TableHead>
                  <TableHead>Local de Abordagem</TableHead>
                  <TableHead className="w-32">Status</TableHead>
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
                    <TableCell className="text-sm">
                      {lead.criado
                        ? format(new Date(lead.criado), "dd/MM/yyyy", { locale: ptBR })
                        : '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {lead.local_abordagem || '-'}
                    </TableCell>
                    <TableCell>
                      {lead.is_duplicate_deleted ? (
                        <Badge variant="destructive" className="text-xs">
                          Duplicado Excluído
                        </Badge>
                      ) : lead.has_duplicate ? (
                        <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-xs">
                          Duplicado
                        </Badge>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Pagination */}
        {leads && leads.length > ITEMS_PER_PAGE && (
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevPage}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              Página {currentPage} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
            >
              Próxima
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
