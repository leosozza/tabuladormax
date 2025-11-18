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
import { useLeadResyncJobs, JobFilters } from '@/hooks/useLeadResyncJobs';
import { useResyncFieldMappings } from '@/hooks/useResyncFieldMappings';
import { AdminPageLayout } from '@/components/layouts/AdminPageLayout';
import { Play, Pause, RefreshCw, Loader2, CheckCircle2, XCircle, Clock, Check, AlertCircle, Ban, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

  const activeJob = jobs.find(j => j.status === 'running' || j.status === 'paused');
  const completedJobs = jobs.filter(j => ['completed', 'failed', 'cancelled'].includes(j.status));

  const handleStartResync = () => {
    if (!selectedMappingId) return;
    createJob({ filters, batchSize, mappingId: selectedMappingId });
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

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  return (
    <AdminPageLayout
      title="Resincronização de Leads"
      description="Atualizar leads do Bitrix com campos incompletos"
    >
      <div className="space-y-6">
        {/* Job Ativo */}
        {activeJob && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Resincronização em Andamento</CardTitle>
                  <CardDescription>
                    Batch {activeJob.current_batch} • {activeJob.processed_leads.toLocaleString()} / {activeJob.total_leads.toLocaleString()} leads
                  </CardDescription>
                </div>
                {getStatusBadge(activeJob.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={(activeJob.processed_leads / activeJob.total_leads) * 100} />
              
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Processados</p>
                  <p className="text-2xl font-bold">{activeJob.processed_leads.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Atualizados</p>
                  <p className="text-2xl font-bold text-green-600">{activeJob.updated_leads.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Ignorados</p>
                  <p className="text-2xl font-bold text-blue-600">{activeJob.skipped_leads.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Erros</p>
                  <p className="text-2xl font-bold text-red-600">{activeJob.error_leads.toLocaleString()}</p>
                </div>
              </div>

              <div className="flex gap-2">
                {activeJob.status === 'running' && (
                  <>
                    <Button onClick={() => pauseJob(activeJob.id)} variant="secondary">
                      <Pause className="w-4 h-4 mr-2" />
                      Pausar
                    </Button>
                    <Button 
                      onClick={() => cancelJob(activeJob.id)} 
                      variant="destructive"
                      disabled={isCancelling}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Cancelar
                    </Button>
                  </>
                )}
                {activeJob.status === 'paused' && (
                  <>
                    <Button onClick={() => resumeJob(activeJob.id)}>
                      <Play className="w-4 h-4 mr-2" />
                      Retomar
                    </Button>
                    <Button 
                      onClick={() => cancelJob(activeJob.id)} 
                      variant="destructive"
                      disabled={isCancelling}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Cancelar
                    </Button>
                  </>
                )}
              </div>

              {activeJob.error_details && activeJob.error_details.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Últimos erros:</p>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {activeJob.error_details.slice(-5).map((err: any, i: number) => (
                      <p key={i} className="text-xs text-muted-foreground">
                        Lead #{err.lead_id}: {err.error}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Nova Resincronização */}
        {!activeJob && (
          <Card>
            <CardHeader>
              <CardTitle>Iniciar Nova Resincronização</CardTitle>
              <CardDescription>
                Configure os filtros para selecionar quais leads devem ser atualizados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="addressNull"
                    checked={filters.addressNull}
                    onCheckedChange={(checked) => 
                      setFilters({ ...filters, addressNull: checked as boolean })
                    }
                  />
                  <Label htmlFor="addressNull" className="cursor-pointer">
                    Leads com endereço NULL (~253.800 leads)
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="phoneNull"
                    checked={filters.phoneNull}
                    onCheckedChange={(checked) => 
                      setFilters({ ...filters, phoneNull: checked as boolean })
                    }
                  />
                  <Label htmlFor="phoneNull" className="cursor-pointer">
                    Leads com telefones NULL (~190.000 leads)
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="valorNull"
                    checked={filters.valorNull}
                    onCheckedChange={(checked) => 
                      setFilters({ ...filters, valorNull: checked as boolean })
                    }
                  />
                  <Label htmlFor="valorNull" className="cursor-pointer">
                    Leads com valor_ficha NULL (~232.000 leads)
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="responsibleNull"
                    checked={filters.responsibleNull}
                    onCheckedChange={(checked) => 
                      setFilters({ ...filters, responsibleNull: checked as boolean })
                    }
                  />
                  <Label htmlFor="responsibleNull" className="cursor-pointer">
                    Leads com responsável NULL (~3.000 leads)
                  </Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="batchSize">Tamanho do lote (leads por batch)</Label>
                <Input
                  id="batchSize"
                  type="number"
                  value={batchSize}
                  onChange={(e) => setBatchSize(parseInt(e.target.value) || 50)}
                  min={10}
                  max={500}
                />
                <p className="text-xs text-muted-foreground">
                  Recomendado: 50-100 para estabilidade
                </p>
              </div>

              {/* Mapeamento de Campos Inline */}
              <div className="border-t pt-4 space-y-3">
                <Label className="text-base font-semibold">
                  Mapeamento de Campos (Obrigatório)
                </Label>
                
                <Select
                  value={selectedMappingId || undefined}
                  onValueChange={(value) => {
                    setSelectedMappingId(value);
                    const mapping = mappingNames?.find(m => m.id === value);
                    setSelectedMappingName(mapping?.name || '');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um mapeamento salvo" />
                  </SelectTrigger>
                  <SelectContent>
                    {mappingNames?.filter(m => m.id && m.id.trim() !== '').map((mapping) => (
                      <SelectItem key={mapping.id} value={mapping.id}>
                        {mapping.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedMappingName && (
                  <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
                    <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <AlertTitle className="text-green-800 dark:text-green-200">Mapeamento Configurado</AlertTitle>
                    <AlertDescription className="text-green-700 dark:text-green-300">
                      Usando configuração: <strong>{selectedMappingName}</strong>
                    </AlertDescription>
                  </Alert>
                )}

                {!selectedMappingName && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Mapeamento Obrigatório</AlertTitle>
                    <AlertDescription>
                      Selecione um mapeamento de campos antes de iniciar. Se não houver mapeamentos, crie um primeiro na página de Integração Bitrix.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <Button 
                onClick={handleStartResync} 
                disabled={isCreating || !selectedMappingId}
                size="lg"
                className="w-full"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Iniciando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Iniciar Resincronização
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Histórico */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Resincronizações</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : completedJobs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma resincronização realizada ainda
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Iniciado</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Processados</TableHead>
                    <TableHead className="text-right">Atualizados</TableHead>
                    <TableHead className="text-right">Erros</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>{getStatusBadge(job.status)}</TableCell>
                      <TableCell>
                        {job.started_at ? 
                          formatDistanceToNow(new Date(job.started_at), { 
                            addSuffix: true, 
                            locale: ptBR 
                          }) : 
                          '-'
                        }
                      </TableCell>
                      <TableCell className="text-right">{job.total_leads.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{job.processed_leads.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-green-600">{job.updated_leads.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-red-600">{job.error_leads.toLocaleString()}</TableCell>
                      <TableCell>
                        {job.started_at && job.completed_at ? (
                          <>
                            {Math.round(
                              (new Date(job.completed_at).getTime() - 
                               new Date(job.started_at).getTime()) / 60000
                            )} min
                          </>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteJob(job.id)}
                          disabled={isDeleting}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminPageLayout>
  );
}
