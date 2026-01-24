import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  AlertCircle, 
  Calendar, 
  CheckCircle2, 
  RefreshCw, 
  Send, 
  XCircle,
  Filter,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useScouterMessageResend } from '@/hooks/useScouterMessageResend';

export default function ScouterMessageResend() {
  const {
    dateFilter,
    setDateFilter,
    counts,
    leads,
    eligibleLeads,
    isLoading,
    isResending,
    resendAll,
    refetch
  } = useScouterMessageResend();

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [resendProgress, setResendProgress] = useState(0);

  const handleFilter = () => {
    refetch();
  };

  const handleResendAll = async () => {
    setShowConfirmDialog(false);
    setResendProgress(0);
    
    // Simular progresso visual (a edge function processa em background)
    const progressInterval = setInterval(() => {
      setResendProgress(prev => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 5;
      });
    }, 200);

    try {
      await resendAll();
      setResendProgress(100);
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => setResendProgress(0), 1000);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Reenvio de Confirmações - Scouter</h1>
          <p className="text-muted-foreground">
            Reenviar mensagens de confirmação que falharam por saldo insuficiente
          </p>
        </div>
        <Button variant="outline" onClick={refetch} disabled={isLoading}>
          <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
          Atualizar
        </Button>
      </div>

      {/* Filtro de Data */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtrar por Período de Criação
          </CardTitle>
          <CardDescription>
            Selecione o período de criação dos leads para filtrar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            {/* Data Início */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Início</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[200px] justify-start">
                    <Calendar className="h-4 w-4 mr-2" />
                    {dateFilter.dateFrom 
                      ? format(dateFilter.dateFrom, 'dd/MM/yyyy', { locale: ptBR })
                      : 'Selecionar...'
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dateFilter.dateFrom || undefined}
                    onSelect={(date) => setDateFilter(prev => ({ ...prev, dateFrom: date || null }))}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Data Fim */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Fim</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[200px] justify-start">
                    <Calendar className="h-4 w-4 mr-2" />
                    {dateFilter.dateTo 
                      ? format(dateFilter.dateTo, 'dd/MM/yyyy', { locale: ptBR })
                      : 'Selecionar...'
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dateFilter.dateTo || undefined}
                    onSelect={(date) => setDateFilter(prev => ({ ...prev, dateTo: date || null }))}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button onClick={handleFilter} disabled={isLoading}>
              <Filter className="h-4 w-4 mr-2" />
              Filtrar
            </Button>

            {(dateFilter.dateFrom || dateFilter.dateTo) && (
              <Button 
                variant="ghost" 
                onClick={() => {
                  setDateFilter({ dateFrom: null, dateTo: null });
                  setTimeout(refetch, 100);
                }}
              >
                Limpar Filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total com Erro</p>
                <p className="text-3xl font-bold">{counts.total_com_erro}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Podem Reenviar</p>
                <p className="text-3xl font-bold text-primary">{counts.podem_reenviar}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Limite Atingido</p>
                <p className="text-3xl font-bold text-muted-foreground">{counts.limite_atingido}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <XCircle className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Progresso durante Reenvio */}
      {isResending && resendProgress > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processando reenvio em massa...
                </span>
                <span>{resendProgress}%</span>
              </div>
              <Progress value={resendProgress} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Botão de Ação */}
      {counts.total_com_erro > 0 && (
        <div className="flex justify-center">
          <Button 
            size="lg" 
            onClick={() => setShowConfirmDialog(true)}
            disabled={isResending || leads.length === 0}
            className="gap-2"
          >
            {isResending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Send className="h-5 w-5" />
                Reenviar Confirmação para Todos ({counts.total_com_erro})
              </>
            )}
          </Button>
        </div>
      )}

      {/* Tabela de Leads */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Leads com Erro de Envio</CardTitle>
          <CardDescription>
            Leads cujas mensagens de confirmação falharam por saldo insuficiente
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p className="text-lg font-medium">Nenhum lead com erro de envio</p>
              <p className="text-sm">Todas as mensagens foram enviadas com sucesso!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Scouter</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Projeto</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-center">Tentativas</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.lead_id}>
                      <TableCell className="font-medium">{lead.lead_name || 'Sem nome'}</TableCell>
                      <TableCell>{lead.scouter || '-'}</TableCell>
                      <TableCell className="font-mono text-sm">{lead.phone_normalized}</TableCell>
                      <TableCell>{lead.projeto_comercial || '-'}</TableCell>
                      <TableCell>
                        {lead.criado 
                          ? format(new Date(lead.criado), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                          : '-'
                        }
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          "font-medium",
                          lead.total_envios >= 2 ? "text-destructive" : "text-primary"
                        )}>
                          {lead.total_envios}/2
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {lead.pode_reenviar ? (
                          <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Elegível
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <XCircle className="h-3 w-3 mr-1" />
                            Limite
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Confirmação */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Confirmar Reenvio em Massa
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  Você está prestes a reenviar a confirmação para{' '}
                  <strong>{counts.total_com_erro} leads</strong> que falharam por saldo insuficiente.
                </p>
                
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <p className="font-medium">O que vai acontecer:</p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Todos os leads serão movidos para "Triagem"</li>
                    <li>A automação do Bitrix reenviará as mensagens de confirmação</li>
                    <li>Todos serão processados, independente de tentativas anteriores</li>
                  </ul>
                </div>

                <p className="text-sm text-muted-foreground">
                  Esta ação pode levar alguns minutos dependendo da quantidade de leads.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleResendAll}>
              Confirmar Reenvio
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
