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
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Agendado Em</TableHead>
                <TableHead>Compareceu Em</TableHead>
                <TableHead>Scouter</TableHead>
                <TableHead>Telemarketing</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparecimentos.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      {item.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {formatDate(item.agendadoEm)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      {formatDate(item.dataComparecimento)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {item.scouter ? (
                      <span className="text-teal-600 dark:text-teal-400">{item.scouter}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
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
