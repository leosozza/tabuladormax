/**
 * Componente simples de tabela para uso no Dashboard Builder
 * Aceita colunas e dados dinâmicos
 */

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface SimpleColumn {
  id: string;
  header: string;
  accessorKey: string;
  cell?: (props: { row: any }) => React.ReactNode;
}

interface SimpleDataTableProps {
  columns: SimpleColumn[];
  data: any[];
}

export function SimpleDataTable({ columns, data }: SimpleDataTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.id}>{column.header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                Nenhum resultado encontrado
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {columns.map((column) => (
                  <TableCell key={column.id}>
                    {column.cell
                      ? column.cell({ row: { getValue: (key: string) => row[key] } })
                      : row[column.accessorKey]}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
