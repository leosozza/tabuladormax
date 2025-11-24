import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useLeadResyncJobs, JobFilters } from '@/hooks/useLeadResyncJobs';
import { useResyncFieldMappings } from '@/hooks/useResyncFieldMappings';
import { AdminPageLayout } from '@/components/layouts/AdminPageLayout';
import { ResyncFieldMappingDialog } from '@/components/resync/ResyncFieldMappingDialog';
import { Play, Pause, Loader2, CheckCircle2, XCircle, Clock, AlertCircle, Ban, Trash2, Settings, Download, FileText, AlertTriangle, CalendarIcon } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function LeadResync() {
  const { jobs, isLoading, createJob, pauseJob, resumeJob, cancelJob, deleteJob, isCreating, isCancelling, isDeleting } = useLeadResyncJobs();
  const { mappingNames } = useResyncFieldMappings();
  
  const [filters, setFilters] = useState<JobFilters>({
    addressNull: true,
    phoneNull: true,
    valorNull: true,
    responsibleNull: false
  });
  
  const [batchSize, setBatchSize] = useState(50);
  const [selectedMappingName, setSelectedMappingName] = useState<string>('');
  const [selectedMappingId, setSelectedMappingId] = useState<string | undefined>(undefined);
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showErrorsSheet, setShowErrorsSheet] = useState(false);
  const [selectedJobErrors, setSelectedJobErrors] = useState<any>(null);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  const activeJob = jobs.find(j => j.status === 'running' || j.status === 'paused');
  const completedJobs = jobs.filter(j => ['completed', 'failed', 'cancelled'].includes(j.status));

  const handleStartResync = () => {
    if (!selectedMappingId) return;
    setShowConfirmDialog(true);
  };

  const confirmStartResync = () => {
    if (!selectedMappingId) return;
    createJob({ 
      filters: {
        ...filters,
        dateFrom: dateRange.from?.toISOString(),
        dateTo: dateRange.to?.toISOString()
      }, 
      batchSize, 
      mappingId: selectedMappingId 
    });
    setShowConfirmDialog(false);
  };

  const downloadErrorLog = (errorDetails: any, jobId: string) => {
    const blob = new Blob([JSON.stringify(errorDetails, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resync-errors-${jobId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getErrorRate = (errorLeads: number, processedLeads: number) => {
    if (processedLeads === 0) return '0.0';
    return ((errorLeads / processedLeads) * 100).toFixed(1);
  };

  const getSuccessRate = (updatedLeads: number, processedLeads: number) => {
    if (processedLeads === 0) return '0.0';
    return ((updatedLeads / processedLeads) * 100).toFixed(1);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any; label: string }> = {
      running: { variant: 'default', icon: <Loader2 className="w-3 h-3 animate-spin" />, label: 'Rodando' },
      paused: { variant: 'secondary', icon: <Pause className="w-3 h-3" />, label: 'Pausado' },
      completed: { variant: 'default', icon: <CheckCircle2 className="w-3 h-3" />, label: 'Completo' },
      failed: { variant: 'destructive', icon: <XCircle className="w-3 h-3" />, label: 'Falhou' },
      cancelled: { variant: 'outline', icon: <Ban className="w-3 h-3" />, label: 'Cancelado' },
      pending: { variant: 'outline', icon: <Clock className="w-3 h-3" />, label: 'Pendente' }
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant} className="flex items-center gap-1">{config.icon}{config.label}</Badge>;
  };

  const getFiltersSummary = (filters: JobFilters) => {
    const activeFilters = [];
    if (filters.addressNull) activeFilters.push('Endereço NULL');
    if (filters.phoneNull) activeFilters.push('Telefone NULL');
    if (filters.valorNull) activeFilters.push('Valor NULL');
    if (filters.responsibleNull) activeFilters.push('Responsável NULL');
    
    if (filters.dateFrom && filters.dateTo) {
      const from = format(new Date(filters.dateFrom), "dd/MM/yyyy", { locale: ptBR });
      const to = format(new Date(filters.dateTo), "dd/MM/yyyy", { locale: ptBR });
      activeFilters.push(`Período: ${from} - ${to}`);
    } else if (filters.dateFrom) {
      const from = format(new Date(filters.dateFrom), "dd/MM/yyyy", { locale: ptBR });
      activeFilters.push(`A partir de: ${from}`);
    } else if (filters.dateTo) {
      const to = format(new Date(filters.dateTo), "dd/MM/yyyy", { locale: ptBR });
      activeFilters.push(`Até: ${to}`);
    }
    
    return activeFilters.length > 0 ? activeFilters.join(', ') : 'Nenhum filtro';
  };

  return (
    <AdminPageLayout title="Resincronização de Leads" description="Atualizar leads do Bitrix com campos incompletos">
      <div className="space-y-6">
        {activeJob && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Resincronização em Andamento</CardTitle>
                  <CardDescription>Batch {activeJob.current_batch} • {activeJob.processed_leads.toLocaleString()} / {activeJob.total_leads.toLocaleString()} leads</CardDescription>
                </div>
                {getStatusBadge(activeJob.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={(activeJob.processed_leads / activeJob.total_leads) * 100} />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Atualizados</div>
                  <div className="text-2xl font-bold text-green-600">{activeJob.updated_leads.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Ignorados</div>
                  <div className="text-2xl font-bold text-muted-foreground">{activeJob.skipped_leads.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Erros</div>
                  <div className="text-2xl font-bold text-destructive">{activeJob.error_leads.toLocaleString()}</div>
                  {activeJob.processed_leads > 0 && <div className="text-xs text-muted-foreground">Taxa: {getErrorRate(activeJob.error_leads, activeJob.processed_leads)}%</div>}
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Progresso</div>
                  <div className="text-2xl font-bold">{((activeJob.processed_leads / activeJob.total_leads) * 100).toFixed(1)}%</div>
                </div>
              </div>
              {activeJob.error_leads > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Erros Detectados</AlertTitle>
                  <AlertDescription className="space-y-2">
                    <p>{activeJob.error_leads} lead(s) com erro. Taxa: {getErrorRate(activeJob.error_leads, activeJob.processed_leads)}%</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setSelectedJobErrors(activeJob.error_details); setShowErrorsSheet(true); }}>
                        <FileText className="w-3 h-3 mr-1" />Ver Todos
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => downloadErrorLog(activeJob.error_details, activeJob.id)}>
                        <Download className="w-3 h-3 mr-1" />Baixar
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
              <div className="flex gap-2">
                {activeJob.status === 'running' && <Button onClick={() => pauseJob(activeJob.id)} variant="outline"><Pause className="w-4 h-4 mr-2" />Pausar</Button>}
                {activeJob.status === 'paused' && <Button onClick={() => resumeJob(activeJob.id)}><Play className="w-4 h-4 mr-2" />Retomar</Button>}
                <Button onClick={() => cancelJob(activeJob.id)} variant="destructive" disabled={isCancelling}>
                  {isCancelling ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Ban className="w-4 h-4 mr-2" />}Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!activeJob && (
          <Card>
            <CardHeader>
              <CardTitle>Nova Resincronização</CardTitle>
              <CardDescription>Configure os filtros e inicie uma nova resincronização</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert><AlertCircle className="h-4 w-4" /><AlertTitle>Ordem de Processamento</AlertTitle><AlertDescription>Os leads serão processados do <strong>mais recente</strong> (ID maior) para o <strong>mais antigo</strong> (ID menor).</AlertDescription></Alert>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-semibold mb-3 block">Filtros de Seleção</Label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2"><Checkbox id="addressNull" checked={filters.addressNull} onCheckedChange={(checked) => setFilters(prev => ({ ...prev, addressNull: checked as boolean }))} /><Label htmlFor="addressNull" className="cursor-pointer">Endereço NULL ou vazio</Label></div>
                    <div className="flex items-center space-x-2"><Checkbox id="phoneNull" checked={filters.phoneNull} onCheckedChange={(checked) => setFilters(prev => ({ ...prev, phoneNull: checked as boolean }))} /><Label htmlFor="phoneNull" className="cursor-pointer">Telefone NULL ou vazio</Label></div>
                    <div className="flex items-center space-x-2"><Checkbox id="valorNull" checked={filters.valorNull} onCheckedChange={(checked) => setFilters(prev => ({ ...prev, valorNull: checked as boolean }))} /><Label htmlFor="valorNull" className="cursor-pointer">Valor da Ficha NULL ou 0</Label></div>
                    <div className="flex items-center space-x-2"><Checkbox id="responsibleNull" checked={filters.responsibleNull} onCheckedChange={(checked) => setFilters(prev => ({ ...prev, responsibleNull: checked as boolean }))} /><Label htmlFor="responsibleNull" className="cursor-pointer">Responsável NULL ou vazio</Label></div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Período de Criação do Lead</Label>
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "flex-1 justify-start text-left font-normal",
                            !dateRange.from && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateRange.from ? format(dateRange.from, "dd/MM/yyyy", { locale: ptBR }) : "Data início"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateRange.from}
                          onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>

                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "flex-1 justify-start text-left font-normal",
                            !dateRange.to && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateRange.to ? format(dateRange.to, "dd/MM/yyyy", { locale: ptBR }) : "Data fim"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateRange.to}
                          onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                          disabled={(date) => dateRange.from ? date < dateRange.from : false}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground flex-1">
                      Filtrar por data de criação do lead
                    </p>
                    {(dateRange.from || dateRange.to) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDateRange({})}
                        className="h-auto py-1 px-2"
                      >
                        Limpar
                      </Button>
                    )}
                  </div>
                </div>
                
                <div><Label htmlFor="batchSize">Tamanho do Batch</Label><Input id="batchSize" type="number" value={batchSize} onChange={(e) => setBatchSize(parseInt(e.target.value))} min={1} max={200} /><p className="text-sm text-muted-foreground mt-1">Leads processados por vez (recomendado: 50)</p></div>
                <div>
                  <div className="flex items-center justify-between mb-2"><Label>Mapeamento de Campos</Label><Button variant="ghost" size="sm" onClick={() => setShowMappingDialog(true)}><Settings className="w-4 h-4 mr-1" />Gerenciar</Button></div>
                  <Select value={selectedMappingName} onValueChange={(value) => { setSelectedMappingName(value); const mapping = mappingNames?.find(m => m.name === value); setSelectedMappingId(mapping?.id); }}>
                    <SelectTrigger><SelectValue placeholder="Selecione um mapeamento" /></SelectTrigger>
                    <SelectContent>{mappingNames?.map((mapping) => <SelectItem key={mapping.id} value={mapping.name}>{mapping.name}</SelectItem>) || []}</SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-1">Defina quais campos serão atualizados do Bitrix</p>
                </div>
              </div>
              <Button onClick={handleStartResync} disabled={!selectedMappingId || isCreating} className="w-full">{isCreating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Iniciando...</> : <><Play className="w-4 h-4 mr-2" />Iniciar Resincronização</>}</Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Histórico de Resincronizações</CardTitle><CardDescription>Jobs completados, cancelados ou com falha</CardDescription></CardHeader>
          <CardContent>
            {isLoading ? <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div> : completedJobs.length === 0 ? <div className="text-center py-8 text-muted-foreground">Nenhum histórico disponível</div> : (
              <Table>
                <TableHeader><TableRow><TableHead>Status</TableHead><TableHead>Iniciado</TableHead><TableHead className="text-right">Processados</TableHead><TableHead className="text-right">Atualizados</TableHead><TableHead className="text-right">Erros</TableHead><TableHead className="text-right">Taxa Sucesso</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                <TableBody>
                  {completedJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>{getStatusBadge(job.status)}</TableCell>
                      <TableCell>{job.started_at ? formatDistanceToNow(new Date(job.started_at), { addSuffix: true, locale: ptBR }) : '-'}</TableCell>
                      <TableCell className="text-right">{job.processed_leads.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-green-600 font-medium">{job.updated_leads.toLocaleString()}</TableCell>
                      <TableCell className="text-right"><span className={job.error_leads > 0 ? 'text-destructive font-medium' : ''}>{job.error_leads.toLocaleString()}</span>{job.error_leads > 0 && <span className="text-xs text-muted-foreground block">({getErrorRate(job.error_leads, job.processed_leads)}%)</span>}</TableCell>
                      <TableCell className="text-right"><span className="font-medium">{getSuccessRate(job.updated_leads, job.processed_leads)}%</span></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {job.error_details && job.error_details.length > 0 && <><Button variant="ghost" size="sm" onClick={() => { setSelectedJobErrors(job.error_details); setShowErrorsSheet(true); }}><FileText className="w-3 h-3" /></Button><Button variant="ghost" size="sm" onClick={() => downloadErrorLog(job.error_details, job.id)}><Download className="w-3 h-3" /></Button></>}<Button variant="ghost" size="sm" onClick={() => deleteJob(job.id)} disabled={isDeleting}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Confirmar Resincronização</DialogTitle><DialogDescription>Revise as configurações antes de iniciar</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <Alert><AlertCircle className="h-4 w-4" /><AlertTitle>Ordem de Processamento</AlertTitle><AlertDescription>Os leads serão processados do <strong>mais recente</strong> (ID maior) para o <strong>mais antigo</strong> (ID menor).</AlertDescription></Alert>
            <div className="grid gap-3">
              <div className="flex justify-between py-2 border-b"><span className="font-medium">Filtros:</span><span className="text-muted-foreground">{getFiltersSummary(filters)}</span></div>
              {(dateRange.from || dateRange.to) && (
                <div className="flex justify-between py-2 border-b">
                  <span className="font-medium">Período:</span>
                  <span className="text-muted-foreground">
                    {dateRange.from && format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })}
                    {dateRange.from && dateRange.to && " - "}
                    {dateRange.to && format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b"><span className="font-medium">Tamanho do Batch:</span><span className="text-muted-foreground">{batchSize} leads</span></div>
              <div className="flex justify-between py-2 border-b"><span className="font-medium">Mapeamento:</span><span className="text-muted-foreground">{selectedMappingName}</span></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>Cancelar</Button>
            <Button onClick={confirmStartResync} disabled={isCreating}>{isCreating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Iniciando...</> : <><Play className="w-4 h-4 mr-2" />Iniciar</>}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={showErrorsSheet} onOpenChange={setShowErrorsSheet}>
        <SheetContent className="w-full sm:max-w-3xl">
          <SheetHeader><SheetTitle>Log de Erros Detalhado</SheetTitle><SheetDescription>Todos os erros encontrados</SheetDescription></SheetHeader>
          <ScrollArea className="h-[calc(100vh-150px)] mt-4">
            {selectedJobErrors && selectedJobErrors.length > 0 ? (
              <div className="space-y-3">{selectedJobErrors.map((error: any, index: number) => (
                <Card key={index}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between"><CardTitle className="text-sm">Lead ID: {error.lead_id}</CardTitle><Badge variant="outline">{error.type}</Badge></div>
                    <CardDescription className="text-xs">Batch {error.batch} • {new Date(error.timestamp).toLocaleString('pt-BR')}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div><p className="text-xs font-medium text-muted-foreground">Erro:</p><p className="text-sm text-destructive">{error.error}</p></div>
                    {error.transform_errors && error.transform_errors.length > 0 && <div><p className="text-xs font-medium text-muted-foreground">Erros de Transformação:</p><ul className="text-xs list-disc list-inside space-y-1">{error.transform_errors.map((te: string, i: number) => <li key={i} className="text-destructive">{te}</li>)}</ul></div>}
                    {error.field_data && <div><p className="text-xs font-medium text-muted-foreground">Dados:</p><pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">{error.field_data}</pre></div>}
                  </CardContent>
                </Card>
              ))}</div>
            ) : <div className="text-center py-8 text-muted-foreground">Nenhum erro registrado</div>}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <ResyncFieldMappingDialog 
        open={showMappingDialog} 
        onOpenChange={setShowMappingDialog}
        onMappingSelected={(name, id) => {
          setSelectedMappingName(name);
          setSelectedMappingId(id);
          setShowMappingDialog(false);
        }}
        currentMappingName={selectedMappingName}
      />
    </AdminPageLayout>
  );
}
