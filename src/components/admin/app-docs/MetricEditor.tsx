import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Edit, X, Loader2, BarChart3 } from 'lucide-react';

interface Metric {
  id: string;
  metric_name: string;
  metric_key: string | null;
  data_source: string;
  source_type: string;
  fields_used: string[];
  calculation_formula: string | null;
  filters_applied: string | null;
  sql_example: string | null;
  business_rule: string | null;
  notes: string | null;
  sort_order: number;
}

interface Props {
  documentationId: string;
}

export function MetricEditor({ documentationId }: Props) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMetric, setEditingMetric] = useState<Metric | null>(null);
  const [formData, setFormData] = useState({
    metric_name: '',
    metric_key: '',
    data_source: '',
    source_type: 'table',
    fields_used: [] as string[],
    calculation_formula: '',
    filters_applied: '',
    sql_example: '',
    business_rule: '',
    notes: '',
    sort_order: 0,
  });
  const [newField, setNewField] = useState('');

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['app-metrics-documentation', documentationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_metrics_documentation')
        .select('*')
        .eq('documentation_id', documentationId)
        .order('sort_order');
      if (error) throw error;
      return data as Metric[];
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      const payload = {
        ...data,
        documentation_id: documentationId,
      };

      if (data.id) {
        const { error } = await supabase
          .from('app_metrics_documentation')
          .update(payload)
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('app_metrics_documentation')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-metrics-documentation', documentationId] });
      toast.success(editingMetric ? 'Métrica atualizada' : 'Métrica criada');
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao salvar');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('app_metrics_documentation')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-metrics-documentation', documentationId] });
      toast.success('Métrica removida');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao remover');
    }
  });

  const resetForm = () => {
    setFormData({
      metric_name: '',
      metric_key: '',
      data_source: '',
      source_type: 'table',
      fields_used: [],
      calculation_formula: '',
      filters_applied: '',
      sql_example: '',
      business_rule: '',
      notes: '',
      sort_order: 0,
    });
    setEditingMetric(null);
    setNewField('');
  };

  const openEditDialog = (metric: Metric) => {
    setEditingMetric(metric);
    setFormData({
      metric_name: metric.metric_name,
      metric_key: metric.metric_key || '',
      data_source: metric.data_source,
      source_type: metric.source_type,
      fields_used: metric.fields_used || [],
      calculation_formula: metric.calculation_formula || '',
      filters_applied: metric.filters_applied || '',
      sql_example: metric.sql_example || '',
      business_rule: metric.business_rule || '',
      notes: metric.notes || '',
      sort_order: metric.sort_order,
    });
    setIsDialogOpen(true);
  };

  const addField = () => {
    if (newField.trim() && !formData.fields_used.includes(newField.trim())) {
      setFormData(prev => ({
        ...prev,
        fields_used: [...prev.fields_used, newField.trim()]
      }));
      setNewField('');
    }
  };

  const removeField = (index: number) => {
    setFormData(prev => ({
      ...prev,
      fields_used: prev.fields_used.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = () => {
    if (!formData.metric_name || !formData.data_source) {
      toast.error('Nome e fonte de dados são obrigatórios');
      return;
    }
    saveMutation.mutate({
      ...formData,
      id: editingMetric?.id,
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Métricas ({metrics?.length || 0})
        </CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Métrica
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingMetric ? 'Editar' : 'Nova'} Métrica</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome da Métrica *</label>
                  <Input
                    placeholder="Leads Trabalhados"
                    value={formData.metric_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, metric_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Chave</label>
                  <Input
                    placeholder="totalLeads"
                    value={formData.metric_key}
                    onChange={(e) => setFormData(prev => ({ ...prev, metric_key: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fonte de Dados *</label>
                  <Input
                    placeholder="leads ou rpc:get_stats"
                    value={formData.data_source}
                    onChange={(e) => setFormData(prev => ({ ...prev, data_source: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo de Fonte</label>
                  <Select 
                    value={formData.source_type} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, source_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="table">Tabela</SelectItem>
                      <SelectItem value="rpc">RPC</SelectItem>
                      <SelectItem value="api">API Externa</SelectItem>
                      <SelectItem value="calculated">Calculado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Campos Utilizados</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="date_modify"
                    value={newField}
                    onChange={(e) => setNewField(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addField())}
                  />
                  <Button type="button" variant="outline" size="icon" onClick={addField}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {formData.fields_used.map((field, i) => (
                    <Badge key={i} variant="secondary" className="gap-1 font-mono text-xs">
                      {field}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => removeField(i)} />
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Fórmula de Cálculo</label>
                <Input
                  placeholder="COUNT(*) WHERE condition"
                  value={formData.calculation_formula}
                  onChange={(e) => setFormData(prev => ({ ...prev, calculation_formula: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Filtros Aplicados</label>
                <Input
                  placeholder="date_modify >= start AND date_modify <= end"
                  value={formData.filters_applied}
                  onChange={(e) => setFormData(prev => ({ ...prev, filters_applied: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Regra de Negócio</label>
                <Textarea
                  placeholder="Descrição da regra de negócio..."
                  value={formData.business_rule}
                  onChange={(e) => setFormData(prev => ({ ...prev, business_rule: e.target.value }))}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">SQL de Exemplo</label>
                <Textarea
                  placeholder="SELECT COUNT(*) FROM leads WHERE ..."
                  value={formData.sql_example}
                  onChange={(e) => setFormData(prev => ({ ...prev, sql_example: e.target.value }))}
                  rows={4}
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Ordem</label>
                <Input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} disabled={saveMutation.isPending} className="gap-2">
                  {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Salvar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : !metrics?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma métrica documentada
          </div>
        ) : (
          <div className="space-y-2">
            {metrics.map(metric => (
              <div 
                key={metric.id} 
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{metric.metric_name}</span>
                    {metric.metric_key && (
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">{metric.metric_key}</code>
                    )}
                    <Badge variant="outline" className="text-xs capitalize">{metric.source_type}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{metric.data_source}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(metric)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => deleteMutation.mutate(metric.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
