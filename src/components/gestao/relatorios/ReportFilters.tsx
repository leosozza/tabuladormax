import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";

interface ReportFiltersProps {
  onApplyFilters: (filters: FilterValues) => void;
  onClearFilters: () => void;
}

export interface FilterValues {
  startDate?: string;
  endDate?: string;
  scouter?: string;
  status?: string;
  area?: string;
}

export default function ReportFilters({ onApplyFilters, onClearFilters }: ReportFiltersProps) {
  const [filters, setFilters] = useState<FilterValues>({});

  const handleApply = () => {
    onApplyFilters(filters);
  };

  const handleClear = () => {
    setFilters({});
    onClearFilters();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="w-5 h-5" />
          Filtros de Relatório
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">Data Inicial</Label>
            <Input
              id="startDate"
              type="date"
              value={filters.startDate || ""}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">Data Final</Label>
            <Input
              id="endDate"
              type="date"
              value={filters.endDate || ""}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={filters.status || ""}
              onValueChange={(value) => setFilters({ ...filters, status: value })}
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="confirmado">Confirmados</SelectItem>
                <SelectItem value="compareceu">Compareceram</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="area">Área de Abordagem</Label>
            <Input
              id="area"
              placeholder="Digite a área..."
              value={filters.area || ""}
              onChange={(e) => setFilters({ ...filters, area: e.target.value })}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleApply} className="flex-1">
            <Filter className="w-4 h-4 mr-2" />
            Aplicar Filtros
          </Button>
          <Button onClick={handleClear} variant="outline">
            <X className="w-4 h-4 mr-2" />
            Limpar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
