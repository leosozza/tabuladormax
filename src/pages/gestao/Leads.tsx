import { useState } from "react";
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
import { useLeadColumnConfig } from "@/hooks/useLeadColumnConfig";
import { useGestaoFieldMappings } from "@/hooks/useGestaoFieldMappings";

export default function GestaoLeads() {
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
    queryKey: ["gestao-leads", searchTerm, filters],
    queryFn: async () => {
      let query = supabase
        .from("leads")
        .select("*")
        .order("criado", { ascending: false })
        .limit(100);
      
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,celular.ilike.%${searchTerm}%,scouter.ilike.%${searchTerm}%`);
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
      return data;
    },
  });

  // Get visible field configurations from dynamic mappings
  const visibleFields = allFields?.filter(field => visibleColumns.includes(field.key)) || [];

  const handleExport = () => {
    if (!leads) return;
    
    const headers = visibleFields.map(field => field.label);
    const rows = leads.map(lead => 
      visibleFields.map(field => {
        const value = lead[field.key];
        if (field.formatter && value) {
          const formatted = field.formatter(value, lead);
          // Convert ReactNode to string for CSV
          return typeof formatted === 'string' ? formatted : String(formatted);
        }
        return value || "";
      })
    );
    
    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  return (
    <div className="flex min-h-screen bg-background">
      <GestaoSidebar />
      
      <div className="flex-1 p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Leads</h1>
            <p className="text-muted-foreground">Gerencie todos os leads capturados</p>
          </div>
          
          <Button onClick={handleExport} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </div>

        <GestaoFiltersComponent filters={filters} onChange={setFilters} />

        <div className="mb-6 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, telefone ou scouter..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <LeadColumnSelector />
        </div>

        {isLoading || isLoadingFields ? (
          <div className="text-center py-12">Carregando...</div>
        ) : (
          <div className="border rounded-lg bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {visibleFields.map((field) => (
                    <TableHead key={field.key}>{field.label}</TableHead>
                  ))}
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={visibleFields.length + 1} className="text-center py-8 text-muted-foreground">
                      Nenhum lead encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  leads?.map((lead) => (
                    <TableRow key={lead.id}>
                      {visibleFields.map((field) => {
                        const value = lead[field.key];
                        const formattedValue = field.formatter 
                          ? field.formatter(value, lead) 
                          : value || "-";
                        
                        return (
                          <TableCell key={field.key} className={field.key === 'name' ? 'font-medium' : ''}>
                            {formattedValue}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedLead(lead);
                            setModalOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
        
        {leads && leads.length > 0 && (
          <div className="mt-4 text-sm text-muted-foreground">
            Mostrando {leads.length} leads
          </div>
        )}
      </div>

      <LeadDetailModal
        lead={selectedLead}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}
