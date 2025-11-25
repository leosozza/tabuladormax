import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useSyscallCampaigns } from "@/hooks/useSyscallCampaigns";
import { DateFilterSelector } from "@/components/DateFilterSelector";
import { DateFilter } from "@/types/filters";
import { createDateFilter } from "@/lib/dateUtils";
import { Send, Filter, X } from "lucide-react";

export function LeadBatchSelector() {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>(createDateFilter('month'));
  const [projetoComercial, setProjetoComercial] = useState<string>("all");
  const [fonte, setFonte] = useState<string>("all");
  const [etapa, setEtapa] = useState<string>("all");
  const { campaigns, uploadLeads, isUploading } = useSyscallCampaigns();

  // Buscar projetos comerciais da tabela commercial_projects
  const { data: projetos } = useQuery({
    queryKey: ["filter-projetos-comerciais"],
    queryFn: async () => {
      const { data } = await supabase
        .from("commercial_projects")
        .select("id, name")
        .eq("active", true)
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

  // Buscar etapas únicas
  const { data: etapas } = useQuery({
    queryKey: ["filter-etapas"],
    queryFn: async () => {
      const { data } = await supabase
        .from("leads")
        .select("etapa")
        .not("etapa", "is", null);
      const unique = [...new Set(data?.map(d => d.etapa).filter(Boolean))];
      return unique.sort();
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

      // Aplicar filtro de data
      if (dateFilter.startDate) {
        query = query.gte('criado', dateFilter.startDate.toISOString());
      }
      if (dateFilter.endDate) {
        query = query.lte('criado', dateFilter.endDate.toISOString());
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
    setDateFilter(createDateFilter('month'));
    setProjetoComercial("all");
    setFonte("all");
    setEtapa("all");
    setSelectedLeads([]);
  };

  const handleSend = () => {
    if (!selectedCampaignId || selectedLeads.length === 0) return;

    const campaign = campaigns?.find((c) => c.id === selectedCampaignId);
    if (!campaign) return;

    const leadsToSend = leads
      ?.filter((l) => selectedLeads.includes(l.id))
      .map((l) => ({
        lead_id: l.id,
        telefone: l.celular,
        nome: l.name || "",
      })) || [];

    uploadLeads({
      campaign_id: campaign.id,
      syscall_campaign_id: campaign.syscall_campaign_id,
      leads: leadsToSend,
    });
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
                {isLoadingLeads ? "..." : totalLeads}
              </Badge>
              <span className="text-sm font-medium">
                leads encontrados com telefone
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
              disabled={leads.length === 0}
            >
              {selectedLeads.length === leads.length ? "Desmarcar Todos" : "Selecionar Todos"}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
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

      <div className="flex justify-end">
        <Button
          onClick={handleSend}
          disabled={!selectedCampaignId || selectedLeads.length === 0 || isUploading}
        >
          <Send className="mr-2 h-4 w-4" />
          Enviar {selectedLeads.length} Leads
        </Button>
      </div>
    </div>
  );
}
