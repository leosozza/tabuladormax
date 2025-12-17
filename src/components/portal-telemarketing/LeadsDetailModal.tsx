import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Phone, CheckCircle, Calendar, FileText } from 'lucide-react';
import { getEtapaStyle } from '@/lib/etapaColors';
import type { LeadDetail } from '@/hooks/useTelemarketingMetrics';

export type KpiType = 'leads' | 'confirmadas' | 'agendados' | 'tabulacao';

interface LeadsDetailModalProps {
  open: boolean;
  onClose: () => void;
  leads: LeadDetail[];
  type: KpiType;
  title: string;
  filterStatus?: string;
}

const typeIcons = {
  leads: Phone,
  confirmadas: CheckCircle,
  agendados: Calendar,
  tabulacao: FileText,
};

const typeColors = {
  leads: 'text-blue-500',
  confirmadas: 'text-green-500',
  agendados: 'text-orange-500',
  tabulacao: 'text-purple-500',
};

export function LeadsDetailModal({ 
  open, 
  onClose, 
  leads, 
  type, 
  title,
  filterStatus 
}: LeadsDetailModalProps) {
  const Icon = typeIcons[type];
  const iconColor = typeColors[type];

  // Filter leads based on type
  const filteredLeads = leads.filter(lead => {
    switch (type) {
      case 'leads':
        return true; // All leads
      case 'confirmadas':
        return lead.fichaConfirmada;
      case 'agendados':
        return !!lead.dataAgendamento;
      case 'tabulacao':
        return filterStatus ? lead.statusLabel === filterStatus : true;
      default:
        return true;
    }
  });

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Icon className={`w-5 h-5 ${iconColor}`} />
            {title} ({filteredLeads.length})
          </SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-120px)]">
          {filteredLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Icon className="w-12 h-12 mb-4 opacity-50" />
              <p>Nenhum lead encontrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">ID</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telemarketing</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => {
                  const statusStyle = getEtapaStyle(lead.status);
                  return (
                    <TableRow key={lead.id}>
                      <TableCell className="font-mono text-xs">
                        {lead.id}
                      </TableCell>
                      <TableCell className="font-medium max-w-[150px] truncate">
                        {lead.name}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[120px] truncate">
                        {lead.operatorName}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary" 
                          className={`${statusStyle.bg} ${statusStyle.text} text-xs`}
                        >
                          {lead.statusLabel}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
