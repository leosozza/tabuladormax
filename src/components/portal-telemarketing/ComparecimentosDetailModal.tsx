import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, User, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';

export interface ComparecimentoDetail {
  id: number;
  name: string;
  scouter: string | null;
  telemarketing: string | null;
  agendadoEm: string | null;
  dataComparecimento: string;
  fonte: string;
}

interface ComparecimentosDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comparecimentos: ComparecimentoDetail[];
  totalComparecimentos: number;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  try {
    const date = parseISO(dateStr);
    return format(date, "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return dateStr;
  }
}

function ModalContent({ comparecimentos }: { comparecimentos: ComparecimentoDetail[] }) {
  if (comparecimentos.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-8">
        Nenhum comparecimento encontrado no período
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {comparecimentos.map((item) => (
        <div key={item.id} className="p-3 border rounded-lg bg-muted/30 relative">
          <Badge 
            variant="secondary" 
            className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
          >
            {item.fonte}
          </Badge>
          <div className="flex items-center gap-2 pr-20">
            <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="font-medium text-sm truncate">{item.name}</span>
          </div>
          
          <div className="mt-2 space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-green-600 border-green-600">
                Compareceu: {formatDate(item.dataComparecimento)}
              </Badge>
            </div>
            
            {item.agendadoEm && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="w-3 h-3" />
                Agendado em: {formatDate(item.agendadoEm)}
              </div>
            )}
            
            <div className="flex flex-wrap gap-2 text-muted-foreground">
              {item.scouter && (
                <span className="text-teal-600 dark:text-teal-400">
                  Scouter: {item.scouter}
                </span>
              )}
              {item.telemarketing && (
                <span>Telemarketing: {item.telemarketing}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ComparecimentosDetailModal({
  open,
  onOpenChange,
  comparecimentos,
  totalComparecimentos,
}: ComparecimentosDetailModalProps) {
  const isMobile = useIsMobile();

  const title = (
    <div className="flex items-center gap-2">
      <CheckCircle className="w-5 h-5 text-green-500" />
      Comparecimentos ({totalComparecimentos} total)
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
            <ModalContent comparecimentos={comparecimentos} />
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
        <ModalContent comparecimentos={comparecimentos} />
      </DialogContent>
    </Dialog>
  );
}
