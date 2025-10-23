import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import GestaoSidebar from "@/components/gestao/Sidebar";
import LeadDetailModal from "@/components/gestao/LeadDetailModal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Download, Eye } from "lucide-react";
import { format } from "date-fns";

export default function GestaoLeads() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  
  const { data: leads, isLoading } = useQuery({
    queryKey: ["gestao-leads", searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("leads")
        .select("*")
        .order("criado", { ascending: false })
        .limit(100);
      
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,celular.ilike.%${searchTerm}%,scouter.ilike.%${searchTerm}%`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const handleExport = () => {
    if (!leads) return;
    
    const csv = [
      ["Nome", "Telefone", "Scouter", "Status", "Data Criação"],
      ...leads.map(lead => [
        lead.name || "",
        lead.celular || "",
        lead.scouter || "",
        lead.status_tabulacao || "",
        lead.criado ? format(new Date(lead.criado), "dd/MM/yyyy") : ""
      ])
    ].map(row => row.join(",")).join("\n");
    
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
        </div>

        {isLoading ? (
          <div className="text-center py-12">Carregando leads...</div>
        ) : (
          <div className="border rounded-lg bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Scouter</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ficha Confirmada</TableHead>
                  <TableHead>Data Criação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum lead encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  leads?.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">{lead.name || "-"}</TableCell>
                      <TableCell>{lead.celular || "-"}</TableCell>
                      <TableCell>{lead.scouter || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{lead.status_tabulacao || "Sem status"}</Badge>
                      </TableCell>
                      <TableCell>
                        {lead.ficha_confirmada ? (
                          <span className="text-green-600 font-medium">Sim</span>
                        ) : (
                          <span className="text-muted-foreground">Não</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {lead.criado ? format(new Date(lead.criado), "dd/MM/yyyy HH:mm") : "-"}
                      </TableCell>
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
