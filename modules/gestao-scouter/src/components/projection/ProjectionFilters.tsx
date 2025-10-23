import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Filter, X, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectionType, Granularidade } from "@/repositories/projectionsRepo";

interface ProjectionFiltersProps {
  projectionType: ProjectionType;
  selectedFilter?: string;
  availableScouters: string[];
  availableProjetos: string[];
  dataInicioAnalise: string;
  dataFimAnalise: string;
  dataInicioProjecao: string;
  dataFimProjecao: string;
  granularidade: Granularidade;
  onProjectionTypeChange: (type: ProjectionType) => void;
  onSelectedFilterChange: (filter?: string) => void;
  onDataInicioAnaliseChange: (date: string) => void;
  onDataFimAnaliseChange: (date: string) => void;
  onDataInicioProjecaoChange: (date: string) => void;
  onDataFimProjecaoChange: (date: string) => void;
  onGranularidadeChange: (granularidade: Granularidade) => void;
}

export function ProjectionFilters({
  projectionType,
  selectedFilter,
  availableScouters,
  availableProjetos,
  dataInicioAnalise,
  dataFimAnalise,
  dataInicioProjecao,
  dataFimProjecao,
  granularidade,
  onProjectionTypeChange,
  onSelectedFilterChange,
  onDataInicioAnaliseChange,
  onDataFimAnaliseChange,
  onDataInicioProjecaoChange,
  onDataFimProjecaoChange,
  onGranularidadeChange,
}: ProjectionFiltersProps) {
  const availableOptions = projectionType === 'scouter' ? availableScouters : availableProjetos;
  const filterLabel = projectionType === 'scouter' ? 'Scouter' : 'Projeto';

  const clearFilters = () => {
    onSelectedFilterChange(undefined);
  };

  // Get yesterday as max date for analysis period
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const maxAnaliseDate = yesterday.toISOString().slice(0, 10);

  // Get today as min date for projection period
  const today = new Date();
  const minProjecaoDate = today.toISOString().slice(0, 10);

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Filter className="h-5 w-5" />
          Filtros de Projeção
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Período de Análise */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Período de Análise (dados históricos)</Label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="inicio-analise" className="text-xs text-muted-foreground">Início da Análise</Label>
              <Input
                id="inicio-analise"
                type="date"
                value={dataInicioAnalise}
                max={maxAnaliseDate}
                onChange={(e) => onDataInicioAnaliseChange(e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <Label htmlFor="fim-analise" className="text-xs text-muted-foreground">Fim da Análise (máx: ontem)</Label>
              <Input
                id="fim-analise"
                type="date"
                value={dataFimAnalise}
                max={maxAnaliseDate}
                onChange={(e) => onDataFimAnaliseChange(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>
        </div>

        {/* Período de Projeção */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Período de Projeção (futuro)</Label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="inicio-projecao" className="text-xs text-muted-foreground">Início da Projeção (mín: hoje)</Label>
              <Input
                id="inicio-projecao"
                type="date"
                value={dataInicioProjecao}
                min={minProjecaoDate}
                onChange={(e) => onDataInicioProjecaoChange(e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <Label htmlFor="fim-projecao" className="text-xs text-muted-foreground">Fim da Projeção</Label>
              <Input
                id="fim-projecao"
                type="date"
                value={dataFimProjecao}
                onChange={(e) => onDataFimProjecaoChange(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>
        </div>

        {/* Granularidade e Tipo de Análise */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Granularidade</label>
            <Select value={granularidade} onValueChange={(value: Granularidade) => onGranularidadeChange(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="diaria">Diária</SelectItem>
                <SelectItem value="semanal">Semanal</SelectItem>
                <SelectItem value="mensal">Mensal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Tipo de Análise</label>
            <Select value={projectionType} onValueChange={(value: ProjectionType) => onProjectionTypeChange(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scouter">Por Scouter</SelectItem>
                <SelectItem value="projeto">Por Projeto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">{filterLabel} Específico</label>
            <Select
              value={selectedFilter || "all"}
              onValueChange={(value) => onSelectedFilterChange(value === "all" ? undefined : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={`Todos os ${projectionType === 'scouter' ? 'scouters' : 'projetos'}`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os {projectionType === 'scouter' ? 'scouters' : 'projetos'}</SelectItem>
                {availableOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedFilter && (
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              {filterLabel}: {selectedFilter}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={clearFilters}
              />
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}