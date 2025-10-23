import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Filter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FilterPanelProps {
  onFilterChange: (filters: FilterState) => void;
}

export interface FilterState {
  dateRange: { start: string; end: string };
  selectedProjects: string[];
  selectedScouters: string[];
}

export function InteractiveFilterPanel({ onFilterChange }: FilterPanelProps) {
  const [dateRange, setDateRange] = useState({ 
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    end: new Date().toISOString().slice(0, 10)
  });
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedScouter, setSelectedScouter] = useState<string>('all');
  
  const { data: projects = [] } = useQuery({
    queryKey: ['unique-projects'],
    queryFn: async () => {
      const { data } = await supabase
        .from('leads')
        .select('commercial_project_id')
        .or('deleted.is.false,deleted.is.null');
      return [...new Set(data?.map(d => d.commercial_project_id).filter(Boolean))];
    }
  });

  const { data: scouters = [] } = useQuery({
    queryKey: ['unique-scouters'],
    queryFn: async () => {
      const { data } = await supabase
        .from('leads')
        .select('scouter')
        .or('deleted.is.false,deleted.is.null');
      return [...new Set(data?.map(d => d.scouter).filter(Boolean))];
    }
  });
  
  useEffect(() => {
    onFilterChange({ 
      dateRange, 
      selectedProjects: selectedProject === 'all' ? [] : [selectedProject],
      selectedScouters: selectedScouter === 'all' ? [] : [selectedScouter]
    });
  }, [dateRange, selectedProject, selectedScouter]);
  
  return (
    <Card className="mb-6 rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filtros Avançados
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Date Range */}
        <div>
          <Label className="text-sm font-medium mb-2 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Data Início
          </Label>
          <Input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
          />
        </div>

        <div>
          <Label className="text-sm font-medium mb-2 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Data Fim
          </Label>
          <Input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
          />
        </div>
        
        {/* Project Select */}
        <div>
          <Label className="text-sm font-medium mb-2">Projetos</Label>
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger>
              <SelectValue placeholder="Todos Projetos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Projetos</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Scouter Select */}
        <div>
          <Label className="text-sm font-medium mb-2">Scouters</Label>
          <Select value={selectedScouter} onValueChange={setSelectedScouter}>
            <SelectTrigger>
              <SelectValue placeholder="Todos Scouters" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Scouters</SelectItem>
              {scouters.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
