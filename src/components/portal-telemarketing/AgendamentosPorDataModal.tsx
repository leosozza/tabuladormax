import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Calendar, User, MessageCircle, ClipboardList } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNavigate } from 'react-router-dom';

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

function ModalContent({ 
  agendamentos,
  onNavigate 
}: { 
  agendamentos: AgendamentoPorData[];
  onNavigate: (path: string) => void;
}) {
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
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {lead.scouter && (
                        <span className="text-teal-600 dark:text-teal-400">
                          Scouter: {lead.scouter}
                        </span>
                      )}
                      {lead.telemarketing && (
                        <span className="text-purple-600 dark:text-purple-400">
                          TM: {lead.telemarketing}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate(`/portal-telemarketing/whatsapp?lead=${lead.id}`);
                        }}
                        className="p-1.5 rounded-full hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                        title="Abrir conversa WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate(`/portal-telemarketing/tabulador?lead=${lead.id}`);
                        }}
                        className="p-1.5 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                        title="Abrir tabulador"
                      >
                        <ClipboardList className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </button>
                    </div>
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
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

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
            <ModalContent agendamentos={agendamentos} onNavigate={handleNavigate} />
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
        <ModalContent agendamentos={agendamentos} onNavigate={handleNavigate} />
      </DialogContent>
    </Dialog>
  );
}
