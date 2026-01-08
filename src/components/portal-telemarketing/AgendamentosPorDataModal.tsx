import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Calendar, User, Phone } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

export interface AgendamentoPorData {
  data: string;
  dataFormatada: string;
  total: number;
  leads: {
    id: number;
    name: string;
    scouter: string | null;
    telemarketing: string | null;
    fonte: string;
  }[];
}

interface AgendamentosPorDataModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agendamentos: AgendamentoPorData[];
  totalAgendamentos: number;
}

function ModalContent({ agendamentos }: { agendamentos: AgendamentoPorData[] }) {
  if (agendamentos.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-8">
        Nenhum agendamento encontrado
      </p>
    );
  }

  return (
    <Accordion type="single" collapsible className="w-full">
      {agendamentos.map((item) => (
        <AccordionItem key={item.data} value={item.data}>
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center justify-between w-full pr-4">
              <Badge variant="outline" className="text-orange-600 border-orange-600">
                {item.dataFormatada}
              </Badge>
              <Badge className="bg-orange-500">
                {item.total} {item.total === 1 ? 'lead' : 'leads'}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              {item.leads.map((lead) => (
                <div key={lead.id} className="p-3 border rounded-lg bg-muted/30 relative">
                  <Badge 
                    variant="secondary" 
                    className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                  >
                    {lead.fonte}
                  </Badge>
                  <div className="flex items-center gap-2 pr-20">
                    <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="font-medium text-sm truncate">{lead.name}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {lead.scouter && (
                      <span className="text-teal-600 dark:text-teal-400">
                        Scouter: {lead.scouter}
                      </span>
                    )}
                    {lead.telemarketing && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {lead.telemarketing}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

export function AgendamentosPorDataModal({
  open,
  onOpenChange,
  agendamentos,
  totalAgendamentos,
}: AgendamentosPorDataModalProps) {
  const isMobile = useIsMobile();

  const title = (
    <div className="flex items-center gap-2">
      <Calendar className="w-5 h-5 text-orange-500" />
      Agendamentos por Data ({totalAgendamentos} total)
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>{title}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 overflow-y-auto">
            <ModalContent agendamentos={agendamentos} />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <ModalContent agendamentos={agendamentos} />
      </DialogContent>
    </Dialog>
  );
}
