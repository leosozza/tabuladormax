import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Filter, Columns } from "lucide-react";
import UserMenu from "@/components/UserMenu";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface LogEntry {
  id: string;
  lead_id: number;
  action_label: string;
  payload: Record<string, unknown>;
  status: string;
  error?: string;
  created_at: string;
  user_id?: string;
  agent?: {
    id: string;
    email?: string;
    display_name?: string;
  } | null;
}

interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
}

type DateFilter = 'today' | 'week' | 'month' | 'custom' | 'all';

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'created_at', label: 'Data/Hora', visible: true },
  { id: 'lead_id', label: 'Lead ID', visible: true },
  { id: 'action_label', label: 'Ação', visible: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'agent_name', label: 'Agente (Nome)', visible: false },
  { id: 'agent_email', label: 'Agente (Email)', visible: false },
  { id: 'details', label: 'Detalhes', visible: true },
];

const SESSION_AGENT_CACHE_KEY = 'logs_agents_cache_v1';

const Logs = () => {
  const navigate = useNavigate();

  // Data
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  // Filters
  const [dateFilter, setDateFilter] = useState<DateFilter>('all'); // default to all
  const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>();
  const [customDateTo, setCustomDateTo] = useState<Date | undefined>();
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [agents, setAgents] = useState<Array<{ id: string; display_name: string; email: string }>>([]);

  // Columns
  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    const saved = localStorage.getItem('logs_columns');
    return saved ? JSON.parse(saved) : DEFAULT_COLUMNS;
  });
  const visibleColumns = columns.filter(c => c.visible);

  // Auth / perms
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState(false);

  // Pagination
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50); // default 50
  const MAX_PAGE_SIZE = 100;

  // Agent cache (in-memory + sessionStorage)
  const agentCacheRef = useRef<Record<string, { id: string; display_name?: string; email?: string }>>({});
  useEffect(() => {
    // hydrate cache from sessionStorage
    try {
      const raw = sessionStorage.getItem(SESSION_AGENT_CACHE_KEY);
      if (raw) agentCacheRef.current = JSON.parse(raw) || {};
    } catch (e) {
      console.warn('Erro ao ler cache de agentes da sessão', e);
    }
  }, []);

  // Load user role and agents list (for filter)
  useEffect(() => {
    checkUserRole();
    loadAgents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload logs when filters, page, pageSize, or permissions change
  useEffect(() => {
    if (currentUserId !== '') {
      loadLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter, customDateFrom, customDateTo, agentFilter, currentUserId, isAdmin, page, pageSize, columns]);

  const checkUserRole = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUserId(session.user.id);
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .maybeSingle();
        setIsAdmin(data?.role === 'admin' || data?.role === 'manager');
      }
    } catch (err) {
      console.error('Erro ao checar role', err);
    }
  };

  const loadAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, email')
        .order('display_name');
      if (!error && data) setAgents(data);
    } catch (err) {
      console.warn('Erro ao carregar agentes', err);
    }
  };

  const getDateRange = () => {
    const now = new Date();
    switch (dateFilter) {
      case 'today':
        return { from: startOfDay(now), to: endOfDay(now) };
      case 'week':
        return { from: startOfWeek(now, { locale: ptBR }), to: endOfWeek(now, { locale: ptBR }) };
      case 'month':
        return { from: startOfMonth(now), to: endOfMonth(now) };
      case 'custom':
        if (customDateFrom && customDateTo) {
          return { from: startOfDay(customDateFrom), to: endOfDay(customDateTo) };
        }
        return null;
      case 'all':
      default:
        return null;
    }
  };

  // Helper: apply common filters to a Supabase query builder
  const applyFiltersToQuery = (query: any) => {
    const dateRange = getDateRange();
    if (dateRange) {
      query = query.gte('created_at', dateRange.from.toISOString()).lte('created_at', dateRange.to.toISOString());
    }
    if (agentFilter !== 'all') {
      query = query.eq('user_id', agentFilter);
    }
    if (!isAdmin && currentUserId) {
      // non-admins see only their own logs
      query = query.eq('user_id', currentUserId);
    }
    return query;
  };

  const fetchTotalCount = async () => {
    try {
      let countQuery = supabase.from('actions_log').select('id', { count: 'exact', head: false });
      countQuery = applyFiltersToQuery(countQuery);
      const { count, error } = await countQuery;
      if (error) {
        console.warn('Erro ao buscar count de logs:', error);
        return null;
      }
      return typeof count === 'number' ? count : null;
    } catch (err) {
      console.error('Erro inesperado ao buscar count de logs:', err);
      return null;
    }
  };

  const loadLogs = async () => {
    setLoading(true);
    try {
      // Build main data query (no inline joins)
      const offset = Math.max(0, (page - 1) * Math.min(pageSize, MAX_PAGE_SIZE));
      let dataQuery: any = supabase
        .from('actions_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(Math.min(pageSize, MAX_PAGE_SIZE))
        .offset(offset);

      dataQuery = applyFiltersToQuery(dataQuery);

      const [{ data: rows, error: rowsError }, total] = await Promise.all([
        dataQuery,
        fetchTotalCount(),
      ]);

      if (rowsError) {
        console.error('Erro ao carregar logs (rows):', rowsError);
        toast.error('Erro ao carregar logs. Veja console para detalhes.');
        setLogs([]);
        setTotalCount(total ?? null);
        setLoading(false);
        return;
      }

      let logsData: LogEntry[] = (rows || []) as LogEntry[];

      // If agent columns are visible, batch-fetch missing profiles and map to logs
      const needAgent = columns.some(c => c.visible && (c.id === 'agent_name' || c.id === 'agent_email'));
      if (needAgent && logsData.length > 0) {
        // collect missing ids
        const missingIdsSet = new Set<string>();
        for (const l of logsData) {
          if (l.user_id && !agentCacheRef.current[l.user_id]) {
            missingIdsSet.add(l.user_id);
          } else if (l.user_id && agentCacheRef.current[l.user_id]) {
            // attach cached agent immediately
            l.agent = agentCacheRef.current[l.user_id] as LogEntry['agent'];
          }
        }

        const missingIds = Array.from(missingIdsSet);
        if (missingIds.length > 0) {
          // batch fetch up to 200 ids per call
          const BATCH = 200;
          for (let i = 0; i < missingIds.length; i += BATCH) {
            const batchIds = missingIds.slice(i, i + BATCH);
            try {
              const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('id, display_name, email')
                .in('id', batchIds);
              if (profilesError) {
                console.warn('Erro ao buscar perfis de agentes (batch):', profilesError);
                continue;
              }
              if (profiles) {
                for (const p of profiles) {
                  agentCacheRef.current[p.id] = { id: p.id, display_name: p.display_name, email: p.email };
                }
                // persist partially fetched cache
                try {
                  sessionStorage.setItem(SESSION_AGENT_CACHE_KEY, JSON.stringify(agentCacheRef.current));
                } catch {
                  // ignore
                }
              }
            } catch (err) {
              console.error('Erro fetch perfis batch:', err);
            }
          }
          // attach agent objects to logs after all batches processed
          logsData = logsData.map(l => ({
            ...l,
            agent: l.user_id ? (agentCacheRef.current[l.user_id] || null) : null,
          }));
        }
      }

      setLogs(logsData);
      setTotalCount(total ?? null);
    } catch (err) {
      console.error('Erro inesperado ao carregar logs:', err);
      toast.error('Erro inesperado ao carregar logs. Veja console.');
      setLogs([]);
      setTotalCount(null);
    } finally {
      setLoading(false);
    }
  };

  const toggleColumn = (columnId: string) => {
    const newColumns = columns.map(col => (col.id === columnId ? { ...col, visible: !col.visible } : col));
    setColumns(newColumns);
    localStorage.setItem('logs_columns', JSON.stringify(newColumns));
  };

  const handlePrev = () => {
    if (page > 1) setPage(page - 1);
  };
  const handleNext = () => {
    if (totalCount === null) {
      setPage(page + 1);
      return;
    }
    const maxPage = Math.max(1, Math.ceil(totalCount / pageSize));
    if (page < maxPage) setPage(page + 1);
  };

  const startIndex = (page - 1) * pageSize + 1;
  const endIndex = Math.min((page - 1) * pageSize + logs.length, totalCount ?? (page - 1) * pageSize + logs.length);

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="container mx-auto max-w-7xl">
        <div className="flex justify-between items-center mb-6">
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <UserMenu />
        </div>

        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">🧾 Logs de Ações</h1>
            <div className="flex items-center gap-2">
              <div className="text-sm text-muted-foreground">
                {totalCount !== null
                  ? `Mostrando ${startIndex}-${endIndex} de ${totalCount.toLocaleString()}`
                  : `Mostrando ${startIndex}-${endIndex}`}
              </div>
              <Button onClick={loadLogs} variant="outline">Atualizar</Button>
            </div>
          </div>

          {/* Filters Section */}
          <div className="mb-6 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-4 h-4" />
              <h2 className="font-semibold">Filtros</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Período</Label>
                <Select value={dateFilter} onValueChange={(value) => { setDateFilter(value as DateFilter); setPage(1); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Hoje</SelectItem>
                    <SelectItem value="week">Esta Semana</SelectItem>
                    <SelectItem value="month">Este Mês</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                    <SelectItem value="all">Todos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {dateFilter === 'custom' && (
                <>
                  <div className="space-y-2">
                    <Label>Data Inicial</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          {customDateFrom ? format(customDateFrom, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecionar'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={customDateFrom} onSelect={setCustomDateFrom} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Data Final</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          {customDateTo ? format(customDateTo, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecionar'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={customDateTo} onSelect={setCustomDateTo} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>
                </>
              )}

              {isAdmin && (
                <div className="space-y-2">
                  <Label>Agente/Operador</Label>
                  <Select value={agentFilter} onValueChange={(v) => { setAgentFilter(v); setPage(1); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Agentes</SelectItem>
                      {agents.map(a => <SelectItem key={a.id} value={a.id}>{a.display_name || a.email}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Columns className="w-4 h-4" />
                    Colunas ({visibleColumns.length}/{columns.length})
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64">
                  <div className="space-y-2">
                    <h3 className="font-semibold mb-2">Selecionar Colunas</h3>
                    {columns.map(col => (
                      <div key={col.id} className="flex items-center space-x-2">
                        <Checkbox id={col.id} checked={col.visible} onCheckedChange={() => toggleColumn(col.id)} />
                        <Label htmlFor={col.id} className="text-sm font-normal cursor-pointer">{col.label}</Label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <p className="text-center text-muted-foreground">Carregando...</p>
          ) : logs.length === 0 ? (
            <p className="text-center text-muted-foreground">Nenhum log encontrado</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {visibleColumns.map(col => <TableHead key={col.id}>{col.label}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map(log => (
                    <TableRow key={log.id}>
                      {visibleColumns.map(col => {
                        switch (col.id) {
                          case 'created_at':
                            return <TableCell key={col.id} className="whitespace-nowrap">{format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss')}</TableCell>;
                          case 'lead_id':
                            return <TableCell key={col.id}>{log.lead_id}</TableCell>;
                          case 'action_label':
                            return <TableCell key={col.id} className="font-medium">{log.action_label}</TableCell>;
                          case 'status':
                            return <TableCell key={col.id}>
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${log.status === 'OK' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{log.status}</span>
                            </TableCell>;
                          case 'agent_name':
                            return <TableCell key={col.id}>{log.agent?.display_name || <span className="text-muted-foreground italic">—</span>}</TableCell>;
                          case 'agent_email':
                            return <TableCell key={col.id}>{log.agent?.email || <span className="text-muted-foreground italic">—</span>}</TableCell>;
                          case 'details':
                          default:
                            return <TableCell key={col.id}><pre className="whitespace-pre-wrap text-xs">{JSON.stringify(log.payload || {}, null, 2)}</pre></TableCell>;
                        }
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination controls */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <Button onClick={handlePrev} disabled={page <= 1} variant="outline">Anterior</Button>
              <Button onClick={handleNext} disabled={totalCount !== null && page >= Math.ceil(totalCount / pageSize)} variant="outline">Próxima</Button>
              <div className="text-sm text-muted-foreground ml-4">
                Página {page}{totalCount ? ` de ${Math.max(1, Math.ceil(totalCount / pageSize))}` : ''}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Label>Items por página</Label>
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Math.min(Number(v), MAX_PAGE_SIZE)); setPage(1); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Logs;
