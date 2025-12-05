import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { RoadmapFeature, RoadmapFeatureInsert } from '@/hooks/useRoadmapFeatures';
import { moduleConfig, statusConfig, priorityConfig, FeaturePriority } from '@/types/roadmap';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface RoadmapFeatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: RoadmapFeature | null;
  onSave: (feature: RoadmapFeatureInsert) => Promise<void>;
  isLoading?: boolean;
}

const defaultFeature: RoadmapFeatureInsert = {
  name: '',
  description: '',
  status: 'planned',
  module: 'geral',
  icon: 'Circle',
  progress: 0,
  launch_date: null,
  tags: [],
  sort_order: 0,
  priority: 'medium',
};

export function RoadmapFeatureDialog({ open, onOpenChange, feature, onSave, isLoading }: RoadmapFeatureDialogProps) {
  const [formData, setFormData] = useState<RoadmapFeatureInsert>(defaultFeature);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (feature) {
      setFormData({
        name: feature.name,
        description: feature.description,
        status: feature.status,
        module: feature.module,
        icon: feature.icon,
        progress: feature.progress,
        launch_date: feature.launch_date,
        tags: feature.tags || [],
        sort_order: feature.sort_order,
        priority: feature.priority || 'medium',
      });
    } else {
      setFormData(defaultFeature);
    }
  }, [feature, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
    onOpenChange(false);
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{feature ? 'Editar Funcionalidade' : 'Nova Funcionalidade'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="module">Módulo *</Label>
              <Select
                value={formData.module}
                onValueChange={(value) => setFormData({ ...formData, module: value as RoadmapFeatureInsert['module'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(moduleConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${config.color}`} />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as RoadmapFeatureInsert['status'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Prioridade</Label>
            <Select
              value={formData.priority}
              onValueChange={(value) => setFormData({ ...formData, priority: value as FeaturePriority })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(priorityConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${config.bgColor}`} />
                      {config.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="icon">Ícone (Lucide)</Label>
              <Input
                id="icon"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="Circle"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sort_order">Ordem</Label>
              <Input
                id="sort_order"
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          {formData.status === 'in-progress' && (
            <div className="space-y-2">
              <Label>Progresso: {formData.progress}%</Label>
              <Slider
                value={[formData.progress]}
                onValueChange={([value]) => setFormData({ ...formData, progress: value })}
                max={100}
                step={5}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="launch_date">Data de Lançamento</Label>
            <Input
              id="launch_date"
              type="date"
              value={formData.launch_date || ''}
              onChange={(e) => setFormData({ ...formData, launch_date: e.target.value || null })}
            />
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Adicionar tag"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <Button type="button" variant="outline" onClick={addTag}>
                Adicionar
              </Button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {formData.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(tag)} />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
