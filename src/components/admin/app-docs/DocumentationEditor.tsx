import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, Plus, X, Loader2 } from 'lucide-react';
import { MetricEditor } from './MetricEditor';

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  page_route: z.string().min(1, 'Rota é obrigatória'),
  category: z.string().min(1, 'Categoria é obrigatória'),
  module: z.string().min(1, 'Módulo é obrigatório'),
  main_component: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface Documentation {
  id: string;
  name: string;
  description: string | null;
  page_route: string;
  category: string;
  module: string;
  main_component: string | null;
  hooks_used: string[];
  rpcs_used: string[];
  tables_accessed: string[];
  filters_available: string[];
  notes: string | null;
  app_metrics_documentation: any[];
}

interface Props {
  documentation: Documentation | null;
  onSave: () => void;
  onCancel: () => void;
}

export function DocumentationEditor({ documentation, onSave, onCancel }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [hooksUsed, setHooksUsed] = useState<string[]>(documentation?.hooks_used || []);
  const [rpcsUsed, setRpcsUsed] = useState<string[]>(documentation?.rpcs_used || []);
  const [tablesAccessed, setTablesAccessed] = useState<string[]>(documentation?.tables_accessed || []);
  const [filtersAvailable, setFiltersAvailable] = useState<string[]>(documentation?.filters_available || []);
  const [newHook, setNewHook] = useState('');
  const [newRpc, setNewRpc] = useState('');
  const [newTable, setNewTable] = useState('');
  const [newFilter, setNewFilter] = useState('');

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: documentation?.name || '',
      description: documentation?.description || '',
      page_route: documentation?.page_route || '',
      category: documentation?.category || 'page',
      module: documentation?.module || 'admin',
      main_component: documentation?.main_component || '',
      notes: documentation?.notes || '',
    },
  });

  const addItem = (list: string[], setList: (items: string[]) => void, item: string, setItem: (v: string) => void) => {
    if (item.trim() && !list.includes(item.trim())) {
      setList([...list, item.trim()]);
      setItem('');
    }
  };

  const removeItem = (list: string[], setList: (items: string[]) => void, index: number) => {
    setList(list.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      if (documentation) {
        const { error } = await supabase
          .from('app_documentation')
          .update({
            name: data.name,
            description: data.description || null,
            page_route: data.page_route,
            category: data.category,
            module: data.module,
            main_component: data.main_component || null,
            notes: data.notes || null,
            hooks_used: hooksUsed,
            rpcs_used: rpcsUsed,
            tables_accessed: tablesAccessed,
            filters_available: filtersAvailable,
          })
          .eq('id', documentation.id);
        if (error) throw error;
        toast.success('Documentação atualizada');
      } else {
        const { error } = await supabase
          .from('app_documentation')
          .insert({
            name: data.name,
            description: data.description || null,
            page_route: data.page_route,
            category: data.category,
            module: data.module,
            main_component: data.main_component || null,
            notes: data.notes || null,
            hooks_used: hooksUsed,
            rpcs_used: rpcsUsed,
            tables_accessed: tablesAccessed,
            filters_available: filtersAvailable,
          });
        if (error) throw error;
        toast.success('Documentação criada');
      }
      onSave();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onCancel} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Cancelar
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{documentation ? 'Editar' : 'Nova'} Documentação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input placeholder="Portal Telemarketing" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="page_route"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rota</FormLabel>
                      <FormControl>
                        <Input placeholder="/portal-telemarketing" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Descrição da página/dashboard..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="module"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Módulo</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="telemarketing">Telemarketing</SelectItem>
                          <SelectItem value="scouter">Scouter</SelectItem>
                          <SelectItem value="produtor">Produtor</SelectItem>
                          <SelectItem value="gestao">Gestão</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="page">Página</SelectItem>
                          <SelectItem value="dashboard">Dashboard</SelectItem>
                          <SelectItem value="report">Relatório</SelectItem>
                          <SelectItem value="portal">Portal</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="main_component"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Componente Principal</FormLabel>
                      <FormControl>
                        <Input placeholder="ComponentName.tsx" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Arrays */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Hooks */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Hooks Utilizados</label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="useTelemarketingMetrics"
                      value={newHook}
                      onChange={(e) => setNewHook(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem(hooksUsed, setHooksUsed, newHook, setNewHook))}
                    />
                    <Button type="button" variant="outline" size="icon" onClick={() => addItem(hooksUsed, setHooksUsed, newHook, setNewHook)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {hooksUsed.map((hook, i) => (
                      <Badge key={i} variant="secondary" className="gap-1">
                        {hook}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => removeItem(hooksUsed, setHooksUsed, i)} />
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* RPCs */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">RPCs Utilizados</label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="get_comparecidos_by_date"
                      value={newRpc}
                      onChange={(e) => setNewRpc(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem(rpcsUsed, setRpcsUsed, newRpc, setNewRpc))}
                    />
                    <Button type="button" variant="outline" size="icon" onClick={() => addItem(rpcsUsed, setRpcsUsed, newRpc, setNewRpc)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {rpcsUsed.map((rpc, i) => (
                      <Badge key={i} variant="secondary" className="gap-1 font-mono text-xs">
                        {rpc}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => removeItem(rpcsUsed, setRpcsUsed, i)} />
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Tables */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tabelas Acessadas</label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="leads"
                      value={newTable}
                      onChange={(e) => setNewTable(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem(tablesAccessed, setTablesAccessed, newTable, setNewTable))}
                    />
                    <Button type="button" variant="outline" size="icon" onClick={() => addItem(tablesAccessed, setTablesAccessed, newTable, setNewTable)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {tablesAccessed.map((table, i) => (
                      <Badge key={i} variant="outline" className="gap-1 font-mono text-xs">
                        {table}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => removeItem(tablesAccessed, setTablesAccessed, i)} />
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Filters */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Filtros Disponíveis</label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="período, operador"
                      value={newFilter}
                      onChange={(e) => setNewFilter(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem(filtersAvailable, setFiltersAvailable, newFilter, setNewFilter))}
                    />
                    <Button type="button" variant="outline" size="icon" onClick={() => addItem(filtersAvailable, setFiltersAvailable, newFilter, setNewFilter)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {filtersAvailable.map((filter, i) => (
                      <Badge key={i} variant="outline" className="gap-1">
                        {filter}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => removeItem(filtersAvailable, setFiltersAvailable, i)} />
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Observações adicionais..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Metrics Editor - only show for existing documentation */}
          {documentation && (
            <MetricEditor documentationId={documentation.id} />
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="gap-2">
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              <Save className="h-4 w-4" />
              Salvar
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
