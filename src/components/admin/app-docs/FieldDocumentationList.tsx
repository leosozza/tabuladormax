import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Search, X, Loader2, Database } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface FieldDoc {
  id: string;
  field_id: string;
  field_name: string;
  field_source: string | null;
  field_type: string | null;
  description: string | null;
  usage_examples: string[];
  possible_values: any[];
}

export function FieldDocumentationList() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<FieldDoc | null>(null);
  const [formData, setFormData] = useState({
    field_id: '',
    field_name: '',
    field_source: '',
    field_type: '',
    description: '',
    usage_examples: [] as string[],
  });
  const [newExample, setNewExample] = useState('');

  const { data: fields, isLoading } = useQuery({
    queryKey: ['app-field-documentation', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('app_field_documentation')
        .select('*')
        .order('field_id');

      if (searchTerm) {
        query = query.or(`field_id.ilike.%${searchTerm}%,field_name.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as FieldDoc[];
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase
          .from('app_field_documentation')
          .update(data)
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('app_field_documentation')
          .insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-field-documentation'] });
      toast.success(editingField ? 'Campo atualizado' : 'Campo criado');
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
        .from('app_field_documentation')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-field-documentation'] });
      toast.success('Campo removido');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao remover');
    }
  });

  const resetForm = () => {
    setFormData({
      field_id: '',
      field_name: '',
      field_source: '',
      field_type: '',
      description: '',
      usage_examples: [],
    });
    setEditingField(null);
    setNewExample('');
  };

  const openEditDialog = (field: FieldDoc) => {
    setEditingField(field);
    setFormData({
      field_id: field.field_id,
      field_name: field.field_name,
      field_source: field.field_source || '',
      field_type: field.field_type || '',
      description: field.description || '',
      usage_examples: field.usage_examples || [],
    });
    setIsDialogOpen(true);
  };

  const addExample = () => {
    if (newExample.trim() && !formData.usage_examples.includes(newExample.trim())) {
      setFormData(prev => ({
        ...prev,
        usage_examples: [...prev.usage_examples, newExample.trim()]
      }));
      setNewExample('');
    }
  };

  const removeExample = (index: number) => {
    setFormData(prev => ({
      ...prev,
      usage_examples: prev.usage_examples.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = () => {
    if (!formData.field_id || !formData.field_name) {
      toast.error('ID e nome do campo são obrigatórios');
      return;
    }
    saveMutation.mutate({
      ...formData,
      id: editingField?.id,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar campo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Campo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingField ? 'Editar' : 'Novo'} Campo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">ID do Campo *</label>
                  <Input
                    placeholder="UF_CRM_DATACOMPARECEU"
                    value={formData.field_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, field_id: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome *</label>
                  <Input
                    placeholder="Data de Comparecimento"
                    value={formData.field_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, field_name: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fonte</label>
                  <Input
                    placeholder="Bitrix24"
                    value={formData.field_source}
                    onChange={(e) => setFormData(prev => ({ ...prev, field_source: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo</label>
                  <Input
                    placeholder="datetime"
                    value={formData.field_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, field_type: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Descrição</label>
                <Textarea
                  placeholder="Descrição do campo..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Exemplos de Uso</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Dashboard Telemarketing"
                    value={newExample}
                    onChange={(e) => setNewExample(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addExample())}
                  />
                  <Button type="button" variant="outline" size="icon" onClick={addExample}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {formData.usage_examples.map((example, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {example}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => removeExample(i)} />
                    </Badge>
                  ))}
                </div>
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Campos Documentados ({fields?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !fields?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum campo documentado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID do Campo</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Fonte</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map(field => (
                  <TableRow key={field.id}>
                    <TableCell>
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">{field.field_id}</code>
                    </TableCell>
                    <TableCell>{field.field_name}</TableCell>
                    <TableCell>{field.field_source || '-'}</TableCell>
                    <TableCell>
                      {field.field_type && (
                        <Badge variant="outline" className="text-xs">{field.field_type}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(field)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => deleteMutation.mutate(field.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
