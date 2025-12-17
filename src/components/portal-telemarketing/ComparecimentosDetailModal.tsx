import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, User, Calendar, Phone } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface ComparecimentoDetail {
  id: number;
  name: string;
  scouter: string | null;
  telemarketing: string | null;
  agendadoEm: string | null;
  dataComparecimento: string;
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

export function ComparecimentosDetailModal({
  open,
  onOpenChange,
  comparecimentos,
  totalComparecimentos,
}: ComparecimentosDetailModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Comparecimentos ({totalComparecimentos} total)
          </DialogTitle>
        </DialogHeader>

        {comparecimentos.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nenhum comparecimento encontrado no período
          </p>
        ) : (
          <Table className="text-xs sm:text-sm">
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Nome</TableHead>
                <TableHead className="text-xs hidden sm:table-cell">Agendado Em</TableHead>
                <TableHead className="text-xs">Compareceu Em</TableHead>
                <TableHead className="text-xs hidden sm:table-cell">Scouter</TableHead>
                <TableHead className="text-xs hidden sm:table-cell">Telemarketing</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparecimentos.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <User className="w-3 sm:w-4 h-3 sm:h-4 text-muted-foreground flex-shrink-0" />
                      <span className="truncate max-w-[100px] sm:max-w-none">{item.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {formatDate(item.agendadoEm)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-green-600 border-green-600 text-[10px] sm:text-xs">
                      {formatDate(item.dataComparecimento)}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {item.scouter ? (
                      <span className="text-teal-600 dark:text-teal-400">{item.scouter}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {item.telemarketing ? (
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {item.telemarketing}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
