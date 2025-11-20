import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageLayout } from "@/components/layouts/AdminPageLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, AlertCircle, CheckCircle2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getBitrixFieldLabel } from '@/lib/fieldLabelUtils';

interface Lead {
  id: number;
  name: string | null;
  updated_at: string | null;
  sync_errors: any;
  has_sync_errors: boolean;
  responsible: string | null;
  scouter: string | null;
}

export default function SyncErrors() {
  const [errorLeads, setErrorLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [resyncing, setResyncing] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadErrorLeads();
  }, []);

  async function loadErrorLeads() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('id, name, updated_at, sync_errors, has_sync_errors, responsible, scouter')
        .eq('has_sync_errors', true)
        .order('updated_at', { ascending: false })
        .limit(200);
      
      if (error) throw error;
      setErrorLeads(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar leads com erros:', error);
      toast.error('Erro ao carregar leads com problemas de sincronização');
    } finally {
      setLoading(false);
    }
  }

  async function handleResyncSingle(leadId: number) {
    setResyncing(prev => new Set(prev).add(leadId));
    
    try {
      // Chamar função de resync para um único lead
      const { error } = await supabase.functions.invoke('bitrix-resync-leads', {
        body: {
          action: 'create',
          config: {
            filter_criteria: { lead_ids: [leadId] },
            batch_size: 1
          }
        }
      });

      if (error) throw error;
      
      toast.success('Re-sincronização iniciada para o lead');
      
      // Recarregar após 3 segundos
      setTimeout(() => {
        loadErrorLeads();
      }, 3000);
    } catch (error: any) {
      console.error('Erro ao re-sincronizar lead:', error);
      toast.error('Erro ao iniciar re-sincronização');
    } finally {
      setResyncing(prev => {
        const next = new Set(prev);
        next.delete(leadId);
        return next;
      });
    }
  }

  async function handleClearError(leadId: number) {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ sync_errors: null, has_sync_errors: false })
        .eq('id', leadId);

      if (error) throw error;
      
      toast.success('Erro marcado como resolvido');
      loadErrorLeads();
    } catch (error: any) {
      console.error('Erro ao limpar erro:', error);
      toast.error('Erro ao marcar como resolvido');
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const getErrorCount = (lead: Lead) => {
    try {
      return lead.sync_errors?.errors?.length || 0;
    } catch {
      return 0;
    }
  };

  return (
    <AdminPageLayout
      title="Erros de Sincronização"
      description="Leads com problemas de sincronização do Bitrix"
      actions={
        <Button onClick={loadErrorLeads} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      }
    >
      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total com Erros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <span className="text-3xl font-bold">{errorLeads.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Campos com Erro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              <span className="text-3xl font-bold">
                {errorLeads.reduce((sum, lead) => sum + getErrorCount(lead), 0)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Responsáveis Afetados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              <span className="text-3xl font-bold">
                {new Set(errorLeads.map(l => l.responsible).filter(Boolean)).size}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Leads com Erros */}
      <Card>
        <CardHeader>
          <CardTitle>Leads com Problemas de Sincronização</CardTitle>
          <CardDescription>
            Leads que não puderam ser sincronizados completamente. Campos problemáticos foram ignorados mas o lead foi salvo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : errorLeads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
              <p className="text-lg font-medium">Nenhum lead com erros!</p>
              <p className="text-sm">Todos os leads foram sincronizados com sucesso.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Última Atualização</TableHead>
                    <TableHead>Erros</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {errorLeads.map(lead => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-mono text-xs">{lead.id}</TableCell>
                      <TableCell className="font-medium">{lead.name || <span className="text-muted-foreground italic">Sem nome</span>}</TableCell>
                      <TableCell className="text-sm">{lead.responsible || '-'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(lead.updated_at)}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 max-w-md">
                          <Badge variant="destructive" className="mb-1">
                            {getErrorCount(lead)} campo(s) com erro
                          </Badge>
                          {lead.sync_errors?.errors?.map((err: any, i: number) => (
                            <div key={i} className="text-xs border-l-2 border-destructive pl-2 py-1">
                              <div className="font-semibold text-destructive">
                                {getBitrixFieldLabel({
                                  field_id: err.field,
                                  display_name: err.display_name
                                })}
                              </div>
                              <code className="text-xs text-muted-foreground">({err.field})</code>
                              <br />
                              <span className="text-muted-foreground">{err.error}</span>
                              {err.attempted_value && (
                                <>
                                  <br />
                                  <span className="text-xs text-muted-foreground">
                                    Tentou: <code>{JSON.stringify(err.attempted_value)}</code>
                                  </span>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleResyncSingle(lead.id)}
                            disabled={resyncing.has(lead.id)}
                          >
                            <RefreshCw className={`w-3 h-3 mr-1 ${resyncing.has(lead.id) ? 'animate-spin' : ''}`} />
                            Re-sync
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleClearError(lead.id)}
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Resolver
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            asChild
                          >
                            <a href={`/scouter/leads?id=${lead.id}`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminPageLayout>
  );
}
