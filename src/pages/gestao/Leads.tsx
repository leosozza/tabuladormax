import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import GestaoSidebar from "@/components/gestao/Sidebar";
import LeadDetailModal from "@/components/gestao/LeadDetailModal";
import { LeadColumnSelector } from "@/components/gestao/LeadColumnSelector";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download, Eye } from "lucide-react";
import { format } from "date-fns";
import { GestaoFiltersComponent } from "@/components/gestao/GestaoFilters";
import { GestaoFilters } from "@/types/filters";
import { createDateFilter } from "@/lib/dateUtils";
import { useLeadColumnConfig, LeadColumnConfigProvider } from "@/hooks/useLeadColumnConfig";
import { useGestaoFieldMappings } from "@/hooks/useGestaoFieldMappings";
import { useBitrixSpa } from "@/hooks/useBitrixSpa";
import { useBitrixEnums } from "@/hooks/useBitrixEnums";

function GestaoLeadsContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [filters, setFilters] = useState<GestaoFilters>({
    dateFilter: createDateFilter('month'),
    projectId: null,
    scouterId: null
  });
  const { visibleColumns } = useLeadColumnConfig();
  const { data: allFields, isLoading: isLoadingFields } = useGestaoFieldMappings();
  
  const { data: leads, isLoading } = useQuery({
    queryKey: ["gestao-leads", searchTerm, filters, visibleColumns],
    queryFn: async () => {
      // Campos obrigatórios (sempre necessários)
      const mandatoryFields = ['id', 'name', 'criado'];
      
      // Campos das colunas visíveis
      const visibleFieldKeys = visibleColumns || [];
      
      // Combinar e remover duplicatas
      const fieldsToSelect = Array.from(new Set([
        ...mandatoryFields,
        ...visibleFieldKeys
      ]));
      
      // Detectar se algum campo visível precisa do relacionamento commercial_projects
      const needsCommercialProject = visibleFieldKeys.some(key => 
        key === 'commercial_project_id' || 
        key.startsWith('commercial_projects.')
      );
      
      // Construir cláusula SELECT
      let selectClause = fieldsToSelect.join(',');
      if (needsCommercialProject && !selectClause.includes('commercial_projects:')) {
        selectClause += ',commercial_projects:commercial_project_id(id,name,code)';
      }
      
      let query = supabase
        .from("leads")
        .select(selectClause)
        .order("criado", { ascending: false })
        .limit(100);
      
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,scouter.ilike.%${searchTerm}%`);
      }

      // Filtro de data
      query = query
        .gte("criado", filters.dateFilter.startDate.toISOString())
        .lte("criado", filters.dateFilter.endDate.toISOString());

      // Filtro de projeto
      if (filters.projectId) {
        query = query.eq("commercial_project_id", filters.projectId);
      }

      // Filtro de scouter
      if (filters.scouterId) {
        query = query.eq("scouter", filters.scouterId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
  });

  // Get visible field configurations from dynamic mappings in the correct order
  const visibleFields = visibleColumns
    .map(key => allFields?.find(field => field.key === key))
    .filter((field): field is NonNullable<typeof field> => field !== undefined);

  // Montar requisições SPA para resolver IDs antigos
  const spaRequests = useMemo(() => {
    if (!leads || !visibleFields) return [];

    const requests: { bitrixField: string; bitrixItemId: number }[] = [];
    const seen = new Set<string>();

    for (const lead of leads) {
      for (const field of visibleFields) {
        if (field.bitrixFieldType !== 'crm_entity' || !field.bitrixField) continue;
        
        const raw = lead[field.key as keyof typeof lead];
        const id = raw != null ? Number(raw) : NaN;
        
        if (!Number.isNaN(id) && id > 0) {
          const key = `${field.bitrixField}-${id}`;
          if (!seen.has(key)) {
            seen.add(key);
            requests.push({ bitrixField: field.bitrixField, bitrixItemId: id });
          }
        }
      }
    }

    return requests;
  }, [leads, visibleFields]);

  const { data: spaResolutions } = useBitrixSpa(spaRequests);

  // Montar requisições de enum para resolver códigos técnicos
  const enumRequests = useMemo(() => {
    if (!leads || !visibleFields) return [];

    const requests: { bitrixField: string; value: unknown; bitrixFieldType?: string }[] = [];
    const seen = new Set<string>();

    for (const lead of leads) {
      for (const field of visibleFields) {
        if (!field.bitrixField || !field.bitrixFieldType) continue;
        if (!['enumeration', 'crm_status', 'crm_stage'].includes(field.bitrixFieldType)) continue;

        const rawValue = lead[field.key as keyof typeof lead];
        if (rawValue == null || rawValue === '') continue;

        const key = `${field.bitrixField}:${rawValue}`;
        if (!seen.has(key)) {
          seen.add(key);
          requests.push({
            bitrixField: field.bitrixField,
            value: rawValue,
            bitrixFieldType: field.bitrixFieldType,
          });
        }
      }
    }

    return requests;
  }, [leads, visibleFields]);

  const { getResolution } = useBitrixEnums(enumRequests);

  const handleExport = () => {
    if (!leads) return;
    
    const headers = visibleFields.map(field => field.label);
    const rows = leads.map(lead => 
      visibleFields.map(field => {
        // Lidar com campos aninhados no export
        let value;
        if (field.key.includes('.')) {
          const [table, column] = field.key.split('.');
          value = lead[table]?.[column];
        } else {
          value = lead[field.key];
        }
        
        // Apply formatter if available
        if (field.formatter) {
          const formatted = field.formatter(value, lead);
          // Se o formatter retorna um ReactNode, tentar extrair texto
          return typeof formatted === 'string' ? formatted : value;
        }
        
        return value || "-";
      })
    );
    
    const csv = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  const handleLeadClick = (lead: any) => {
    setSelectedLead(lead);
    setModalOpen(true);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <GestaoSidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 border-b bg-background">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Gestão de Leads</h1>
            <div className="flex gap-2">
              <LeadColumnSelector />
              <Button onClick={handleExport} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </div>
          
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Input
                placeholder="Buscar por nome ou scouter..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
            </div>
            
            <GestaoFiltersComponent
              filters={filters}
              onChange={setFilters}
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {visibleFields.map((field) => (
                    <TableHead key={field.key}>{field.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={visibleFields.length} className="text-center">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : !leads?.length ? (
                  <TableRow>
                    <TableCell colSpan={visibleFields.length} className="text-center">
                      Nenhum lead encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  leads?.map((lead) => (
                    <TableRow 
                      key={lead.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleLeadClick(lead)}
                    >
                      {visibleFields.map((field) => {
                        // Lidar com campos aninhados (e.g., commercial_projects.name)
                        let value;
                        if (field.key.includes('.')) {
                          const [table, column] = field.key.split('.');
                          value = lead[table]?.[column];
                        } else {
                          value = lead[field.key];
                        }
                        
                        let displayValue = field.formatter 
                          ? field.formatter(value, lead) 
                          : value || "-";

                        // Resolver SPA (ex: scouter, projeto_comercial)
                        if (field.bitrixFieldType === 'crm_entity' && field.bitrixField && value != null) {
                          const id = Number(value);
                          if (!Number.isNaN(id) && id > 0) {
                            const spaKey = `${field.bitrixField}-${id}`;
                            const spaResolution = spaResolutions?.[spaKey];
                            if (spaResolution) {
                              displayValue = spaResolution.name;
                            }
                          }
                        }

                        // Resolver Enum (ex: etapa, status_fluxo)
                        if (field.bitrixField && field.bitrixFieldType && 
                            ['enumeration', 'crm_status', 'crm_stage'].includes(field.bitrixFieldType) &&
                            value != null && value !== '') {
                          const enumResolution = getResolution(field.bitrixField, value);
                          if (enumResolution) {
                            displayValue = enumResolution.label;
                          }
                        }
                        
                        return (
                          <TableCell key={field.key} className={field.key === 'name' ? 'font-medium' : ''}>
                            {displayValue}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <LeadDetailModal
        lead={selectedLead}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}

export default function GestaoLeads() {
  return (
    <LeadColumnConfigProvider>
      <GestaoLeadsContent />
    </LeadColumnConfigProvider>
  );
}
