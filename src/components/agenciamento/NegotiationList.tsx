// Negotiation List Component
// Tabular view of negotiations with sorting and filtering

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Edit, Trash2, CheckCircle, XCircle, Eye } from 'lucide-react';
import type { Negotiation } from '@/types/agenciamento';
import { NEGOTIATION_STATUS_CONFIG } from '@/types/agenciamento';

interface NegotiationListProps {
  negotiations: Negotiation[];
  onView: (negotiation: Negotiation) => void;
  onEdit: (negotiation: Negotiation) => void;
  onDelete: (id: string) => void;
  onApprove: (id: string) => void;
  onComplete: (id: string) => void;
  onCancel: (id: string) => void;
}

export function NegotiationList({
  negotiations,
  onView,
  onEdit,
  onDelete,
  onApprove,
  onComplete,
  onCancel,
}: NegotiationListProps) {
  const [sortField, setSortField] = useState<keyof Negotiation>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: keyof Negotiation) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedNegotiations = [...negotiations].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];

    if (aValue === bValue) return 0;
    
    const comparison = aValue > bValue ? 1 : -1;
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead
              className="cursor-pointer hover:bg-muted"
              onClick={() => handleSort('title')}
            >
              Título {sortField === 'title' && (sortDirection === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-muted"
              onClick={() => handleSort('client_name')}
            >
              Cliente {sortField === 'client_name' && (sortDirection === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-muted"
              onClick={() => handleSort('status')}
            >
              Status {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-muted text-right"
              onClick={() => handleSort('total_value')}
            >
              Valor Total {sortField === 'total_value' && (sortDirection === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-muted"
              onClick={() => handleSort('negotiation_date')}
            >
              Data {sortField === 'negotiation_date' && (sortDirection === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead className="w-[70px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedNegotiations.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                Nenhuma negociação encontrada
              </TableCell>
            </TableRow>
          ) : (
            sortedNegotiations.map((negotiation) => {
              const statusConfig = NEGOTIATION_STATUS_CONFIG[negotiation.status];
              return (
                <TableRow
                  key={negotiation.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onView(negotiation)}
                >
                  <TableCell className="font-medium">{negotiation.title}</TableCell>
                  <TableCell>{negotiation.client_name}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      style={{
                        borderColor: statusConfig.color,
                        color: statusConfig.color,
                      }}
                    >
                      {statusConfig.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    R$ {negotiation.total_value.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {new Date(negotiation.negotiation_date).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onView(negotiation)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(negotiation)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        {negotiation.status === 'atendimento_produtor' && (
                          <>
                            <DropdownMenuItem onClick={() => onApprove(negotiation.id)}>
                              <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                              Marcar como Realizado
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onCancel(negotiation.id)}>
                              <XCircle className="mr-2 h-4 w-4 text-red-600" />
                              Marcar como Não Realizado
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDelete(negotiation.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
