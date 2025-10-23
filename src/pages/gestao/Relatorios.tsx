import { useState } from "react";
import GestaoSidebar from "@/components/gestao/Sidebar";
import ReportFilters, { type FilterValues } from "@/components/gestao/relatorios/ReportFilters";
import ReportExport from "@/components/gestao/relatorios/ReportExport";

export default function GestaoRelatorios() {
  const [filters, setFilters] = useState<FilterValues>({});

  const handleApplyFilters = (newFilters: FilterValues) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  return (
    <div className="flex min-h-screen bg-background">
      <GestaoSidebar />
      
      <div className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Relatórios e Exportação</h1>
          <p className="text-muted-foreground">Exporte dados filtrados em diversos formatos</p>
        </div>

        <div className="space-y-6">
          <ReportFilters 
            onApplyFilters={handleApplyFilters}
            onClearFilters={handleClearFilters}
          />

          <ReportExport filters={filters} />
        </div>
      </div>
    </div>
  );
}
