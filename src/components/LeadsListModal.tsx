import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { User, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LeadWithDetails } from "@/types/filters";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LeadsListModalProps {
  isOpen: boolean;
  onClose: () => void;
  leads: LeadWithDetails[];
  statusLabel: string;
  loading?: boolean;
}

export function LeadsListModal({ isOpen, onClose, leads, statusLabel, loading }: LeadsListModalProps) {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const totalPages = Math.ceil(leads.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentLeads = leads.slice(startIndex, endIndex);

  const handleClose = () => {
    setCurrentPage(1);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Leads - {statusLabel}</span>
            <span className="text-sm font-normal text-muted-foreground">
              {leads.length} {leads.length === 1 ? 'lead' : 'leads'}
            </span>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">
            Carregando...
          </div>
        ) : leads.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            Nenhum lead encontrado para este status.
          </div>
        ) : (
          <>
            <ScrollArea className="h-[400px] w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Idade</TableHead>
                    <TableHead>Endereço</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Atualizado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentLeads.map((lead) => (
                    <TableRow 
                      key={lead.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => navigate(`/lead?id=${lead.id}`)}
                    >
                      <TableCell>{lead.id}</TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {lead.photo_url ? (
                            <img 
                              src={lead.photo_url} 
                              alt={lead.name || ''} 
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                              <User className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                          {lead.name || '—'}
                        </div>
                      </TableCell>
                      <TableCell>{lead.age ? `${lead.age} anos` : '—'}</TableCell>
                      <TableCell className="max-w-xs truncate">{lead.address || '—'}</TableCell>
                      <TableCell>{lead.responsible || '—'}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {lead.action_created_at 
                          ? format(new Date(lead.action_created_at), 'dd/MM/yyyy HH:mm')
                          : lead.updated_at
                          ? format(new Date(lead.updated_at), 'dd/MM/yyyy HH:mm')
                          : '—'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <div className="text-sm text-muted-foreground">
                  Página {currentPage} de {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
