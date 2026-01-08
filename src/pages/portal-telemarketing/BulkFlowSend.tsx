import { useState, useMemo } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Send, Loader2, Users, CalendarDays, Clock, CheckCircle, XCircle, Workflow } from 'lucide-react';
import { useBulkLeadsWithActiveWindow } from '@/hooks/useBulkLeadsWithActiveWindow';
import { useActiveFlows } from '@/hooks/useActiveFlows';
import { useBulkFlowExecutor } from '@/hooks/useBulkFlowExecutor';
import { useSupervisorTeam } from '@/hooks/useSupervisorTeam';
import { ThemeSelector } from '@/components/portal-telemarketing/ThemeSelector';

interface TelemarketingContext {
  bitrix_id: number;
  cargo: string;
  name: string;
  commercial_project_id?: string;
}

type StoredTelemarketingOperator = {
  bitrix_id: number;
  cargo: string;
  operator_name: string;
  operator_photo?: string | null;
  commercial_project_id?: string;
};

const SUPERVISOR_CARGOS = ['10620', '10626', '10627'];
const isSupervisorCargo = (cargo: string) => SUPERVISOR_CARGOS.includes(cargo);

const BulkFlowSend = () => {
  const navigate = useNavigate();
  
  // Contexto do operador
  const getContext = (): TelemarketingContext | null => {
    try {
      const savedContext = localStorage.getItem('telemarketing_context');
      if (savedContext) {
        const ctx = JSON.parse(savedContext) as TelemarketingContext;
        const savedOperator = localStorage.getItem('telemarketing_operator');
        const operatorData = savedOperator ? JSON.parse(savedOperator) as StoredTelemarketingOperator : null;
        return {
          ...ctx,
          commercial_project_id: operatorData?.commercial_project_id || ctx.commercial_project_id,
        };
      }
      const savedOperator = localStorage.getItem('telemarketing_operator');
      if (savedOperator) {
        const operator = JSON.parse(savedOperator) as StoredTelemarketingOperator;
        return {
          bitrix_id: operator.bitrix_id,
          cargo: operator.cargo,
          name: operator.operator_name,
          commercial_project_id: operator.commercial_project_id,
        };
      }
      return null;
    } catch {
      return null;
    }
  };

  const context = getContext();
  const isSupervisor = isSupervisorCargo(context?.cargo || '');

  // Estados
  const [agendamentoFilter, setAgendamentoFilter] = useState<string>('today');
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<string>('all');
  const [selectedFlowId, setSelectedFlowId] = useState<string>('');
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<number>>(new Set());

  // Hooks
  const { data: supervisorTeam } = useSupervisorTeam(
    context?.commercial_project_id || null,
    isSupervisor ? context?.bitrix_id || null : null
  );
  const teamOperatorIds = supervisorTeam?.agents.map(a => a.bitrix_telemarketing_id) || [];
  
  const filteredOperatorIds = useMemo(() => {
    if (!isSupervisor) return undefined;
    if (selectedAgentFilter === 'all') return teamOperatorIds;
    return [parseInt(selectedAgentFilter, 10)];
  }, [isSupervisor, selectedAgentFilter, teamOperatorIds]);

  const { data: leadsData, isLoading: isLoadingLeads } = useBulkLeadsWithActiveWindow({
    bitrixTelemarketingId: context?.bitrix_id || 0,
    cargo: context?.cargo,
    commercialProjectId: context?.commercial_project_id,
    teamOperatorIds: filteredOperatorIds,
    agendamentoFilter,
  });

  const { data: flows, isLoading: isLoadingFlows } = useActiveFlows();
  const { isExecuting, progress, results, successCount, failedCount, executeBulkFlow, reset } = useBulkFlowExecutor();

  // Leads com janela ativa
  const activeLeads = useMemo(() => {
    return leadsData?.leads.filter(l => l.is_window_open) || [];
  }, [leadsData]);

  // Seleção
  const toggleLead = (leadId: number) => {
    setSelectedLeadIds(prev => {
      const next = new Set(prev);
      if (next.has(leadId)) {
        next.delete(leadId);
      } else {
        next.add(leadId);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedLeadIds.size === activeLeads.length) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(activeLeads.map(l => l.id)));
    }
  };

  const handleSend = () => {
    if (!selectedFlowId) return;
    executeBulkFlow(selectedFlowId, Array.from(selectedLeadIds));
  };

  // Redirect se não tem contexto
  if (!context) {
    return <Navigate to="/portal-telemarketing" replace />;
  }

  const selectedFlow = flows?.find(f => f.id === selectedFlowId);

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b bg-card px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/portal-telemarketing/whatsapp')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <div className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold">Envio de Flow em Lote</h1>
          </div>
        </div>
        <ThemeSelector />
      </header>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Filtros */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="w-4 h-4" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Data do Agendamento</label>
                  <Select value={agendamentoFilter} onValueChange={setAgendamentoFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o período" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Agendados hoje</SelectItem>
                      <SelectItem value="yesterday">Agendados ontem</SelectItem>
                      <SelectItem value="3days">Últimos 3 dias</SelectItem>
                      <SelectItem value="7days">Últimos 7 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {isSupervisor && supervisorTeam && supervisorTeam.agents.length > 0 && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Agente</label>
                    <Select value={selectedAgentFilter} onValueChange={setSelectedAgentFilter}>
                      <SelectTrigger>
                        <Users className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Filtrar por agente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os agentes</SelectItem>
                        {supervisorTeam.agents.map((agent) => (
                          <SelectItem key={agent.bitrix_telemarketing_id} value={String(agent.bitrix_telemarketing_id)}>
                            {agent.bitrix_telemarketing_name || `Agente ${agent.bitrix_telemarketing_id}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Seleção de Flow */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Workflow className="w-4 h-4" />
                Flow a Enviar
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingFlows ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Carregando flows...
                </div>
              ) : (
                <Select value={selectedFlowId} onValueChange={setSelectedFlowId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um flow" />
                  </SelectTrigger>
                  <SelectContent>
                    {flows?.map((flow) => (
                      <SelectItem key={flow.id} value={flow.id}>
                        {flow.nome}
                        {flow.descricao && (
                          <span className="text-muted-foreground ml-2">- {flow.descricao}</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {selectedFlow && (
                <p className="text-sm text-muted-foreground mt-2">
                  {selectedFlow.steps?.length || 0} passos no flow
                </p>
              )}
            </CardContent>
          </Card>

          {/* Lista de Leads */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Leads com Janela Ativa
                  </CardTitle>
                  <CardDescription>
                    {isLoadingLeads ? (
                      'Carregando...'
                    ) : (
                      `${activeLeads.length} de ${leadsData?.totalLeads || 0} leads com janela de 24h ativa`
                    )}
                  </CardDescription>
                </div>
                {activeLeads.length > 0 && !isExecuting && (
                  <Button variant="outline" size="sm" onClick={toggleAll}>
                    {selectedLeadIds.size === activeLeads.length ? 'Desmarcar todos' : 'Selecionar todos'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingLeads ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : activeLeads.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Nenhum lead com janela ativa no período selecionado</p>
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {activeLeads.map((lead) => {
                      const result = results.find(r => r.leadId === lead.id);
                      
                      return (
                        <div
                          key={lead.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border ${
                            result?.success ? 'bg-green-500/10 border-green-500/30' :
                            result?.success === false ? 'bg-red-500/10 border-red-500/30' :
                            'bg-muted/50'
                          }`}
                        >
                          {!isExecuting && !result && (
                            <Checkbox
                              checked={selectedLeadIds.has(lead.id)}
                              onCheckedChange={() => toggleLead(lead.id)}
                            />
                          )}
                          {result && (
                            result.success ? (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-500" />
                            )
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{lead.lead_name}</p>
                            <p className="text-xs text-muted-foreground">{lead.phone_number}</p>
                            {isSupervisor && lead.telemarketing_name && (
                              <p className="text-[10px] text-purple-500">
                                Agente: {lead.telemarketing_name}
                              </p>
                            )}
                          </div>
                          
                          <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                            <Clock className="w-3 h-3 mr-1" />
                            {lead.hours_remaining}h {lead.minutes_remaining}m
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Progresso / Ações */}
          {isExecuting ? (
            <Card>
              <CardContent className="py-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span>Enviando flows...</span>
                    <span>{progress.current} de {progress.total}</span>
                  </div>
                  <Progress value={(progress.current / progress.total) * 100} />
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      {successCount} sucesso
                    </span>
                    <span className="flex items-center gap-1 text-red-600">
                      <XCircle className="w-4 h-4" />
                      {failedCount} falha
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : results.length > 0 ? (
            <Card>
              <CardContent className="py-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      {successCount} sucesso
                    </span>
                    <span className="flex items-center gap-1 text-red-600">
                      <XCircle className="w-4 h-4" />
                      {failedCount} falha
                    </span>
                  </div>
                  <Button onClick={reset} variant="outline">
                    Novo Envio
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => navigate('/portal-telemarketing/whatsapp')}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSend}
                disabled={!selectedFlowId || selectedLeadIds.size === 0}
              >
                <Send className="w-4 h-4 mr-2" />
                Enviar para {selectedLeadIds.size} lead{selectedLeadIds.size !== 1 ? 's' : ''}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkFlowSend;
