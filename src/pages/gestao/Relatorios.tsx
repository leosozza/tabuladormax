import { useState } from "react";
import { GestaoPageLayout } from "@/components/layouts/GestaoPageLayout";
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
    <GestaoPageLayout
      title="Relatórios e Exportação"
      description="Exporte dados filtrados em diversos formatos"
    >
      <div className="space-y-6">
        <ReportFilters
            onApplyFilters={handleApplyFilters}
            onClearFilters={handleClearFilters}
          />

        <ReportExport filters={filters} />
      </div>
    </GestaoPageLayout>
  );
}
