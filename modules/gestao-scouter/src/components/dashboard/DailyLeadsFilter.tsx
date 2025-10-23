// @ts-nocheck

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Eye } from "lucide-react";
import { format } from "date-fns";
import { formatBRL } from "@/utils/currency";
import { getValorFichaFromRow } from "@/utils/values";
import type { Ficha } from "@/repositories/types";

interface DailyLeadsFilterProps {
  leads: Lead[];
  selectedPeriod: { start: string; end: string } | null;
}

export const DailyLeadsFilter = ({ leads, selectedPeriod }: DailyLeadsFilterProps) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Agrupar leads por data
  const leadsPorDia = leads.reduce((acc, ficha) => {
    const dataCriado = ficha.Criado;
    if (!dataCriado) return acc;

    let dateKey;
    if (typeof dataCriado === 'string' && dataCriado.includes('/')) {
      const [day, month, year] = dataCriado.split('/');
      dateKey = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    } else {
      const date = new Date(dataCriado);
      dateKey = format(date, 'yyyy-MM-dd');
    }

    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(ficha);
    return acc;
  }, {} as Record<string, Lead[]>);

  // Ordenar datas
  const datasOrdenadas = Object.keys(fichasPorDia).sort().reverse();

  // Leads do dia selecionado
  const leadsDoDay = selectedDate ? leadsPorDia[selectedDate] || [] : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Leads por Dia
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-60 overflow-y-auto">
          {datasOrdenadas.map((data) => {
            const leadsDoDia = leadsPorDia[data];
            
            console.log(`=== DEBUG DIA ${data} ===`);
            console.log(`Total leads do dia: ${fichasDoDia.length}`);
            
            // Separar leads pagas e a pagar
            const leadsPagas = leadsDoDia.filter(f => f['Ficha paga'] === 'Sim');
            const leadsAPagar = leadsDoDia.filter(f => f['Ficha paga'] !== 'Sim');
            
            console.log(`Fichas pagas: ${fichasPagas.length}`);
            console.log(`Fichas a pagar: ${leadsAPagar.length}`);
            
            // ANÁLISE DETALHADA DOS VALORES
            console.log('=== ANÁLISE DE VALORES ===');
            
            const valorPago = leadsPagas.reduce((total, ficha, index) => {
              const valor = getValorFichaFromRow(ficha);
              if (index < 3) { // Log das primeiras 3 leads pagas
                console.log(`Paga ${index + 1}: ID ${ficha.ID}, Valor: ${valor}`);
              }
              return total + valor;
            }, 0);
            
            const valorAPagar = leadsAPagar.reduce((total, ficha, index) => {
              const valor = getValorFichaFromRow(ficha);
              if (index < 3) { // Log das primeiras 3 leads a pagar
                console.log(`A pagar ${index + 1}: ID ${ficha.ID}, Valor: ${valor}`);
              }
              return total + valor;
            }, 0);
            
            const valorTotal = valorPago + valorAPagar;

            console.log(`TOTAIS DO DIA ${data}:`);
            console.log(`  Valor pago: R$ ${valorPago}`);
            console.log(`  Valor a pagar: R$ ${valorAPagar}`);
            console.log(`  Valor total: R$ ${valorTotal}`);
            
            // VERIFICAÇÃO DE CONSISTÊNCIA
            const expectedTotal = leadsDoDia.length * 6;
            if (Math.abs(valorTotal - expectedTotal) > 0.01) {
              console.warn(`⚠️ INCONSISTÊNCIA NO DIA ${data}:`);
              console.warn(`  Esperado: R$ ${expectedTotal} (${fichasDoDia.length} x R$ 6,00)`);
              console.warn(`  Calculado: R$ ${valorTotal}`);
              console.warn(`  Diferença: R$ ${(valorTotal - expectedTotal).toFixed(2)}`);
            }

            return (
              <Dialog key={data}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-auto p-3 flex flex-col items-center gap-1 hover:bg-accent"
                  >
                    <div className="text-xs font-medium">
                      {format(new Date(data), 'dd/MM')}
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {fichasDoDia.length} leads
                    </Badge>
                    <div className="text-xs text-muted-foreground">
                      {formatBRL(valorTotal)}
                    </div>
                    <div className="text-xs space-y-0.5">
                      <div className="text-green-600">
                        Pagas: {formatBRL(valorPago)}
                      </div>
                      <div className="text-orange-600">
                        A pagar: {formatBRL(valorAPagar)}
                      </div>
                    </div>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                      <span>Fichas de {format(new Date(data), 'dd/MM/yyyy')}</span>
                      <div className="flex gap-4 text-sm">
                        <span className="text-green-600">
                          {fichasPagas.length} pagas ({formatBRL(valorPago)})
                        </span>
                        <span className="text-orange-600">
                          {leadsAPagar.length} a pagar ({formatBRL(valorAPagar)})
                        </span>
                      </div>
                    </DialogTitle>
                  </DialogHeader>
                  <div className="mt-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Scouter</TableHead>
                          <TableHead>Projeto</TableHead>
                          <TableHead>Nome</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fichasDoDia.map((ficha) => (
                          <TableRow key={ficha.ID}>
                            <TableCell className="font-mono text-xs">{ficha.ID}</TableCell>
                            <TableCell>{ficha['Gestão de Scouter'] || 'N/A'}</TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {ficha['Projetos Cormeciais'] || 'N/A'}
                            </TableCell>
                            <TableCell>{ficha['Primeiro nome'] || 'N/A'}</TableCell>
                            <TableCell>{formatBRL(getValorFichaFromRow(ficha))}</TableCell>
                            <TableCell>
                              <Badge variant={ficha['Ficha paga'] === 'Sim' ? 'default' : 'secondary'}>
                                {ficha['Ficha paga'] || 'Não'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </DialogContent>
              </Dialog>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
