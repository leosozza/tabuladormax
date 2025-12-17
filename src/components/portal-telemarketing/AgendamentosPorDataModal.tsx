import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Calendar, User, Phone } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface AgendamentoPorData {
  data: string;
  dataFormatada: string;
  total: number;
  leads: {
    id: number;
    name: string;
    scouter: string | null;
    telemarketing: string | null;
  }[];
}

interface AgendamentosPorDataModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agendamentos: AgendamentoPorData[];
  totalAgendamentos: number;
}

export function AgendamentosPorDataModal({
  open,
  onOpenChange,
  agendamentos,
  totalAgendamentos,
}: AgendamentosPorDataModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-orange-500" />
            Agendamentos por Data ({totalAgendamentos} total)
          </DialogTitle>
        </DialogHeader>

        {agendamentos.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nenhum agendamento encontrado
          </p>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {agendamentos.map((item) => (
              <AccordionItem key={item.data} value={item.data}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-orange-600 border-orange-600">
                        {item.dataFormatada}
                      </Badge>
                    </div>
                    <Badge className="bg-orange-500">
                      {item.total} {item.total === 1 ? 'lead' : 'leads'}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <Table className="text-xs sm:text-sm">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Nome</TableHead>
                        <TableHead className="text-xs hidden sm:table-cell">Scouter</TableHead>
                        <TableHead className="text-xs hidden sm:table-cell">Telemarketing</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {item.leads.map((lead) => (
                        <TableRow key={lead.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-1 sm:gap-2">
                              <User className="w-3 sm:w-4 h-3 sm:h-4 text-muted-foreground flex-shrink-0" />
                              <span className="truncate max-w-[150px] sm:max-w-none">{lead.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {lead.scouter ? (
                              <span className="text-teal-600 dark:text-teal-400">{lead.scouter}</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {lead.telemarketing ? (
                              <div className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {lead.telemarketing}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </DialogContent>
    </Dialog>
  );
}
