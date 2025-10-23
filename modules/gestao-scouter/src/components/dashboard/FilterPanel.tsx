
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, Filter, X, Users, Building2, RotateCcw, CheckSquare, Square } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface DashboardFilters {
  dateRange: {
    start: string;
    end: string;
  };
  scouters: string[];
  projects: string[];
}

interface FilterPanelProps {
  filters: DashboardFilters;
  onFiltersChange: (filters: DashboardFilters) => void;
  availableScouters: string[];
  availableProjects: string[];
  onApplyFilters: () => void;
  onClearFilters: () => void;
  onResetAll: () => void;
}

export const FilterPanel = ({
  filters,
  onFiltersChange,
  availableScouters,
  availableProjects,
  onApplyFilters,
  onClearFilters,
  onResetAll
}: FilterPanelProps) => {
  const [tempFilters, setTempFilters] = useState(filters);

  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    setTempFilters(prev => ({
      ...prev,
      dateRange: { ...prev.dateRange, [field]: value }
    }));
  };

  const addScouter = (scouter: string) => {
    if (scouter && !tempFilters.scouters.includes(scouter)) {
      setTempFilters(prev => ({
        ...prev,
        scouters: [...prev.scouters, scouter]
      }));
    }
  };

  const removeScouter = (scouter: string) => {
    setTempFilters(prev => ({
      ...prev,
      scouters: prev.scouters.filter(s => s !== scouter)
    }));
  };

  const selectAllScouters = () => {
    setTempFilters(prev => ({
      ...prev,
      scouters: [...availableScouters]
    }));
  };

  const clearAllScouters = () => {
    setTempFilters(prev => ({
      ...prev,
      scouters: []
    }));
  };

  const addProject = (project: string) => {
    if (project && !tempFilters.projects.includes(project)) {
      setTempFilters(prev => ({
        ...prev,
        projects: [...prev.projects, project]
      }));
    }
  };

  const removeProject = (project: string) => {
    setTempFilters(prev => ({
      ...prev,
      projects: prev.projects.filter(p => p !== project)
    }));
  };

  const selectAllProjects = () => {
    setTempFilters(prev => ({
      ...prev,
      projects: [...availableProjects]
    }));
  };

  const clearAllProjects = () => {
    setTempFilters(prev => ({
      ...prev,
      projects: []
    }));
  };

  const handleApply = () => {
    onFiltersChange(tempFilters);
    onApplyFilters();
  };

  const handleClear = () => {
    const defaultFilters: DashboardFilters = {
      dateRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      },
      scouters: [],
      projects: []
    };
    setTempFilters(defaultFilters);
    onFiltersChange(defaultFilters);
    onClearFilters();
  };

  const hasActiveFilters = tempFilters.scouters.length > 0 || tempFilters.projects.length > 0;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Filter className="w-5 h-5 text-primary" />
          Filtros
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Date Range */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Calendar className="w-4 h-4" />
            Período
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="start-date" className="text-xs text-muted-foreground">Início</Label>
              <Input
                id="start-date"
                type="date"
                value={tempFilters.dateRange.start}
                onChange={(e) => handleDateRangeChange('start', e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <Label htmlFor="end-date" className="text-xs text-muted-foreground">Fim</Label>
              <Input
                id="end-date"
                type="date"
                value={tempFilters.dateRange.end}
                onChange={(e) => handleDateRangeChange('end', e.target.value)}
                className="text-sm"
              />
            </div>
          </div>
        </div>

        {/* Scouters */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Users className="w-4 h-4" />
              Scouters
            </Label>
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={selectAllScouters}
                className="h-6 px-2 text-xs"
              >
                <CheckSquare className="w-3 h-3 mr-1" />
                Todos
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearAllScouters}
                className="h-6 px-2 text-xs"
              >
                <Square className="w-3 h-3 mr-1" />
                Nenhum
              </Button>
            </div>
          </div>
          <Select onValueChange={addScouter}>
            <SelectTrigger>
              <SelectValue placeholder="Selecionar scouter..." />
            </SelectTrigger>
            <SelectContent>
              {availableScouters
                .filter(scouter => scouter && scouter.trim() && !tempFilters.scouters.includes(scouter))
                .map(scouter => (
                  <SelectItem key={scouter} value={scouter}>
                    {scouter}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <div className="flex flex-wrap gap-2">
            {tempFilters.scouters.map(scouter => (
              <Badge key={scouter} variant="secondary" className="gap-1">
                {scouter}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeScouter(scouter)}
                  className="h-auto p-0 ml-1"
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>

        {/* Projects */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Building2 className="w-4 h-4" />
              Projetos
            </Label>
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={selectAllProjects}
                className="h-6 px-2 text-xs"
              >
                <CheckSquare className="w-3 h-3 mr-1" />
                Todos
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearAllProjects}
                className="h-6 px-2 text-xs"
              >
                <Square className="w-3 h-3 mr-1" />
                Nenhum
              </Button>
            </div>
          </div>
          <Select onValueChange={addProject}>
            <SelectTrigger>
              <SelectValue placeholder="Selecionar projeto..." />
            </SelectTrigger>
            <SelectContent>
              {availableProjects
                .filter(project => project && project.trim() && !tempFilters.projects.includes(project))
                .map(project => (
                  <SelectItem key={project} value={project}>
                    {project}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <div className="flex flex-wrap gap-2">
            {tempFilters.projects.map(project => (
              <Badge key={project} variant="secondary" className="gap-1">
                {project}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeProject(project)}
                  className="h-auto p-0 ml-1"
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t">
          <Button onClick={handleApply} className="flex-1">
            Aplicar
          </Button>
          {hasActiveFilters && (
            <Button variant="outline" onClick={handleClear} className="gap-2">
              <RotateCcw className="w-4 h-4" />
              Limpar
            </Button>
          )}
          <Button variant="outline" onClick={onResetAll} className="gap-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground">
            <RotateCcw className="w-4 h-4" />
            Redefinir
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
