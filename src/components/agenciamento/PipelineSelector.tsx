// Pipeline Selector Component for Agenciamento
import { usePipelines } from '@/hooks/usePipelines';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2 } from 'lucide-react';

interface PipelineSelectorProps {
  value: string;
  onChange: (pipelineId: string) => void;
  className?: string;
}

export function PipelineSelector({ value, onChange, className }: PipelineSelectorProps) {
  const { data: pipelines = [], isLoading } = usePipelines();

  return (
    <Select value={value} onValueChange={onChange} disabled={isLoading}>
      <SelectTrigger className={className}>
        <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
        <SelectValue placeholder="Selecione a Pipeline" />
      </SelectTrigger>
      <SelectContent>
        {pipelines.map((pipeline) => (
          <SelectItem key={pipeline.id} value={pipeline.id}>
            {pipeline.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
