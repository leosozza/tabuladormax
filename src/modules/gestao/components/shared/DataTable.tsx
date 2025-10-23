import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ChevronUp, 
  ChevronDown, 
  Search, 
  Filter,
  Download,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  type?: 'text' | 'number' | 'date' | 'status' | 'currency';
  formatter?: (value: any, row?: any) => string | React.ReactNode;
}

interface DataTableProps {
  data: any[];
  columns: Column[];
  title?: string;
  searchable?: boolean;
  exportable?: boolean;
  selectable?: boolean;
  actions?: {
    view?: (item: any) => void;
    edit?: (item: any) => void;
    delete?: (item: any) => void;
  };
  pageSize?: number;
  onSelectionChange?: (selected: any[]) => void;
}

export function DataTable({
  data,
  columns,
  title,
  searchable = true,
  exportable = true,
  selectable = false,
  actions,
  pageSize = 10,
  onSelectionChange
}: DataTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const filteredAndSortedData = useMemo(() => {
    let result = [...data];

    // Apply search
    if (searchTerm) {
      result = result.filter(row =>
        Object.values(row).some(value =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Apply column filters
    Object.entries(filters).forEach(([column, filterValue]) => {
      if (filterValue) {
        result = result.filter(row =>
          String(row[column]).toLowerCase().includes(filterValue.toLowerCase())
        );
      }
    });

    // Apply sorting
    if (sortColumn) {
      result.sort((a, b) => {
        const aValue = a[sortColumn];
        const bValue = b[sortColumn];
        
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, searchTerm, sortColumn, sortDirection, filters]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredAndSortedData.slice(start, end);
  }, [filteredAndSortedData, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredAndSortedData.length / pageSize);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleSelectRow = (row: any) => {
    setSelectedRows(prev => {
      const isSelected = prev.some(selected => selected.id === row.id);
      const newSelection = isSelected 
        ? prev.filter(selected => selected.id !== row.id)
        : [...prev, row];
      
      // Notify parent of selection change
      if (onSelectionChange) {
        onSelectionChange(newSelection);
      }
      
      return newSelection;
    });
  };

  const handleSelectAll = () => {
    const newSelection = selectedRows.length === paginatedData.length ? [] : [...paginatedData];
    setSelectedRows(newSelection);
    
    // Notify parent of selection change
    if (onSelectionChange) {
      onSelectionChange(newSelection);
    }
  };

  const formatCellValue = (value: any, column: Column) => {
    if (column.formatter) {
      return column.formatter(value);
    }

    switch (column.type) {
      case 'currency':
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(value);
      case 'date':
        return new Date(value).toLocaleDateString('pt-BR');
      case 'status':
        return (
          <Badge variant={value === 'active' ? 'default' : 'secondary'}>
            {value}
          </Badge>
        );
      default:
        return String(value);
    }
  };

  const exportToCSV = () => {
    const headers = columns.map(col => col.label).join(',');
    const rows = filteredAndSortedData.map(row =>
      columns.map(col => row[col.key]).join(',')
    ).join('\n');
    
    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title || 'data'}.csv`;
    link.click();
    
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        {title && <h3 className="text-lg font-semibold">{title}</h3>}
        <div className="flex items-center gap-2">
          {exportable && (
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        {searchable && (
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        )}
        
        {columns.filter(col => col.filterable).map(column => (
          <Select
            key={column.key}
            value={filters[column.key] || undefined}
            onValueChange={(value) => 
              setFilters(prev => {
                const newFilters = { ...prev };
                if (value === undefined || value === '' || value === null) {
                  delete newFilters[column.key];
                } else {
                  newFilters[column.key] = value;
                }
                return newFilters;
              })
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder={column.label} />
            </SelectTrigger>
            <SelectContent>
              {Array.from(new Set(data.map(row => row[column.key]))).map(value => (
                <SelectItem key={String(value)} value={String(value)}>
                  {String(value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={selectedRows.length === paginatedData.length}
                    onChange={handleSelectAll}
                    className="rounded"
                  />
                </TableHead>
              )}
              {columns.map(column => (
                <TableHead key={column.key}>
                  <div className="flex items-center gap-2">
                    {column.label}
                    {column.sortable && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort(column.key)}
                        className="h-6 w-6 p-0"
                      >
                        {sortColumn === column.key ? (
                          sortDirection === 'asc' ? 
                            <ChevronUp className="h-4 w-4" /> : 
                            <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronUp className="h-4 w-4 opacity-50" />
                        )}
                      </Button>
                    )}
                  </div>
                </TableHead>
              ))}
              {actions && <TableHead className="w-12">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((row, index) => (
              <TableRow key={row.id || index}>
                {selectable && (
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedRows.some(selected => selected.id === row.id)}
                      onChange={() => handleSelectRow(row)}
                      className="rounded"
                    />
                  </TableCell>
                )}
                {columns.map(column => (
                  <TableCell key={column.key}>
                    {formatCellValue(row[column.key], column)}
                  </TableCell>
                ))}
                {actions && (
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {actions.view && (
                          <DropdownMenuItem onClick={() => actions.view!(row)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver
                          </DropdownMenuItem>
                        )}
                        {actions.edit && (
                          <DropdownMenuItem onClick={() => actions.edit!(row)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                        )}
                        {actions.delete && (
                          <DropdownMenuItem onClick={() => actions.delete!(row)}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {((currentPage - 1) * pageSize) + 1} a {Math.min(currentPage * pageSize, filteredAndSortedData.length)} de {filteredAndSortedData.length} resultados
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Anterior
            </Button>
            <span className="text-sm">
              Página {currentPage} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}