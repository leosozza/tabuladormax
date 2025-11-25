import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useSyscallCampaigns } from "@/hooks/useSyscallCampaigns";
import { DateFilterSelector } from "@/components/DateFilterSelector";
import { DateFilter } from "@/types/filters";
import { createDateFilter } from "@/lib/dateUtils";
import { Send, Filter, X } from "lucide-react";
import { toast } from "sonner";

export function LeadBatchSelector() {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>(createDateFilter('all'));
  const [projetoComercial, setProjetoComercial] = useState<string>("all");
  const [fonte, setFonte] = useState<string>("all");
  const [etapa, setEtapa] = useState<string>("all");
  const [sendAllFiltered, setSendAllFiltered] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const { campaigns, uploadLeads, isUploading } = useSyscallCampaigns();

  // Buscar projetos comerciais filtrados pelo período selecionado
  const { data: projetos } = useQuery({
    queryKey: ["filter-projetos-comerciais", dateFilter],
    queryFn: async () => {
      // Buscar IDs de projetos que têm leads no período
      let leadsQuery = supabase
        .from("leads")
        .select("commercial_project_id")
        .not("commercial_project_id", "is", null)
        .not("celular", "is", null);

      // Aplicar filtro de data se não for "all"
      if (dateFilter.preset !== 'all') {
        leadsQuery = leadsQuery
          .gte('criado', dateFilter.startDate.toISOString())
          .lte('criado', dateFilter.endDate.toISOString());
      }

      const { data: leadsWithProject } = await leadsQuery;
      const projectIds = [...new Set(leadsWithProject?.map(l => l.commercial_project_id).filter(Boolean))];

      if (projectIds.length === 0) return [];

      // Buscar nomes dos projetos
      const { data } = await supabase
        .from("commercial_projects")
        .select("id, name")
        .in("id", projectIds)
        .order("name");
      
      return data || [];
    },
  });

  // Buscar fontes únicas
  const { data: fontes } = useQuery({
    queryKey: ["filter-fontes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("leads")
        .select("fonte")
        .not("fonte", "is", null);
      const unique = [...new Set(data?.map(d => d.fonte).filter(Boolean))];
      return unique.sort();
    },
  });

  // Buscar etapas normalizadas usando função do banco
  const { data: etapas } = useQuery({
    queryKey: ["filter-etapas-normalizadas"],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_normalized_etapas');
      return data?.map(e => e.etapa_normalized).filter(Boolean) || [];
    },
  });

  const { data: leadsData, isLoading: isLoadingLeads } = useQuery({
    queryKey: ["leads-for-dialer", dateFilter, projetoComercial, fonte, etapa],
    queryFn: async () => {
      let query = supabase
        .from("leads")
        .select(`
          id, name, celular, fonte, etapa, criado, commercial_project_id,
          commercial_projects!commercial_project_id (name)
        `, { count: 'exact' })
        .not("celular", "is", null);

      // Aplicar filtro de data apenas se não for "all"
      if (dateFilter.preset !== 'all') {
        if (dateFilter.startDate) {
          query = query.gte('criado', dateFilter.startDate.toISOString());
        }
        if (dateFilter.endDate) {
          query = query.lte('criado', dateFilter.endDate.toISOString());
        }
      }

      // Aplicar filtros
      if (projetoComercial !== "all") {
        query = query.eq('commercial_project_id', projetoComercial);
      }
      if (fonte !== "all") {
        query = query.eq('fonte', fonte);
      }
      if (etapa !== "all") {
        query = query.eq('etapa', etapa);
      }

      const { data, error, count } = await query.order('criado', { ascending: false }).limit(500);
      if (error) throw error;
      return { leads: data || [], count: count || 0 };
    },
  });

  const leads = leadsData?.leads || [];
  const totalLeads = leadsData?.count || 0;

  const handleToggleLead = (leadId: number) => {
    setSelectedLeads((prev) =>
      prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId]
    );
  };

  const handleSelectAll = () => {
    if (selectedLeads.length === leads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(leads.map(l => l.id));
    }
  };

  const handleClearFilters = () => {
    setDateFilter(createDateFilter('all'));
    setProjetoComercial("all");
    setFonte("all");
    setEtapa("all");
    setSelectedLeads([]);
  };

  const handleSend = async () => {
    if (!selectedCampaignId) return;
    if (!sendAllFiltered && selectedLeads.length === 0) return;

    const campaign = campaigns?.find((c) => c.id === selectedCampaignId);
    if (!campaign) return;

    try {
      if (sendAllFiltered) {
        // Buscar TODOS os IDs dos leads filtrados (sem limite)
        let query = supabase
          .from("leads")
          .select("id, celular, name")
          .not("celular", "is", null);

        // Aplicar os mesmos filtros
        if (dateFilter.preset !== 'all') {
          if (dateFilter.startDate) {
            query = query.gte('criado', dateFilter.startDate.toISOString());
          }
          if (dateFilter.endDate) {
            query = query.lte('criado', dateFilter.endDate.toISOString());
          }
        }

        if (projetoComercial !== "all") {
          query = query.eq('commercial_project_id', projetoComercial);
        }
        if (fonte !== "all") {
          query = query.eq('fonte', fonte);
        }
        if (etapa !== "all") {
          query = query.eq('etapa', etapa);
        }

        const { data: allLeads, error } = await query;
        if (error) throw error;

        // Enviar em lotes de 500
        const batchSize = 500;
        const batches = Math.ceil((allLeads?.length || 0) / batchSize);
        setTotalBatches(batches);

        for (let i = 0; i < (allLeads?.length || 0); i += batchSize) {
          const batch = allLeads?.slice(i, i + batchSize) || [];
          setCurrentBatch(Math.floor(i / batchSize) + 1);
          setUploadProgress(((i + batch.length) / (allLeads?.length || 1)) * 100);

          const leadsToSend = batch.map((l) => ({
            lead_id: l.id,
            telefone: l.celular,
            nome: l.name || "",
          }));

          await uploadLeads({
            campaign_id: campaign.id,
            syscall_campaign_id: campaign.syscall_campaign_id,
            leads: leadsToSend,
          });
        }

        toast.success(`${allLeads?.length.toLocaleString()} leads enviados com sucesso!`);
        setUploadProgress(0);
        setCurrentBatch(0);
        setTotalBatches(0);
      } else {
        // Envio normal (apenas leads selecionados)
        const leadsToSend = leads
          ?.filter((l) => selectedLeads.includes(l.id))
          .map((l) => ({
            lead_id: l.id,
            telefone: l.celular,
            nome: l.name || "",
          })) || [];

        await uploadLeads({
          campaign_id: campaign.id,
          syscall_campaign_id: campaign.syscall_campaign_id,
          leads: leadsToSend,
        });
      }
    } catch (error) {
      console.error("Erro ao enviar leads:", error);
      toast.error("Erro ao enviar leads");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Selecionar Campanha</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
            <SelectTrigger>
              <SelectValue placeholder="Escolha uma campanha" />
            </SelectTrigger>
            <SelectContent>
              {campaigns?.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtrar Leads
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Data de Criação</label>
              <DateFilterSelector value={dateFilter} onChange={setDateFilter} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Projeto Comercial</label>
              <Select value={projetoComercial} onValueChange={setProjetoComercial}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os projetos" />
                </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os projetos</SelectItem>
              {projetos?.map((projeto) => (
                <SelectItem key={projeto.id} value={projeto.id}>
                  {projeto.name}
                </SelectItem>
              ))}
            </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Fonte</label>
              <Select value={fonte} onValueChange={setFonte}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as fontes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as fontes</SelectItem>
                  {fontes?.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Etapa</label>
              <Select value={etapa} onValueChange={setEtapa}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as etapas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as etapas</SelectItem>
                  {etapas?.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-lg px-4 py-2">
                {isLoadingLeads ? "..." : totalLeads.toLocaleString()}
              </Badge>
              <span className="text-sm font-medium">
                leads encontrados
                {totalLeads > 500 && (
                  <span className="text-muted-foreground"> (exibindo primeiros 500)</span>
                )}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Selecionar Leads ({selectedLeads.length} selecionados)</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              disabled={leads.length === 0 || sendAllFiltered}
            >
              {selectedLeads.length === leads.length ? "Desmarcar Todos" : "Selecionar Todos"}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-start gap-3">
              <Checkbox 
                id="send-all"
                checked={sendAllFiltered} 
                onCheckedChange={(checked) => {
                  setSendAllFiltered(checked as boolean);
                  if (checked) {
                    setSelectedLeads([]);
                  }
                }} 
              />
              <label htmlFor="send-all" className="text-sm cursor-pointer">
                <span className="font-semibold">Enviar TODOS os {totalLeads.toLocaleString()} leads filtrados</span>
                <p className="text-muted-foreground mt-1">
                  {totalLeads > 500 
                    ? `Enviará todos os leads em lotes de 500 (não apenas os ${leads.length} visíveis)`
                    : "Ignora seleção manual e envia todos os leads encontrados"}
                </p>
              </label>
            </div>
          </div>
          {isLoadingLeads ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando leads...
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum lead encontrado com os filtros selecionados
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {leads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center space-x-2 p-2 hover:bg-accent rounded"
                >
                  <Checkbox
                    checked={selectedLeads.includes(lead.id)}
                    onCheckedChange={() => handleToggleLead(lead.id)}
                    disabled={sendAllFiltered}
                  />
                  <div className="flex-1">
                    <p className="font-medium">{lead.name || "Sem nome"}</p>
                    <p className="text-sm text-muted-foreground">{lead.celular}</p>
                    {(lead.commercial_projects?.name || lead.fonte || lead.etapa) && (
                      <div className="flex gap-2 mt-1">
                        {lead.commercial_projects?.name && (
                          <Badge variant="outline" className="text-xs">
                            {lead.commercial_projects.name}
                          </Badge>
                        )}
                        {lead.fonte && (
                          <Badge variant="outline" className="text-xs">
                            {lead.fonte}
                          </Badge>
                        )}
                        {lead.etapa && (
                          <Badge variant="outline" className="text-xs">
                            {lead.etapa}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {isUploading && totalBatches > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Enviando leads...</span>
                <span className="text-muted-foreground">
                  Lote {currentBatch} de {totalBatches}
                </span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button
          onClick={handleSend}
          disabled={!selectedCampaignId || (!sendAllFiltered && selectedLeads.length === 0) || isUploading}
        >
          <Send className="mr-2 h-4 w-4" />
          {sendAllFiltered 
            ? `Enviar ${totalLeads.toLocaleString()} Leads` 
            : `Enviar ${selectedLeads.length} Leads`}
        </Button>
      </div>
    </div>
  );
}
