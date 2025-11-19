import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Trash2, ArrowLeftRight, Search } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface SupabaseField {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string;
}

interface BitrixField {
  field_id: string;
  field_title: string;
  field_type: string;
  display_name: string;
}

interface FieldMapping {
  id: string;
  bitrix_field: string;
  tabuladormax_field: string;
  bitrix_field_type: string | null;
  tabuladormax_field_type: string | null;
  transform_function: string | null;
  active: boolean;
  priority: number | null;
}

interface MergedFieldRow {
  supabase_field: string;
  supabase_type: string;
  supabase_nullable: string;
  bitrix_field: string | null;
  bitrix_field_type: string | null;
  transform_function: string | null;
  active: boolean;
  mapping_id: string | null;
  priority: number | null;
}

export function SupabaseBasedMappingTable() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyMapped, setShowOnlyMapped] = useState(false);
  const queryClient = useQueryClient();

  // Fetch Supabase fields
  const { data: supabaseFields = [] } = useQuery({
    queryKey: ['supabase-fields'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_leads_schema');
      if (error) throw error;
      return data as SupabaseField[];
    },
  });

  // Fetch Bitrix fields cache
  const { data: bitrixFields = [] } = useQuery({
    queryKey: ['bitrix-fields-cache'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bitrix_fields_cache')
        .select('*')
        .order('field_id');
      if (error) throw error;
      return data as BitrixField[];
    },
  });

  // Fetch active mappings
  const { data: mappings = [] } = useQuery({
    queryKey: ['bitrix-field-mappings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bitrix_field_mappings')
        .select('*')
        .eq('active', true)
        .order('priority');
      if (error) throw error;
      return data as FieldMapping[];
    },
  });

  // Merge data
  const mergedRows: MergedFieldRow[] = supabaseFields.map((field) => {
    const mapping = mappings.find((m) => m.tabuladormax_field === field.column_name);
    return {
      supabase_field: field.column_name,
      supabase_type: field.data_type,
      supabase_nullable: field.is_nullable,
      bitrix_field: mapping?.bitrix_field || null,
      bitrix_field_type: mapping?.bitrix_field_type || null,
      transform_function: mapping?.transform_function || null,
      active: mapping?.active || false,
      mapping_id: mapping?.id || null,
      priority: mapping?.priority || null,
    };
  });

  // Filter rows
  const filteredRows = mergedRows.filter((row) => {
    const matchesSearch = row.supabase_field.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMappedFilter = !showOnlyMapped || row.bitrix_field !== null;
    return matchesSearch && matchesMappedFilter;
  });

  const mappedCount = mergedRows.filter((r) => r.bitrix_field !== null).length;

  // Mutations
  const createMappingMutation = useMutation({
    mutationFn: async ({
      supabaseField,
      bitrixField,
      bitrixFieldType,
      supabaseFieldType,
    }: {
      supabaseField: string;
      bitrixField: string;
      bitrixFieldType: string;
      supabaseFieldType: string;
    }) => {
      const { error } = await supabase.from('bitrix_field_mappings').insert({
        bitrix_field: bitrixField,
        tabuladormax_field: supabaseField,
        bitrix_field_type: bitrixFieldType,
        tabuladormax_field_type: supabaseFieldType,
        active: true,
        priority: 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bitrix-field-mappings'] });
      toast.success('Mapeamento criado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar mapeamento: ${error.message}`);
    },
  });

  const updateMappingMutation = useMutation({
    mutationFn: async ({
      mappingId,
      bitrixField,
      bitrixFieldType,
    }: {
      mappingId: string;
      bitrixField: string;
      bitrixFieldType: string;
    }) => {
      const { error } = await supabase
        .from('bitrix_field_mappings')
        .update({
          bitrix_field: bitrixField,
          bitrix_field_type: bitrixFieldType,
          active: true,
        })
        .eq('id', mappingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bitrix-field-mappings'] });
      toast.success('Mapeamento atualizado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar mapeamento: ${error.message}`);
    },
  });

  const deactivateMappingMutation = useMutation({
    mutationFn: async (mappingId: string) => {
      const { error } = await supabase
        .from('bitrix_field_mappings')
        .update({ active: false })
        .eq('id', mappingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bitrix-field-mappings'] });
      toast.success('Mapeamento desativado');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao desativar mapeamento: ${error.message}`);
    },
  });

  const deleteMappingMutation = useMutation({
    mutationFn: async (mappingId: string) => {
      const { error } = await supabase
        .from('bitrix_field_mappings')
        .delete()
        .eq('id', mappingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bitrix-field-mappings'] });
      toast.success('Mapeamento excluído');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir mapeamento: ${error.message}`);
    },
  });

  const handleMapField = async (supabaseField: string, supabaseType: string, bitrixField: string) => {
    const existingMapping = mappings.find((m) => m.tabuladormax_field === supabaseField);

    if (!bitrixField) {
      // Desmapear: desativar
      if (existingMapping) {
        deactivateMappingMutation.mutate(existingMapping.id);
      }
      return;
    }

    // Verificar se campo Bitrix existe no cache
    const bitrixInfo = bitrixFields.find((bf) => bf.field_id === bitrixField);
    if (!bitrixInfo) {
      toast.error('Campo não encontrado no Bitrix');
      return;
    }

    if (existingMapping) {
      // Atualizar mapeamento existente
      updateMappingMutation.mutate({
        mappingId: existingMapping.id,
        bitrixField: bitrixField,
        bitrixFieldType: bitrixInfo.field_type,
      });
    } else {
      // Criar novo mapeamento
      createMappingMutation.mutate({
        supabaseField,
        bitrixField,
        bitrixFieldType: bitrixInfo.field_type,
        supabaseFieldType: supabaseType,
      });
    }
  };

  const handleDeleteMapping = (mappingId: string) => {
    if (confirm('Tem certeza que deseja excluir este mapeamento?')) {
      deleteMappingMutation.mutate(mappingId);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar campo do Supabase..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="show-mapped"
            checked={showOnlyMapped}
            onCheckedChange={setShowOnlyMapped}
          />
          <Label htmlFor="show-mapped">Apenas mapeados</Label>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>
          Mostrando {filteredRows.length} de {mergedRows.length} campos
        </span>
        <span>•</span>
        <span>
          {mappedCount} mapeados
        </span>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Campo Supabase</TableHead>
              <TableHead className="w-[50px] text-center">
                <ArrowLeftRight className="h-4 w-4 mx-auto" />
              </TableHead>
              <TableHead className="w-[300px]">Campo Bitrix</TableHead>
              <TableHead className="w-[150px]">Transformação</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[80px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.map((row) => {
              const bitrixInfo = row.bitrix_field
                ? bitrixFields.find((bf) => bf.field_id === row.bitrix_field)
                : null;

              return (
                <TableRow key={row.supabase_field}>
                  {/* Supabase Field */}
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-mono text-sm font-medium">
                        {row.supabase_field}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {row.supabase_type}
                        </Badge>
                        {row.supabase_nullable === 'YES' && (
                          <Badge variant="secondary" className="text-xs">
                            nullable
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  {/* Arrow */}
                  <TableCell className="text-center">
                    <ArrowLeftRight className="h-4 w-4 text-muted-foreground mx-auto" />
                  </TableCell>

                  {/* Bitrix Field Select */}
                  <TableCell>
                    <Select
                      value={row.bitrix_field || ''}
                      onValueChange={(value) =>
                        handleMapField(row.supabase_field, row.supabase_type, value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um campo Bitrix..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Nenhum</SelectItem>
                        {bitrixFields.map((bf) => (
                          <SelectItem key={bf.field_id} value={bf.field_id}>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {bf.display_name || bf.field_title}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {bf.field_id}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {bitrixInfo && (
                      <div className="mt-1">
                        <Badge variant="outline" className="text-xs">
                          {bitrixInfo.field_type}
                        </Badge>
                      </div>
                    )}
                  </TableCell>

                  {/* Transform Function */}
                  <TableCell>
                    <Select disabled value={row.transform_function || ''}>
                      <SelectTrigger>
                        <SelectValue placeholder="Nenhuma" />
                      </SelectTrigger>
                    </Select>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    {row.bitrix_field ? (
                      <Badge variant="default">Mapeado</Badge>
                    ) : (
                      <Badge variant="secondary">Não mapeado</Badge>
                    )}
                  </TableCell>

                  {/* Actions */}
                  <TableCell>
                    {row.mapping_id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteMapping(row.mapping_id!)}
                        title="Excluir mapeamento"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
