/**
 * Componente de Tabela Dinâmica (Pivot Table)
 * Permite visualizar dados agregados em duas dimensões
 */

import { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface PivotTableProps {
  data: Record<string, number | string>[];
  rowKey: string;
  columnKey: string;
  valueKey: string;
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  showTotals?: boolean;
  formatValue?: (value: number) => string;
}

export function PivotTable({
  data,
  rowKey,
  columnKey,
  valueKey,
  aggregation = 'sum',
  showTotals = true,
  formatValue = (val) => val.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}: PivotTableProps) {
  const pivotData = useMemo(() => {
    if (!data || data.length === 0) return { rows: [], columns: [], values: {}, rowTotals: {}, columnTotals: {} };

    const rows = new Set<string>();
    const columns = new Set<string>();
    const values: Record<string, Record<string, number[]>> = {};
    const rowTotals: Record<string, number> = {};
    const columnTotals: Record<string, number> = {};
    let grandTotal = 0;

    // Collect all data points
    data.forEach(item => {
      const row = String(item[rowKey] || 'N/A');
      const col = String(item[columnKey] || 'N/A');
      const val = typeof item[valueKey] === 'number' 
        ? item[valueKey] 
        : parseFloat(String(item[valueKey])) || 0;

      rows.add(row);
      columns.add(col);

      if (!values[row]) values[row] = {};
      if (!values[row][col]) values[row][col] = [];
      
      values[row][col].push(val);
    });

    // Calculate aggregated values and totals
    const aggregatedValues: Record<string, Record<string, number>> = {};
    
    Array.from(rows).forEach(row => {
      aggregatedValues[row] = {};
      rowTotals[row] = 0;

      Array.from(columns).forEach(col => {
        const cellValues = values[row]?.[col] || [];
        let aggregatedValue = 0;

        if (cellValues.length > 0) {
          switch (aggregation) {
            case 'sum':
              aggregatedValue = cellValues.reduce((sum, val) => sum + val, 0);
              break;
            case 'avg':
              aggregatedValue = cellValues.reduce((sum, val) => sum + val, 0) / cellValues.length;
              break;
            case 'count':
              aggregatedValue = cellValues.length;
              break;
            case 'min':
              aggregatedValue = Math.min(...cellValues);
              break;
            case 'max':
              aggregatedValue = Math.max(...cellValues);
              break;
          }
        }

        aggregatedValues[row][col] = aggregatedValue;
        rowTotals[row] += aggregatedValue;
        columnTotals[col] = (columnTotals[col] || 0) + aggregatedValue;
        grandTotal += aggregatedValue;
      });
    });

    return {
      rows: Array.from(rows).sort(),
      columns: Array.from(columns).sort(),
      values: aggregatedValues,
      rowTotals,
      columnTotals,
      grandTotal
    };
  }, [data, rowKey, columnKey, valueKey, aggregation]);

  if (pivotData.rows.length === 0 || pivotData.columns.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Dados insuficientes para tabela dinâmica
      </div>
    );
  }

  return (
    <div className="w-full overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-bold sticky left-0 bg-background z-10">
              {rowKey}
            </TableHead>
            {pivotData.columns.map(col => (
              <TableHead key={col} className="text-center font-semibold">
                {col}
              </TableHead>
            ))}
            {showTotals && (
              <TableHead className="text-center font-bold bg-muted">
                Total
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {pivotData.rows.map(row => (
            <TableRow key={row}>
              <TableCell className="font-medium sticky left-0 bg-background">
                {row}
              </TableCell>
              {pivotData.columns.map(col => {
                const value = pivotData.values[row]?.[col] || 0;
                return (
                  <TableCell 
                    key={col} 
                    className={cn(
                      "text-center",
                      value > 0 && "font-medium"
                    )}
                  >
                    {value > 0 ? formatValue(value) : '-'}
                  </TableCell>
                );
              })}
              {showTotals && (
                <TableCell className="text-center font-bold bg-muted">
                  {formatValue(pivotData.rowTotals[row])}
                </TableCell>
              )}
            </TableRow>
          ))}
          {showTotals && (
            <TableRow className="bg-muted font-bold">
              <TableCell className="sticky left-0 bg-muted">Total</TableCell>
              {pivotData.columns.map(col => (
                <TableCell key={col} className="text-center">
                  {formatValue(pivotData.columnTotals[col] || 0)}
                </TableCell>
              ))}
              <TableCell className="text-center">
                {formatValue(pivotData.grandTotal)}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
