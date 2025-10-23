// @ts-nocheck
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FinancialFilterState } from "./FinancialFilters";
import type { Project } from "@/repositories/types";

interface ProjectFiltersProps {
  projetos: Project[];
  filters: FinancialFilterState;
  setFilters: (filters: FinancialFilterState) => void;
}

export function ProjectFilters({ projetos, filters, setFilters }: ProjectFiltersProps) {
  return (
    <div className="flex gap-4">
      <Select
        value={filters.projeto || "all-projects"}
        onValueChange={(value) => setFilters({ ...filters, projeto: value === "all-projects" ? "" : value })}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Filtrar por projeto" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all-projects">Todos os projetos</SelectItem>
          {projetos.map((projeto, index) => (
            <SelectItem key={index} value={projeto['Agencia e Seletiva'] || projeto.nome}>
              {projeto['Agencia e Seletiva'] || projeto.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.scouter || "all-scouters"}
        onValueChange={(value) => setFilters({ ...filters, scouter: value === "all-scouters" ? "" : value })}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Filtrar por scouter" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all-scouters">Todos os scouters</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}