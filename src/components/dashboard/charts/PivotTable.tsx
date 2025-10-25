/**
 * Componente de Tabela Dinâmica (Pivot Table)
 * Permite agrupamento e agregação dinâmica de dados
 */

import { useMemo, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface PivotTableProps {
  data: any[];
  title?: string;
  description?: string;
}

type AggregationType = 'sum' | 'avg' | 'count' | 'min' | 'max';

export function PivotTable({ data, title, description }: PivotTableProps) {
  // Estado para controlar dimensões e métricas
  const [rowDimension, setRowDimension] = useState<string>('');
  const [columnDimension, setColumnDimension] = useState<string>('');
  const [metric, setMetric] = useState<string>('');
  const [aggregation, setAggregation] = useState<AggregationType>('sum');

  // Extrair colunas dos dados
  const columns = useMemo(() => {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0]);
  }, [data]);

  // Calcular tabela dinâmica
  const pivotData = useMemo(() => {
    if (!data || !rowDimension || !columnDimension || !metric) {
      return { rows: [], columns: [], values: {} };
    }

    const rows = new Set<string>();
    const cols = new Set<string>();
    const values: Record<string, Record<string, number[]>> = {};

    // Coletar dados
    data.forEach(item => {
      const row = String(item[rowDimension] || 'N/A');
      const col = String(item[columnDimension] || 'N/A');
      const val = Number(item[metric]) || 0;

      rows.add(row);
      cols.add(col);

      if (!values[row]) values[row] = {};
      if (!values[row][col]) values[row][col] = [];
      values[row][col].push(val);
    });

    // Aplicar agregação
    const aggregatedValues: Record<string, Record<string, number>> = {};
    Object.keys(values).forEach(row => {
      aggregatedValues[row] = {};
      Object.keys(values[row]).forEach(col => {
        const vals = values[row][col];
        let result = 0;

        switch (aggregation) {
          case 'sum':
            result = vals.reduce((a, b) => a + b, 0);
            break;
          case 'avg':
            result = vals.reduce((a, b) => a + b, 0) / vals.length;
            break;
          case 'count':
            result = vals.length;
            break;
          case 'min':
            result = Math.min(...vals);
            break;
          case 'max':
            result = Math.max(...vals);
            break;
        }

        aggregatedValues[row][col] = result;
      });
    });

    return {
      rows: Array.from(rows).sort(),
      columns: Array.from(cols).sort(),
      values: aggregatedValues,
    };
  }, [data, rowDimension, columnDimension, metric, aggregation]);

  // Calcular totais
  const rowTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    pivotData.rows.forEach(row => {
      let total = 0;
      pivotData.columns.forEach(col => {
        total += pivotData.values[row]?.[col] || 0;
      });
      totals[row] = total;
    });
    return totals;
  }, [pivotData]);

  const columnTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    pivotData.columns.forEach(col => {
      let total = 0;
      pivotData.rows.forEach(row => {
        total += pivotData.values[row]?.[col] || 0;
      });
      totals[col] = total;
    });
    return totals;
  }, [pivotData]);

  const grandTotal = useMemo(() => {
    return Object.values(rowTotals).reduce((a, b) => a + b, 0);
  }, [rowTotals]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title || 'Tabela Dinâmica'}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controles de configuração */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Linhas</label>
            <Select value={rowDimension} onValueChange={setRowDimension}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {columns.map(col => (
                  <SelectItem key={col} value={col}>{col}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Colunas</label>
            <Select value={columnDimension} onValueChange={setColumnDimension}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {columns.map(col => (
                  <SelectItem key={col} value={col}>{col}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Valores</label>
            <Select value={metric} onValueChange={setMetric}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {columns.map(col => (
                  <SelectItem key={col} value={col}>{col}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Agregação</label>
            <Select value={aggregation} onValueChange={(v) => setAggregation(v as AggregationType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sum">Soma</SelectItem>
                <SelectItem value="avg">Média</SelectItem>
                <SelectItem value="count">Contagem</SelectItem>
                <SelectItem value="min">Mínimo</SelectItem>
                <SelectItem value="max">Máximo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabela dinâmica */}
        {pivotData.rows.length > 0 && pivotData.columns.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold">{rowDimension}/{columnDimension}</TableHead>
                  {pivotData.columns.map(col => (
                    <TableHead key={col} className="text-right font-bold">{col}</TableHead>
                  ))}
                  <TableHead className="text-right font-bold bg-muted">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pivotData.rows.map(row => (
                  <TableRow key={row}>
                    <TableCell className="font-medium">{row}</TableCell>
                    {pivotData.columns.map(col => (
                      <TableCell key={col} className="text-right">
                        {(pivotData.values[row]?.[col] || 0).toFixed(2)}
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-bold bg-muted">
                      {rowTotals[row].toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted">
                  <TableCell className="font-bold">Total</TableCell>
                  {pivotData.columns.map(col => (
                    <TableCell key={col} className="text-right font-bold">
                      {columnTotals[col].toFixed(2)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-bold">
                    {grandTotal.toFixed(2)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            Configure as dimensões e métricas para visualizar a tabela dinâmica
          </div>
        )}
      </CardContent>
    </Card>
  );
}
