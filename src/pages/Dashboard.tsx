import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { User, MapPin, Phone, Filter, Settings2, Eye, EyeOff, Loader2, MessageSquare } from "lucide-react";
import UserMenu from "@/components/UserMenu";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DateFilterSelector } from "@/components/DateFilterSelector";
import { LeadsListModal } from "@/components/LeadsListModal";
import { DateFilter, LeadWithDetails } from "@/types/filters";
import { createDateFilter } from "@/lib/dateUtils";
import { isValidUUID } from "@/lib/utils";

// ✅ FASE 3: Expandir interface com TODAS as colunas do Supabase
interface LeadRow {
  id: number;
  name: string | null;
  age: number | null;
  address: string | null;
  photo_url: string | null;
  updated_at: string | null;
  responsible: string | null;
  scouter: string | null;
  etapa: string | null;
  nome_modelo: string | null;
  criado: string | null;
  fonte: string | null;
  telefone_trabalho: string | null;
  celular: string | null;
  telefone_casa: string | null;
  local_abordagem: string | null;
  ficha_confirmada: boolean | null;
  data_criacao_ficha: string | null;
  data_confirmacao_ficha: string | null;
  presenca_confirmada: boolean | null;
  compareceu: boolean | null;
  cadastro_existe_foto: boolean | null;
  valor_ficha: number | null;
  data_criacao_agendamento: string | null;
  horario_agendamento: string | null;
  data_agendamento: string | null;
  gerenciamento_funil: string | null;
  status_fluxo: string | null;
  etapa_funil: string | null;
  etapa_fluxo: string | null;
  funil_fichas: string | null;
  status_tabulacao: string | null;
  maxsystem_id_ficha: string | null;
  gestao_scouter: string | null;
  op_telemarketing: string | null;
  data_retorno_ligacao: string | null;
  commercial_project_id: string | null;
  responsible_user_id: string | null;
  bitrix_telemarketing_id: number | null;
  date_modify: string | null;
}

const Index = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Detectar se estamos no contexto do portal telemarketing
  const isPortalTelemarketing = (() => {
    try {
      const ctx = localStorage.getItem('telemarketing_context');
      return ctx !== null;
    } catch {
      return false;
    }
  })();
  
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [actionStats, setActionStats] = useState<Record<string, number>>({});
  const [dateFilter, setDateFilter] = useState<DateFilter>(() => createDateFilter('all'));
  const [selectedOperator, setSelectedOperator] = useState<string | null>(null);
  const [operators, setOperators] = useState<Array<{ id: string; name: string }>>([]);
  const [showLeadsModal, setShowLeadsModal] = useState(false);
  const [selectedStatusLabel, setSelectedStatusLabel] = useState<string>('');
  const [selectedStatusLeads, setSelectedStatusLeads] = useState<LeadWithDetails[]>([]);
  const [loadingStatusLeads, setLoadingStatusLeads] = useState(false);
  // ✅ FASE 3: Expandir colunas visíveis com todas as disponíveis
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('dashboard_visible_columns');
    return saved ? JSON.parse(saved) : {
      id: true,
      name: true,
      photo: false,
      age: false,
      address: false,
      scouter: false,
      responsible: true,
      updated_at: true,
      etapa: false,
      nome_modelo: false,
      telefone_trabalho: false,
      celular: false,
      telefone_casa: false,
      local_abordagem: false,
      ficha_confirmada: false,
      data_agendamento: false,
      horario_agendamento: false,
      status_tabulacao: false,
      op_telemarketing: false,
    };
  });

  useEffect(() => {
    checkUserRole();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      loadLeads();
      loadActionStats();
      loadOperators();
    }
  }, [currentUserId, showAllUsers, dateFilter, selectedOperator]);

  const checkUserRole = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setCurrentUserId(session.user.id);
      
      try {
        // Verificar se é admin
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .maybeSingle();
        
        if (error) {
          console.error('Erro ao verificar role:', error);
          setIsAdmin(false);
          return;
        }
        
        setIsAdmin(data?.role === 'admin');
      } catch (error) {
        console.error('Erro ao verificar role:', error);
        setIsAdmin(false);
      }
    }
  };

  const loadLeads = async () => {
    setLoading(true);
    
    // RLS agora controla automaticamente quais leads o usuário pode ver
    // Admin/Manager: vê todos
    // Supervisor: vê apenas do seu projeto
    // Agent: vê apenas os seus
    // ✅ FASE 3: Aumentar limite para 200 leads
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(200);

    if (error) {
      console.error('Erro ao carregar leads:', error);
      toast.error('Não foi possível carregar os leads');
      setLeads([]);
    } else {
      setLeads(data || []);
    }

    setLoading(false);
  };

  const loadActionStats = async () => {
    // Usar RPC para evitar limite de 1000 registros
    const { data, error } = await supabase.rpc('get_dashboard_stats', {
      p_start_date: dateFilter.startDate.toISOString(),
      p_end_date: dateFilter.endDate.toISOString(),
      p_user_id: currentUserId || null,
      p_show_all: isAdmin && showAllUsers
    });

    if (error) {
      console.error('Erro ao carregar stats:', error);
      setActionStats({});
      return;
    }

    if (data && data.length > 0) {
      const stats = data[0];
      // Converter JSONB para Record<string, number>
      const counts: Record<string, number> = {};
      if (stats.action_stats) {
        Object.entries(stats.action_stats).forEach(([label, count]) => {
          counts[label] = Number(count);
        });
      }
      setActionStats(counts);
    } else {
      setActionStats({});
    }
  };

  const loadOperators = async () => {
    try {
      // Buscar operadores da tabela de mapeamento com nome do telemarketing do Bitrix
      const { data: mappings, error: mappingError } = await supabase
        .from('agent_telemarketing_mapping')
        .select(`
          tabuladormax_user_id,
          bitrix_telemarketing_name,
          bitrix_telemarketing_id
        `)
        .not('tabuladormax_user_id', 'is', null);

      if (mappingError) {
        console.error('Erro ao carregar mapeamentos:', mappingError);
        toast.error('Erro ao carregar lista de operadores');
        setOperators([]);
        return;
      }

      // Buscar os nomes dos usuários como fallback
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, email');

      if (profilesError) {
        console.error('Erro ao carregar perfis:', profilesError);
      }

      if (mappings && mappings.length > 0) {
        const operatorsList = mappings
          .map((mapping) => {
            const profile = profiles?.find(p => p.id === mapping.tabuladormax_user_id);
            return {
              id: mapping.tabuladormax_user_id!,
              name: mapping.bitrix_telemarketing_name || profile?.display_name || profile?.email || `ID: ${mapping.bitrix_telemarketing_id}`
            };
          })
          .filter(op => op.id) // Remover entradas sem ID
          .sort((a, b) => a.name.localeCompare(b.name));
        
        setOperators(operatorsList);
        console.log(`✅ ${operatorsList.length} operadores carregados com sucesso`);
      } else {
        setOperators([]);
      }
    } catch (error) {
      console.error('Erro ao carregar operadores:', error);
      toast.error('Erro ao carregar operadores');
    }
  };

  const loadLeadsByStatus = async (statusLabel: string) => {
    setLoadingStatusLeads(true);
    setSelectedStatusLabel(statusLabel);
    setShowLeadsModal(true);

    try {
      // Get action logs for this status within date range
      let logsQuery = supabase
        .from('actions_log')
        .select('lead_id, created_at')
        .eq('action_label', statusLabel)
        .gte('created_at', dateFilter.startDate.toISOString())
        .lte('created_at', dateFilter.endDate.toISOString());

      // Apply operator filter if selected
      if (selectedOperator) {
        // Buscar nome do operador no mapeamento
        const { data: mapping } = await supabase
          .from('agent_telemarketing_mapping')
          .select('bitrix_telemarketing_name')
          .eq('tabuladormax_user_id', selectedOperator)
          .maybeSingle();
        
        if (mapping?.bitrix_telemarketing_name) {
          // Usar LIKE para match parcial do primeiro nome
          const firstName = mapping.bitrix_telemarketing_name.split(' ')[0];
          const { data: operatorLeads } = await supabase
            .from('leads')
            .select('id')
            .ilike('responsible', `${firstName}%`);
          
          const leadIds = operatorLeads?.map(l => l.id) || [];
          if (leadIds.length > 0) {
            logsQuery = logsQuery.in('lead_id', leadIds);
          } else {
            setSelectedStatusLeads([]);
            setLoadingStatusLeads(false);
            return;
          }
        } else {
          toast.warning('Operador não está mapeado no Bitrix');
          setSelectedStatusLeads([]);
          setLoadingStatusLeads(false);
          return;
        }
      } else if ((!isAdmin || !showAllUsers) && currentUserId) {
        // Filter by user's leads
        const { data: userLeads } = await supabase
          .from('leads')
          .select('id')
          .eq('responsible', currentUserId);
        
        const leadIds = userLeads?.map(l => l.id) || [];
        if (leadIds.length > 0) {
          logsQuery = logsQuery.in('lead_id', leadIds);
        }
      }

      const { data: logs } = await logsQuery;

      if (!logs || logs.length === 0) {
        setSelectedStatusLeads([]);
        setLoadingStatusLeads(false);
        return;
      }

      // Get unique lead IDs
      const leadIds = [...new Set(logs.map(log => log.lead_id))];

      // Fetch lead details
      const { data: leadsData } = await supabase
        .from('leads')
        .select('*')
        .in('id', leadIds);

      if (leadsData) {
        // Map to LeadWithDetails with action timestamp
        const leadsWithDetails: LeadWithDetails[] = leadsData.map(lead => {
          const leadLogs = logs.filter(log => log.lead_id === lead.id);
          const latestLog = leadLogs.sort((a, b) => 
            new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
          )[0];

          return {
            id: lead.id,
            name: lead.name,
            age: lead.age,
            address: lead.address,
            photo_url: lead.photo_url,
            updated_at: lead.updated_at,
            responsible: lead.responsible,
            scouter: lead.scouter,
            action_label: statusLabel,
            action_created_at: latestLog?.created_at || null
          };
        });

        // Sort by action timestamp
        leadsWithDetails.sort((a, b) => {
          const dateA = new Date(a.action_created_at || a.updated_at || 0).getTime();
          const dateB = new Date(b.action_created_at || b.updated_at || 0).getTime();
          return dateB - dateA;
        });

        setSelectedStatusLeads(leadsWithDetails);
      }
    } catch (error) {
      console.error('Error loading leads by status:', error);
      toast.error('Erro ao carregar leads');
    } finally {
      setLoadingStatusLeads(false);
    }
  };


  const activeTotal = useMemo(() => leads.length, [leads]);
  const scheduledCount = useMemo(() => {
    // FASE 3: Usar actionStats real ao invés de campo inexistente 'status'
    return actionStats['Agendar'] || actionStats['Agendado'] || 0;
  }, [actionStats]);
  const todaysContacts = useMemo(() => {
    // FASE 3: Somar TODAS as ações de hoje, não apenas updated_at
    return Object.values(actionStats).reduce((sum, count) => sum + count, 0);
  }, [actionStats]);

  // ✅ FASE 3: Adicionar mais colunas ao controle
  const toggleColumn = (columnKey: keyof typeof visibleColumns) => {
    const newColumns = { ...visibleColumns, [columnKey]: !visibleColumns[columnKey] };
    setVisibleColumns(newColumns);
    localStorage.setItem('dashboard_visible_columns', JSON.stringify(newColumns));
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b">
        <div className="container mx-auto px-4 py-6 flex flex-col gap-4">
          {/* Primeira linha: Título à esquerda, UserMenu à direita */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Tabulador Telemarketing
              </h1>
              <p className="text-muted-foreground mt-2">
                Gerencie seus leads com eficiência
              </p>
            </div>
            <UserMenu />
          </div>
          
          {/* Segunda linha: Botões de ação */}
          <div className="flex flex-wrap gap-2 items-center justify-between w-full">
            {/* Lado esquerdo */}
            <div className="flex flex-wrap gap-2 items-center">
              <Button
                variant="outline"
                onClick={() => navigate(isPortalTelemarketing ? '/portal-telemarketing/tabulador' : '/telemarketing')}
                className="gap-2"
              >
                <Phone className="w-4 h-4" />
                Gestão de Leads
              </Button>
              {isAdmin && (
                <label className="flex items-center gap-2 text-sm min-h-[44px]">
                  <input 
                    type="checkbox" 
                    checked={showAllUsers}
                    onChange={(e) => setShowAllUsers(e.target.checked)}
                    className="rounded w-5 h-5"
                  />
                  <span className="hidden sm:inline">Ver todos os usuários</span>
                  <span className="sm:hidden">Todos</span>
                </label>
              )}
            </div>
            
            {/* Lado direito - Navegação rápida */}
            <div className="flex gap-2">
              <Button 
                variant="secondary" 
                onClick={() => navigate(isPortalTelemarketing ? '/portal-telemarketing/tabulador' : '/telemarketing')} 
                className="gap-2"
              >
                <Phone className="w-4 h-4" />
                <span className="hidden xs:inline">Tabulador</span>
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => navigate(isPortalTelemarketing ? '/portal-telemarketing/whatsapp' : '/whatsapp', 
                  isPortalTelemarketing ? undefined : { state: { from: 'telemarketing' } }
                )} 
                className="gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                <span className="hidden xs:inline">WhatsApp</span>
              </Button>
            </div>
          </div>

          {/* Filter Bar */}
          <Card className="p-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filtros:</span>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:flex-wrap">
                <div className="flex flex-col gap-2 min-w-[200px]">
                  <label className="text-sm text-muted-foreground">Data:</label>
                  <DateFilterSelector 
                    value={dateFilter} 
                    onChange={setDateFilter} 
                  />
                </div>

                {isAdmin && (
                  <div className="flex flex-col gap-2 min-w-[200px]">
                    <label className="text-sm text-muted-foreground">Operador:</label>
                    <Select 
                      value={selectedOperator || 'all'} 
                      onValueChange={(v) => setSelectedOperator(v === 'all' ? null : v)}
                    >
                      <SelectTrigger className="w-full min-h-[44px]">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os operadores</SelectItem>
                        {operators.map((op) => (
                          <SelectItem key={op.id} value={op.id}>
                            {op.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button 
                  variant="outline" 
                  size="sm"
                  className="min-h-[44px] self-start sm:self-center"
                  onClick={() => {
                    setDateFilter(createDateFilter('all'));
                    setSelectedOperator(null);
                  }}
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Leads no cache</p>
                <p className="text-3xl font-bold mt-1">{activeTotal}</p>
              </div>
              <User className="w-12 h-12 text-muted-foreground" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Agendamentos</p>
                <p className="text-3xl font-bold mt-1">{scheduledCount}</p>
              </div>
              <MapPin className="w-12 h-12 text-muted-foreground" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Contatos Hoje</p>
                <p className="text-3xl font-bold mt-1">{todaysContacts}</p>
              </div>
              <Phone className="w-12 h-12 text-muted-foreground" />
            </div>
          </Card>
        </div>

        {/* Estatísticas de Ações */}
        {Object.keys(actionStats).length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">
              📈 {isAdmin && showAllUsers ? 'Estatísticas Gerais' : 'Minhas Estatísticas'}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(actionStats)
                .sort(([, a], [, b]) => b - a)
                .map(([label, count]) => (
                  <Card 
                    key={label} 
                    className="p-4 cursor-pointer hover:shadow-lg transition-shadow hover:border-primary"
                    onClick={() => loadLeadsByStatus(label)}
                  >
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">{label}</p>
                      <p className="text-2xl font-bold">{count}</p>
                      <p className="text-xs text-muted-foreground mt-1">Clique para ver leads</p>
                    </div>
                  </Card>
                ))}
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-foreground">
              Leads para Tabular
            </h2>
            <div className="flex items-center gap-2">
              {loading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Settings2 className="w-4 h-4" />
                    Colunas
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 bg-background" align="end">
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Colunas Visíveis</h4>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {/* ✅ FASE 3: Adicionar todas as colunas disponíveis */}
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox checked={visibleColumns.id} onCheckedChange={() => toggleColumn('id')} />
                        <span className="text-sm">ID</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox checked={visibleColumns.name} onCheckedChange={() => toggleColumn('name')} />
                        <span className="text-sm">Nome</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox checked={visibleColumns.photo} onCheckedChange={() => toggleColumn('photo')} />
                        <span className="text-sm">Foto</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox checked={visibleColumns.age} onCheckedChange={() => toggleColumn('age')} />
                        <span className="text-sm">Idade</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox checked={visibleColumns.address} onCheckedChange={() => toggleColumn('address')} />
                        <span className="text-sm">Endereço</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox checked={visibleColumns.scouter} onCheckedChange={() => toggleColumn('scouter')} />
                        <span className="text-sm">Olheiro</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox checked={visibleColumns.responsible} onCheckedChange={() => toggleColumn('responsible')} />
                        <span className="text-sm">Operador</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox checked={visibleColumns.updated_at} onCheckedChange={() => toggleColumn('updated_at')} />
                        <span className="text-sm">Atualizado</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox checked={visibleColumns.etapa} onCheckedChange={() => toggleColumn('etapa')} />
                        <span className="text-sm">Etapa</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox checked={visibleColumns.telefone_trabalho} onCheckedChange={() => toggleColumn('telefone_trabalho')} />
                        <span className="text-sm">Telefone Trabalho</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox checked={visibleColumns.celular} onCheckedChange={() => toggleColumn('celular')} />
                        <span className="text-sm">Celular</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox checked={visibleColumns.local_abordagem} onCheckedChange={() => toggleColumn('local_abordagem')} />
                        <span className="text-sm">Local Abordagem</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox checked={visibleColumns.data_agendamento} onCheckedChange={() => toggleColumn('data_agendamento')} />
                        <span className="text-sm">Data Agendamento</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox checked={visibleColumns.horario_agendamento} onCheckedChange={() => toggleColumn('horario_agendamento')} />
                        <span className="text-sm">Horário Agendamento</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox checked={visibleColumns.status_tabulacao} onCheckedChange={() => toggleColumn('status_tabulacao')} />
                        <span className="text-sm">Status Tabulação</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox checked={visibleColumns.op_telemarketing} onCheckedChange={() => toggleColumn('op_telemarketing')} />
                        <span className="text-sm">OP Telemarketing</span>
                      </label>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          {loading ? (
            <Card className="p-6 text-sm text-muted-foreground">Carregando leads...</Card>
          ) : leads.length === 0 ? (
            <Card className="p-6 text-sm text-muted-foreground">
              Nenhum lead encontrado no cache. Clique em "Sincronizar com Bitrix" para importar.
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    {visibleColumns.id && <TableHead className="w-24">ID</TableHead>}
                    {visibleColumns.photo && <TableHead className="w-16">Foto</TableHead>}
                    {visibleColumns.name && <TableHead>Nome</TableHead>}
                    {visibleColumns.age && <TableHead className="w-20">Idade</TableHead>}
                    {visibleColumns.scouter && <TableHead>Olheiro</TableHead>}
                    {visibleColumns.address && <TableHead>Endereço</TableHead>}
                    {visibleColumns.responsible && <TableHead>Operador</TableHead>}
                    {visibleColumns.updated_at && <TableHead className="w-40">Atualizado</TableHead>}
                    {visibleColumns.etapa && <TableHead>Etapa</TableHead>}
                    {visibleColumns.telefone_trabalho && <TableHead>Tel. Trabalho</TableHead>}
                    {visibleColumns.celular && <TableHead>Celular</TableHead>}
                    {visibleColumns.local_abordagem && <TableHead>Local</TableHead>}
                    {visibleColumns.data_agendamento && <TableHead>Data Agend.</TableHead>}
                    {visibleColumns.horario_agendamento && <TableHead>Horário</TableHead>}
                    {visibleColumns.status_tabulacao && <TableHead>Status Tab.</TableHead>}
                    {visibleColumns.op_telemarketing && <TableHead>OP Telem.</TableHead>}
                    <TableHead className="w-32">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow
                      key={lead.id}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      {visibleColumns.id && (
                        <TableCell className="font-mono text-sm">{lead.id}</TableCell>
                      )}
                      {visibleColumns.photo && (
                        <TableCell>
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                            {lead.photo_url ? (
                              <img src={lead.photo_url} alt={lead.name ?? ''} className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.name && (
                        <TableCell className="font-medium">
                          {lead.name || 'Lead sem nome'}
                        </TableCell>
                      )}
                      {visibleColumns.age && (
                        <TableCell>
                          {lead.age ? `${lead.age}` : '-'}
                        </TableCell>
                      )}
                      {visibleColumns.scouter && (
                        <TableCell>{lead.scouter || '-'}</TableCell>
                      )}
                      {visibleColumns.address && (
                        <TableCell className="max-w-xs truncate">
                          {lead.address || '-'}
                        </TableCell>
                      )}
                      {visibleColumns.etapa && <TableCell>{lead.etapa || '-'}</TableCell>}
                      {visibleColumns.nome_modelo && <TableCell>{lead.nome_modelo || '-'}</TableCell>}
                      {visibleColumns.fonte && <TableCell>{lead.fonte || '-'}</TableCell>}
                      {visibleColumns.telefone_trabalho && <TableCell>{lead.telefone_trabalho || '-'}</TableCell>}
                      {visibleColumns.celular && <TableCell>{lead.celular || '-'}</TableCell>}
                      {visibleColumns.telefone_casa && <TableCell>{lead.telefone_casa || '-'}</TableCell>}
                      {visibleColumns.local_abordagem && <TableCell>{lead.local_abordagem || '-'}</TableCell>}
                      {visibleColumns.horario_agendamento && <TableCell>{lead.horario_agendamento || '-'}</TableCell>}
                      {visibleColumns.gerenciamento_funil && <TableCell>{lead.gerenciamento_funil || '-'}</TableCell>}
                      {visibleColumns.status_fluxo && <TableCell>{lead.status_fluxo || '-'}</TableCell>}
                      {visibleColumns.etapa_funil && <TableCell>{lead.etapa_funil || '-'}</TableCell>}
                      {visibleColumns.etapa_fluxo && <TableCell>{lead.etapa_fluxo || '-'}</TableCell>}
                      {visibleColumns.funil_fichas && <TableCell>{lead.funil_fichas || '-'}</TableCell>}
                      {visibleColumns.status_tabulacao && <TableCell>{lead.status_tabulacao || '-'}</TableCell>}
                      {visibleColumns.maxsystem_id_ficha && <TableCell>{lead.maxsystem_id_ficha || '-'}</TableCell>}
                      {visibleColumns.gestao_scouter && <TableCell>{lead.gestao_scouter || '-'}</TableCell>}
                      {visibleColumns.op_telemarketing && <TableCell>{lead.op_telemarketing || '-'}</TableCell>}
                      {visibleColumns.valor_ficha && <TableCell>{lead.valor_ficha || '-'}</TableCell>}
                      {visibleColumns.cadastro_existe_foto && <TableCell>{lead.cadastro_existe_foto ? 'Sim' : 'Não'}</TableCell>}
                      {visibleColumns.compareceu && <TableCell>{lead.compareceu ? 'Sim' : 'Não'}</TableCell>}
                      {visibleColumns.presenca_confirmada && <TableCell>{lead.presenca_confirmada ? 'Sim' : 'Não'}</TableCell>}
                      {visibleColumns.ficha_confirmada && <TableCell>{lead.ficha_confirmada ? 'Sim' : 'Não'}</TableCell>}
                      {visibleColumns.data_agendamento && (
                        <TableCell>
                          {lead.data_agendamento ? format(new Date(lead.data_agendamento), 'dd/MM/yyyy') : '-'}
                        </TableCell>
                      )}
                      {visibleColumns.data_retorno_ligacao && (
                        <TableCell>
                          {lead.data_retorno_ligacao ? format(new Date(lead.data_retorno_ligacao), 'dd/MM/yyyy HH:mm') : '-'}
                        </TableCell>
                      )}
                      {visibleColumns.data_confirmacao_ficha && (
                        <TableCell>
                          {lead.data_confirmacao_ficha ? format(new Date(lead.data_confirmacao_ficha), 'dd/MM/yyyy HH:mm') : '-'}
                        </TableCell>
                      )}
                      {visibleColumns.data_criacao_ficha && (
                        <TableCell>
                          {lead.data_criacao_ficha ? format(new Date(lead.data_criacao_ficha), 'dd/MM/yyyy HH:mm') : '-'}
                        </TableCell>
                      )}
                      {visibleColumns.data_criacao_agendamento && (
                        <TableCell>
                          {lead.data_criacao_agendamento ? format(new Date(lead.data_criacao_agendamento), 'dd/MM/yyyy HH:mm') : '-'}
                        </TableCell>
                      )}
                      {visibleColumns.criado && (
                        <TableCell>
                          {lead.criado ? format(new Date(lead.criado), 'dd/MM/yyyy HH:mm') : '-'}
                        </TableCell>
                      )}
                      {visibleColumns.date_modify && (
                        <TableCell>
                          {lead.date_modify ? format(new Date(lead.date_modify), 'dd/MM/yyyy HH:mm') : '-'}
                        </TableCell>
                      )}
                      {visibleColumns.responsible && (
                        <TableCell>{lead.responsible || '-'}</TableCell>
                      )}
                      {visibleColumns.updated_at && (
                        <TableCell className="text-sm text-muted-foreground">
                          {lead.updated_at 
                            ? new Date(lead.updated_at).toLocaleDateString('pt-BR')
                            : '-'}
                        </TableCell>
                      )}
                      <TableCell>
                        <Button 
                          size="sm" 
                          onClick={() => navigate('/lead')}
                        >
                          Abrir
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      </main>

      {/* Leads List Modal */}
      <LeadsListModal
        isOpen={showLeadsModal}
        onClose={() => setShowLeadsModal(false)}
        leads={selectedStatusLeads}
        statusLabel={selectedStatusLabel}
        loading={loadingStatusLeads}
      />
    </div>
  );
};

export default Index;
