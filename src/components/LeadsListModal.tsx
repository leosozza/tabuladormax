import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { User, X, Settings2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
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
  const [visibleColumns, setVisibleColumns] = useState({
    id: true,
    photo: true,
    name: true,
    age: true,
    address: true,
    scouter: true,
    responsible: true,
    updated_at: true,
  });

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
            <div className="flex items-center gap-4">
              <span>Leads - {statusLabel}</span>
              <span className="text-sm font-normal text-muted-foreground">
                {leads.length} {leads.length === 1 ? 'lead' : 'leads'}
              </span>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Settings2 className="w-4 h-4" />
                  Colunas
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 bg-background" align="end">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Colunas Visíveis</h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={visibleColumns.id}
                        onCheckedChange={(checked) => 
                          setVisibleColumns({ ...visibleColumns, id: checked as boolean })
                        }
                      />
                      <span className="text-sm">ID</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={visibleColumns.photo}
                        onCheckedChange={(checked) => 
                          setVisibleColumns({ ...visibleColumns, photo: checked as boolean })
                        }
                      />
                      <span className="text-sm">Foto</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={visibleColumns.name}
                        onCheckedChange={(checked) => 
                          setVisibleColumns({ ...visibleColumns, name: checked as boolean })
                        }
                      />
                      <span className="text-sm">Nome</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={visibleColumns.age}
                        onCheckedChange={(checked) => 
                          setVisibleColumns({ ...visibleColumns, age: checked as boolean })
                        }
                      />
                      <span className="text-sm">Idade</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={visibleColumns.scouter}
                        onCheckedChange={(checked) => 
                          setVisibleColumns({ ...visibleColumns, scouter: checked as boolean })
                        }
                      />
                      <span className="text-sm">Olheiro</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={visibleColumns.address}
                        onCheckedChange={(checked) => 
                          setVisibleColumns({ ...visibleColumns, address: checked as boolean })
                        }
                      />
                      <span className="text-sm">Endereço</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={visibleColumns.responsible}
                        onCheckedChange={(checked) => 
                          setVisibleColumns({ ...visibleColumns, responsible: checked as boolean })
                        }
                      />
                      <span className="text-sm">Operador</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={visibleColumns.updated_at}
                        onCheckedChange={(checked) => 
                          setVisibleColumns({ ...visibleColumns, updated_at: checked as boolean })
                        }
                      />
                      <span className="text-sm">Atualizado</span>
                    </label>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
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
                    {visibleColumns.id && <TableHead>ID</TableHead>}
                    {visibleColumns.photo && <TableHead>Foto</TableHead>}
                    {visibleColumns.name && <TableHead>Nome</TableHead>}
                    {visibleColumns.age && <TableHead>Idade</TableHead>}
                    {visibleColumns.scouter && <TableHead>Olheiro</TableHead>}
                    {visibleColumns.address && <TableHead>Endereço</TableHead>}
                    {visibleColumns.responsible && <TableHead>Operador</TableHead>}
                    {visibleColumns.updated_at && <TableHead>Atualizado</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentLeads.map((lead) => (
                    <TableRow 
                      key={lead.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => navigate(`/lead?id=${lead.id}`)}
                    >
                      {visibleColumns.id && (
                        <TableCell className="font-mono text-sm">{lead.id}</TableCell>
                      )}
                      {visibleColumns.photo && (
                        <TableCell>
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
                        </TableCell>
                      )}
                      {visibleColumns.name && (
                        <TableCell className="font-medium">
                          {lead.name || '—'}
                        </TableCell>
                      )}
                      {visibleColumns.age && (
                        <TableCell>{lead.age ? `${lead.age} anos` : '—'}</TableCell>
                      )}
                      {visibleColumns.scouter && (
                        <TableCell>{lead.scouter || '—'}</TableCell>
                      )}
                      {visibleColumns.address && (
                        <TableCell className="max-w-xs truncate">{lead.address || '—'}</TableCell>
                      )}
                      {visibleColumns.responsible && (
                        <TableCell>{lead.responsible || '—'}</TableCell>
                      )}
                      {visibleColumns.updated_at && (
                        <TableCell className="whitespace-nowrap">
                          {lead.action_created_at 
                            ? format(new Date(lead.action_created_at), 'dd/MM/yyyy HH:mm')
                            : lead.updated_at
                            ? format(new Date(lead.updated_at), 'dd/MM/yyyy HH:mm')
                            : '—'
                          }
                        </TableCell>
                      )}
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
