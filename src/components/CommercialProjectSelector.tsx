import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface CommercialProject {
  id: string;
  name: string;
  code: string;
}

interface CommercialProjectSelectorProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

export function CommercialProjectSelector({ value, onChange }: CommercialProjectSelectorProps) {
  const [projects, setProjects] = useState<CommercialProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      // @ts-expect-error - Types will be auto-generated after migration
      const { data, error } = await supabase
        .from('commercial_projects')
        .select('id, name, code')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setProjects((data as any) || []);
    } catch (error) {
      console.error('Erro ao carregar projetos:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando projetos...
      </div>
    );
  }

  return (
    <Select value={value || 'all'} onValueChange={(v) => onChange(v === 'all' ? null : v)}>
      <SelectTrigger className="w-[300px]">
        <SelectValue placeholder="Filtrar por projeto" />
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
  );
}
