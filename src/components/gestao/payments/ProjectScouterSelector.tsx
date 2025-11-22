import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePaymentsByProject } from "@/hooks/usePaymentsByProject";
import { useContextualDataFix } from "@/hooks/useContextualDataFix";
import { ScouterPaymentCard } from "./ScouterPaymentCard";
import { Loader2, Users, CheckCircle2, AlertCircle, Wrench } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProjectScouterSelectorProps {
  startDate: Date;
  endDate: Date;
  selectedProjectId?: string | null;
  onScoutersSelected: (projectId: string, scouterNames: string[]) => void;
}

export function ProjectScouterSelector({
  startDate,
  endDate,
  selectedProjectId: preSelectedProjectId,
  onScoutersSelected,
}: ProjectScouterSelectorProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    preSelectedProjectId || null
  );
  const [selectedScouters, setSelectedScouters] = useState<Set<string>>(new Set());

  // Hook para correção contextual
  const { fixScoutersByProject, isFixing } = useContextualDataFix();

  // Buscar projetos
  const { data: projects, isLoading: loadingProjects } = useQuery({
    queryKey: ['commercial-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commercial_projects')
        .select('id, name, code')
        .eq('active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  // Buscar scouters do projeto selecionado
  const { data: scouterSummaries, isLoading: loadingScouters } = usePaymentsByProject(
    selectedProjectId,
    startDate,
    endDate
  );

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedScouters(new Set());
  };

  // Atualizar quando o projeto pré-selecionado mudar
  useEffect(() => {
    if (preSelectedProjectId !== selectedProjectId) {
      setSelectedProjectId(preSelectedProjectId || null);
      setSelectedScouters(new Set());
    }
  }, [preSelectedProjectId]);

  const handleScouterToggle = (scouter: string, selected: boolean) => {
    const newSelection = new Set(selectedScouters);
    if (selected) {
      newSelection.add(scouter);
    } else {
      newSelection.delete(scouter);
    }
    setSelectedScouters(newSelection);
  };

  const handleSelectAll = () => {
    if (!scouterSummaries) return;
    const allScouters = new Set(scouterSummaries.map(s => s.scouter));
    setSelectedScouters(allScouters);
  };

  const handleClearSelection = () => {
    setSelectedScouters(new Set());
  };

  const handleContinue = () => {
    if (selectedProjectId && selectedScouters.size > 0) {
      onScoutersSelected(selectedProjectId, Array.from(selectedScouters));
    }
  };

  const handleFixScouters = () => {
    if (!selectedProjectId) return;
    fixScoutersByProject({ projectId: selectedProjectId, startDate, endDate });
  };

  // Detectar scouters com IDs numéricos
  const scoutersWithIds = scouterSummaries?.filter(s => /^\d+$/.test(s.scouter)) || [];
  const hasNumericScouters = scoutersWithIds.length > 0;

  const totalSelected = selectedScouters.size;
  const totalLeadsSelected = scouterSummaries
    ?.filter(s => selectedScouters.has(s.scouter))
    .reduce((sum, s) => sum + s.totalPending, 0) || 0;
  const totalValueSelected = scouterSummaries
    ?.filter(s => selectedScouters.has(s.scouter))
    .reduce((sum, s) => sum + (s.totalValue * s.totalPending / s.totalLeads), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Seleção de Projeto - Mostrar apenas se não estiver pré-selecionado */}
      {!preSelectedProjectId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              1. Selecionar Projeto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedProjectId || ""} onValueChange={handleProjectChange}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um projeto comercial" />
              </SelectTrigger>
              <SelectContent>
                {loadingProjects ? (
                  <SelectItem value="loading" disabled>
                    Carregando projetos...
                  </SelectItem>
                ) : (
                  projects?.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name} ({project.code})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Lista de Scouters */}
      {selectedProjectId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                {preSelectedProjectId ? 'Selecionar Scouters' : '2. Selecionar Scouters'}
              </CardTitle>
              <div className="flex items-center gap-2">
                {/* Badge de Alerta */}
                {hasNumericScouters && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {scoutersWithIds.length} com IDs
                  </Badge>
                )}
                
                {/* Botão de Correção Contextual */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleFixScouters}
                  disabled={isFixing || !hasNumericScouters}
                >
                  {isFixing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Corrigindo...
                    </>
                  ) : (
                    <>
                      <Wrench className="h-4 w-4 mr-2" />
                      Corrigir Nomes
                    </>
                  )}
                </Button>
                
                {/* Botões Existentes */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={!scouterSummaries || scouterSummaries.length === 0}
                >
                  Selecionar Todos
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearSelection}
                  disabled={selectedScouters.size === 0}
                >
                  Limpar Seleção
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingScouters ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : scouterSummaries && scouterSummaries.length > 0 ? (
              <div className="space-y-3">
                {scouterSummaries.map((summary) => (
                  <ScouterPaymentCard
                    key={summary.scouter}
                    {...summary}
                    isSelected={selectedScouters.has(summary.scouter)}
                    onSelect={(selected) => handleScouterToggle(summary.scouter, selected)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nenhum scouter encontrado para este projeto no período selecionado.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Resumo e Ação */}
      {selectedScouters.size > 0 && (
        <Card className="bg-primary/5 border-primary">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Seleção Atual</p>
                <div className="flex gap-6 text-lg font-semibold">
                  <span>{totalSelected} Scouter(s)</span>
                  <span>{totalLeadsSelected} Leads Pendentes</span>
                  <span className="text-primary">
                    R$ {totalValueSelected.toFixed(2)}
                  </span>
                </div>
              </div>
              <Button onClick={handleContinue} size="lg">
                Continuar para Detalhamento
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
