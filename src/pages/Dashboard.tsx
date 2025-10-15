import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, MapPin, Phone, RefreshCcw, Loader2, Filter } from "lucide-react";
import UserMenu from "@/components/UserMenu";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BitrixError, BitrixLead, listLeads } from "@/lib/bitrix";
import { CSVImportDialog } from "@/components/CSVImportDialog";
import { DateFilterSelector } from "@/components/DateFilterSelector";
import { LeadsListModal } from "@/components/LeadsListModal";
import { DateFilter, LeadWithDetails } from "@/types/filters";
import { createDateFilter } from "@/lib/dateUtils";
import { isValidUUID } from "@/lib/utils";

interface LeadRow {
  id: number;
  name: string | null;
  age: number | null;
  address: string | null;
  photo_url: string | null;
  updated_at: string | null;
  responsible: string | null;
  scouter: string | null;
}

const mapBitrixLeadToRow = (lead: BitrixLead): LeadRow => ({
  id: Number(lead.ID),
  name: lead.NAME || null,
  age: lead.UF_IDADE ? Number(lead.UF_IDADE) : null,
  address: lead.UF_LOCAL || lead.ADDRESS || null,
  photo_url: lead.UF_PHOTO || lead.PHOTO || null,
  updated_at: lead.DATE_MODIFY || new Date().toISOString(),
  responsible: lead.UF_RESPONSAVEL || lead.ASSIGNED_BY_NAME || null,
  scouter: lead.UF_SCOUTER || null,
});

const Index = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [actionStats, setActionStats] = useState<Record<string, number>>({});
  const [dateFilter, setDateFilter] = useState<DateFilter>(() => createDateFilter('today'));
  const [selectedOperator, setSelectedOperator] = useState<string | null>(null);
  const [operators, setOperators] = useState<Array<{ id: string; name: string }>>([]);
  const [showLeadsModal, setShowLeadsModal] = useState(false);
  const [selectedStatusLabel, setSelectedStatusLabel] = useState<string>('');
  const [selectedStatusLeads, setSelectedStatusLeads] = useState<LeadWithDetails[]>([]);
  const [loadingStatusLeads, setLoadingStatusLeads] = useState(false);

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
    
    let query = supabase
      .from('leads')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(50);
    
    // SE NÃO FOR ADMIN ou se admin escolheu ver apenas seus dados, filtrar por responsible
    if ((!isAdmin || !showAllUsers) && currentUserId) {
      query = query.eq('responsible', currentUserId);
    }
    
    const { data, error } = await query;

    if (error) {
      console.error('Erro ao carregar leads do cache:', error);
      toast.error('Não foi possível carregar os leads do Supabase');
      setLeads([]);
    } else {
      setLeads(data || []);
    }

    setLoading(false);
  };

  const loadActionStats = async () => {
    let query = supabase
      .from('actions_log')
      .select('action_label, lead_id, created_at');
    
    // Apply date filter
    query = query
      .gte('created_at', dateFilter.startDate.toISOString())
      .lte('created_at', dateFilter.endDate.toISOString());
    
    // Filter by operator if selected
    if (selectedOperator) {
      // Buscar nome do operador no mapeamento
      const { data: mapping } = await supabase
        .from('agent_telemarketing_mapping')
        .select('bitrix_telemarketing_name')
        .eq('tabuladormax_user_id', selectedOperator)
        .maybeSingle();
      
      if (mapping?.bitrix_telemarketing_name) {
        // Buscar leads pelo NOME do bitrix
        const { data: operatorLeads } = await supabase
          .from('leads')
          .select('id')
          .eq('responsible', mapping.bitrix_telemarketing_name);
        
        const leadIds = operatorLeads?.map(l => l.id) || [];
        if (leadIds.length > 0) {
          query = query.in('lead_id', leadIds);
        } else {
          setActionStats({});
          return;
        }
      } else {
        toast.warning('Operador não está mapeado no Bitrix');
        setActionStats({});
        return;
      }
    } else if ((!isAdmin || !showAllUsers) && currentUserId) {
      // Filtrar por leads do usuário se não for admin ou se admin não quiser ver todos
      const { data: userLeads } = await supabase
        .from('leads')
        .select('id')
        .eq('responsible', currentUserId);
      
      const leadIds = userLeads?.map(l => l.id) || [];
      if (leadIds.length > 0) {
        query = query.in('lead_id', leadIds);
      }
    }
    
    const { data } = await query;
    
    // Contar ações por label
    const counts: Record<string, number> = {};
    data?.forEach(log => {
      const label = log.action_label || 'Desconhecido';
      counts[label] = (counts[label] || 0) + 1;
    });
    
    setActionStats(counts);
  };

  const loadOperators = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, email')
        .order('display_name');

      if (error) {
        console.error('Erro ao carregar operadores:', error);
        toast.error('Erro ao carregar lista de operadores');
        setOperators([]);
        return;
      }

      if (data && data.length > 0) {
        const operatorsList = data.map((profile) => ({
          id: profile.id,
          name: profile.display_name || profile.email || 'Sem nome'
        }));
        
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
          const { data: operatorLeads } = await supabase
            .from('leads')
            .select('id')
            .eq('responsible', mapping.bitrix_telemarketing_name);
          
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

  const syncFromBitrix = async () => {
    setSyncing(true);
    try {
      const remoteLeads = await listLeads({ limit: 30 });
      if (remoteLeads.length === 0) {
        toast.info('Nenhum lead retornado pelo Bitrix');
        return;
      }

      const mapped = remoteLeads.map(mapBitrixLeadToRow);

      await supabase.from('leads').upsert(
        mapped.map(lead => ({
          id: lead.id,
          name: lead.name,
          age: lead.age,
          address: lead.address,
          photo_url: lead.photo_url,
          updated_at: lead.updated_at,
          responsible: lead.responsible,
          scouter: lead.scouter,
        }))
      );

      toast.success('Leads sincronizados com o Bitrix!');
      await loadLeads();
    } catch (error) {
      console.error('Erro ao sincronizar com o Bitrix:', error);
      toast.error(error instanceof BitrixError ? error.message : 'Falha ao sincronizar com o Bitrix');
    } finally {
      setSyncing(false);
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

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b">
        <div className="container mx-auto px-4 py-6 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Tabulador Telemarketing
              </h1>
              <p className="text-muted-foreground mt-2">
                Gerencie seus leads com eficiência
              </p>
            </div>
            <div className="flex gap-2 items-center">
              {isAdmin && (
                <label className="flex items-center gap-2 text-sm">
                  <input 
                    type="checkbox" 
                    checked={showAllUsers}
                    onChange={(e) => setShowAllUsers(e.target.checked)}
                    className="rounded"
                  />
                  <span>Ver todos os usuários</span>
                </label>
              )}
              <CSVImportDialog onImportComplete={loadLeads} />
              <Button onClick={syncFromBitrix} disabled={syncing} className="gap-2">
                {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                {syncing ? 'Sincronizando...' : 'Sincronizar com Bitrix'}
              </Button>
              <UserMenu />
            </div>
          </div>

          {/* Filter Bar */}
          <Card className="p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filtros:</span>
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">Data:</label>
                <DateFilterSelector 
                  value={dateFilter} 
                  onChange={setDateFilter} 
                />
              </div>

              {isAdmin && (
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">Operador:</label>
                  <Select 
                    value={selectedOperator || 'all'} 
                    onValueChange={(v) => setSelectedOperator(v === 'all' ? null : v)}
                  >
                    <SelectTrigger className="w-[200px]">
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
                onClick={() => {
                  setDateFilter(createDateFilter('today'));
                  setSelectedOperator(null);
                }}
              >
                Limpar Filtros
              </Button>
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
            {loading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
          </div>
          {loading ? (
            <Card className="p-6 text-sm text-muted-foreground">Carregando leads...</Card>
          ) : leads.length === 0 ? (
            <Card className="p-6 text-sm text-muted-foreground">
              Nenhum lead encontrado no cache. Clique em "Sincronizar com Bitrix" para importar.
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {leads.map((lead) => (
                <Card
                  key={lead.id}
                  className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => navigate('/lead')}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                      {lead.photo_url ? (
                        <img src={lead.photo_url} alt={lead.name ?? ''} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-foreground">
                        {lead.name || 'Lead sem nome'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {lead.age ? `${lead.age} anos` : 'Idade não informada'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{lead.address || 'Endereço não informado'}</span>
                    </div>
                    {lead.updated_at && (
                      <p className="text-xs text-muted-foreground">
                        Atualizado em: {new Date(lead.updated_at).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>

                  <Button className="w-full" variant="default">
                    Abrir Tabulação
                  </Button>
                </Card>
              ))}
            </div>
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
