import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Filter, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
  projectId?: string;
  projectName?: string;
  fonte?: string;
}

interface CommercialProject {
  id: string;
  name: string;
  code: string;
}

export default function ReportFilters({ onApplyFilters, onClearFilters }: ReportFiltersProps) {
  const [filters, setFilters] = useState<FilterValues>({});
  const [projects, setProjects] = useState<CommercialProject[]>([]);
  const [fontes, setFontes] = useState<string[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingFontes, setLoadingFontes] = useState(true);

  useEffect(() => {
    loadProjects();
    loadFontes();
  }, []);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('commercial_projects')
        .select('id, name, code')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Erro ao carregar projetos:', error);
    } finally {
      setLoadingProjects(false);
    }
  };

  const loadFontes = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('fonte')
        .not('fonte', 'is', null)
        .order('fonte');

      if (error) throw error;
      
      // Extrair valores únicos
      const uniqueFontes = [...new Set(data?.map(d => d.fonte).filter(Boolean) as string[])];
      setFontes(uniqueFontes);
    } catch (error) {
      console.error('Erro ao carregar fontes:', error);
    } finally {
      setLoadingFontes(false);
    }
  };

  const handleProjectChange = (value: string) => {
    if (value === 'all') {
      setFilters({ ...filters, projectId: undefined, projectName: undefined });
    } else {
      const project = projects.find(p => p.id === value);
      setFilters({ ...filters, projectId: value, projectName: project?.name });
    }
  };

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
            <Label htmlFor="project">Projeto Comercial</Label>
            {loadingProjects ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground h-10">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando...
              </div>
            ) : (
              <Select
                value={filters.projectId || 'all'}
                onValueChange={handleProjectChange}
              >
                <SelectTrigger id="project">
                  <SelectValue placeholder="Todos os projetos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os projetos</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fonte">Fonte</Label>
            {loadingFontes ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground h-10">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando...
              </div>
            ) : (
              <Select
                value={filters.fonte || 'all'}
                onValueChange={(value) => setFilters({ ...filters, fonte: value === 'all' ? undefined : value })}
              >
                <SelectTrigger id="fonte">
                  <SelectValue placeholder="Todas as fontes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as fontes</SelectItem>
                  {fontes.map((fonte) => (
                    <SelectItem key={fonte} value={fonte}>
                      {fonte}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={filters.status || "all"}
              onValueChange={(value) => setFilters({ ...filters, status: value === 'all' ? undefined : value })}
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="confirmado">Confirmados</SelectItem>
                <SelectItem value="presenca_confirmada">Compareceram</SelectItem>
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
