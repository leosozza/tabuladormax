import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminPageLayout } from '@/components/layouts/AdminPageLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { RefreshCw, Search, Plus, Edit, Trash2, Eye, EyeOff, Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface BitrixField {
  field_id: string;
  field_title: string;
  field_type: string;
}

interface SupabaseColumn {
  column_name: string;
  data_type: string;
}

interface FieldMapping {
  id: string;
  bitrix_field: string | null;
  bitrix_field_type: string | null;
  bitrix_display_name: string | null;
  supabase_field: string;
  supabase_field_type: string | null;
  display_name: string;
  category: string;
  field_type: string;
  transform_function: string | null;
  formatter_function: string | null;
  default_visible: boolean;
  sortable: boolean;
  priority: number;
  active: boolean;
  notes: string | null;
}

const CATEGORIES = [
  { value: 'basic', label: 'Básico' },
  { value: 'contact', label: 'Contato' },
  { value: 'location', label: 'Localização' },
  { value: 'dates', label: 'Datas' },
  { value: 'ficha', label: 'Ficha' },
  { value: 'status', label: 'Status' },
  { value: 'outros', label: 'Outros' }
];

const FIELD_TYPES = [
  { value: 'string', label: 'Texto' },
  { value: 'number', label: 'Número' },
  { value: 'date', label: 'Data' },
  { value: 'boolean', label: 'Sim/Não' },
  { value: 'array', label: 'Lista' }
];

export default function FieldMappings() {
  const queryClient = useQueryClient();
  const [searchBitrix, setSearchBitrix] = useState('');
  const [searchSupabase, setSearchSupabase] = useState('');
  const [searchMappings, setSearchMappings] = useState('');
  const [editingMapping, setEditingMapping] = useState<FieldMapping | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Buscar campos do Bitrix
  const { data: bitrixFields = [], isLoading: loadingBitrix, refetch: refetchBitrix } = useQuery({
    queryKey: ['bitrix-fields'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-bitrix-fields');
      if (error) throw error;
      return data.fields as BitrixField[];
    }
  });

  // Buscar colunas do Supabase
  const { data: supabaseColumns = [], isLoading: loadingSupabase } = useQuery({
    queryKey: ['supabase-columns'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_leads_schema');
      if (error) throw error;
      return data as SupabaseColumn[];
    }
  });

  // Buscar mapeamentos ativos
  const { data: mappings = [], isLoading: loadingMappings } = useQuery({
    queryKey: ['field-mappings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('field_mappings')
        .select('*')
        .eq('active', true)
        .order('priority');
      if (error) throw error;
      return data as FieldMapping[];
    }
  });

  // Mutation para salvar mapeamento
  const saveMappingMutation = useMutation({
    mutationFn: async (mapping: Partial<FieldMapping>) => {
      if (mapping.id) {
        const { error } = await supabase
          .from('field_mappings')
          .update(mapping)
          .eq('id', mapping.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('field_mappings')
          .insert([mapping as any]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-mappings'] });
      toast.success('Mapeamento salvo com sucesso!');
      setIsDialogOpen(false);
      setEditingMapping(null);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao salvar: ${error.message}`);
    }
  });

  // Mutation para deletar mapeamento
  const deleteMappingMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('field_mappings')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-mappings'] });
      toast.success('Mapeamento removido');
    }
  });

  // Mutation para toggle visibility
  const toggleVisibilityMutation = useMutation({
    mutationFn: async ({ id, default_visible }: { id: string; default_visible: boolean }) => {
      const { error } = await supabase
        .from('field_mappings')
        .update({ default_visible })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-mappings'] });
    }
  });

  const filteredBitrixFields = bitrixFields.filter(f =>
    f.field_title.toLowerCase().includes(searchBitrix.toLowerCase()) ||
    f.field_id.toLowerCase().includes(searchBitrix.toLowerCase())
  );

  const filteredSupabaseColumns = supabaseColumns.filter(c =>
    c.column_name.toLowerCase().includes(searchSupabase.toLowerCase())
  );

  const filteredMappings = mappings.filter(m =>
    m.display_name.toLowerCase().includes(searchMappings.toLowerCase()) ||
    m.supabase_field.toLowerCase().includes(searchMappings.toLowerCase()) ||
    (m.bitrix_field && m.bitrix_field.toLowerCase().includes(searchMappings.toLowerCase()))
  );

  const handleCreateMapping = (supabaseField: string) => {
    setEditingMapping({
      id: '',
      bitrix_field: null,
      bitrix_field_type: null,
      bitrix_display_name: null,
      supabase_field: supabaseField,
      supabase_field_type: supabaseColumns.find(c => c.column_name === supabaseField)?.data_type || null,
      display_name: supabaseField,
      category: 'outros',
      field_type: 'string',
      transform_function: null,
      formatter_function: null,
      default_visible: false,
      sortable: true,
      priority: 0,
      active: true,
      notes: null
    });
    setIsDialogOpen(true);
  };

  const mappedSupabaseFields = new Set(mappings.map(m => m.supabase_field));

  const handleRefreshBitrixFields = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-bitrix-fields', {
        body: { force_refresh: true }
      });
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['bitrix-fields'] });
      toast.success(`${data?.fields?.length || 0} campos atualizados do Bitrix`);
    } catch (error) {
      console.error('Erro ao atualizar campos:', error);
      toast.error('Erro ao atualizar campos do Bitrix');
    }
  };

  return (
    <AdminPageLayout title="Mapeamento de Campos">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Mapeamento de Campos</h1>
            <p className="text-muted-foreground mt-2">
              Configure como os campos são sincronizados entre Bitrix e Supabase
            </p>
          </div>
          <Button onClick={handleRefreshBitrixFields} variant="outline" size="sm" disabled={loadingBitrix}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loadingBitrix ? 'animate-spin' : ''}`} />
            Atualizar Campos Bitrix
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Coluna 1: Campos Bitrix */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Campos Bitrix</CardTitle>
              <CardDescription>
                {filteredBitrixFields.length} campos disponíveis
              </CardDescription>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar campos..."
                  value={searchBitrix}
                  onChange={(e) => setSearchBitrix(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-2">
                  {filteredBitrixFields.map((field) => (
                    <div
                      key={field.field_id}
                      className="p-3 rounded-lg border bg-card hover:bg-accent transition-colors cursor-pointer"
                    >
                      <div className="font-medium text-sm">{field.field_title}</div>
                      <div className="text-xs text-muted-foreground mt-1">{field.field_id}</div>
                      <Badge variant="outline" className="mt-2 text-xs">
                        {field.field_type}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Coluna 2: Campos Supabase */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Campos Supabase</CardTitle>
              <CardDescription>
                {filteredSupabaseColumns.length} campos disponíveis
              </CardDescription>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar campos..."
                  value={searchSupabase}
                  onChange={(e) => setSearchSupabase(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-2">
                  {filteredSupabaseColumns.map((col) => (
                    <div
                      key={col.column_name}
                      className="p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{col.column_name}</div>
                          <Badge variant="outline" className="mt-2 text-xs">
                            {col.data_type}
                          </Badge>
                        </div>
                        {!mappedSupabaseFields.has(col.column_name) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCreateMapping(col.column_name)}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Coluna 3: Mapeamentos Ativos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Mapeamentos Ativos</CardTitle>
              <CardDescription>
                {filteredMappings.length} mapeamentos configurados
              </CardDescription>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Filtrar..."
                  value={searchMappings}
                  onChange={(e) => setSearchMappings(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-3">
                  {filteredMappings.map((mapping) => (
                    <Card key={mapping.id} className="border-2">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-semibold">{mapping.display_name}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {mapping.bitrix_field ? (
                                <span className="text-blue-600">{mapping.bitrix_field}</span>
                              ) : (
                                <span className="text-amber-600">Sem Bitrix</span>
                              )}
                              {' → '}
                              <span className="text-green-600">{mapping.supabase_field}</span>
                            </div>
                            <Badge variant="secondary" className="mt-2 text-xs">
                              {CATEGORIES.find(c => c.value === mapping.category)?.label}
                            </Badge>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggleVisibilityMutation.mutate({
                                id: mapping.id,
                                default_visible: !mapping.default_visible
                              })}
                            >
                              {mapping.default_visible ? (
                                <Eye className="w-4 h-4 text-green-600" />
                              ) : (
                                <EyeOff className="w-4 h-4 text-muted-foreground" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingMapping(mapping);
                                setIsDialogOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteMappingMutation.mutate(mapping.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Dialog de Edição */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingMapping?.id ? 'Editar Mapeamento' : 'Novo Mapeamento'}
              </DialogTitle>
              <DialogDescription>
                Configure como este campo é exibido e sincronizado
              </DialogDescription>
            </DialogHeader>

            {editingMapping && (
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Básico</TabsTrigger>
                  <TabsTrigger value="transform">Transformação</TabsTrigger>
                  <TabsTrigger value="meta">Metadados</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4">
                  <div>
                    <Label>Campo Supabase</Label>
                    <Input value={editingMapping.supabase_field} disabled />
                  </div>

                  <div>
                    <Label>Campo Bitrix</Label>
                    <Select
                      value={editingMapping.bitrix_field || ''}
                      onValueChange={(value) =>
                        setEditingMapping({ ...editingMapping, bitrix_field: value || null })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um campo do Bitrix" />
                      </SelectTrigger>
                      <SelectContent>
                        {bitrixFields.map((field) => (
                          <SelectItem key={field.field_id} value={field.field_id}>
                            {field.field_title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Nome de Exibição</Label>
                    <Input
                      value={editingMapping.display_name}
                      onChange={(e) =>
                        setEditingMapping({ ...editingMapping, display_name: e.target.value })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Categoria</Label>
                      <Select
                        value={editingMapping.category}
                        onValueChange={(value) =>
                          setEditingMapping({ ...editingMapping, category: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Tipo</Label>
                      <Select
                        value={editingMapping.field_type}
                        onValueChange={(value) =>
                          setEditingMapping({ ...editingMapping, field_type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FIELD_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={editingMapping.default_visible}
                        onCheckedChange={(checked) =>
                          setEditingMapping({ ...editingMapping, default_visible: checked })
                        }
                      />
                      <Label>Visível por padrão</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={editingMapping.sortable}
                        onCheckedChange={(checked) =>
                          setEditingMapping({ ...editingMapping, sortable: checked })
                        }
                      />
                      <Label>Ordenável</Label>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="transform" className="space-y-4">
                  <div>
                    <Label>Função de Transformação (Sync)</Label>
                    <Input
                      placeholder="Ex: bitrixProjectCodeToUUID"
                      value={editingMapping.transform_function || ''}
                      onChange={(e) =>
                        setEditingMapping({
                          ...editingMapping,
                          transform_function: e.target.value || null
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label>Função de Formatação (Display)</Label>
                    <Input
                      placeholder="Ex: formatDateBR, formatCurrency"
                      value={editingMapping.formatter_function || ''}
                      onChange={(e) =>
                        setEditingMapping({
                          ...editingMapping,
                          formatter_function: e.target.value || null
                        })
                      }
                    />
                  </div>
                </TabsContent>

                <TabsContent value="meta" className="space-y-4">
                  <div>
                    <Label>Prioridade</Label>
                    <Input
                      type="number"
                      value={editingMapping.priority}
                      onChange={(e) =>
                        setEditingMapping({
                          ...editingMapping,
                          priority: parseInt(e.target.value) || 0
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label>Notas</Label>
                    <Textarea
                      placeholder="Adicione notas ou observações sobre este mapeamento..."
                      value={editingMapping.notes || ''}
                      onChange={(e) =>
                        setEditingMapping({ ...editingMapping, notes: e.target.value || null })
                      }
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2 p-4 bg-muted rounded-lg">
                    <div className="text-sm">
                      <span className="font-medium">Tipo Bitrix:</span>{' '}
                      {editingMapping.bitrix_field_type || 'N/A'}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Tipo Supabase:</span>{' '}
                      {editingMapping.supabase_field_type || 'N/A'}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => saveMappingMutation.mutate(editingMapping!)}>
                Salvar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminPageLayout>
  );
}
