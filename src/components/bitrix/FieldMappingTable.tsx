import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, GripVertical, Save, X, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getBitrixFieldLabel } from '@/lib/fieldLabelUtils';

interface FieldMapping {
  id: string;
  bitrix_field: string;
  tabuladormax_field: string;
  transform_function: string | null;
  priority: number;
  active: boolean;
  bitrix_field_type: string | null;
  tabuladormax_field_type: string | null;
  notes: string | null;
}

interface Props {
  mappings: FieldMapping[];
  bitrixFields: Array<{ field_id: string; field_title: string; field_type: string }>;
  supabaseFields: Array<{ column_name: string; data_type: string }>;
  onUpdate: () => void;
}

export function FieldMappingTable({ mappings, bitrixFields, supabaseFields, onUpdate }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<FieldMapping>>({});

  const handleEdit = (mapping: FieldMapping) => {
    setEditingId(mapping.id);
    setEditForm(mapping);
  };

  const handleSave = async () => {
    if (!editingId) return;

    try {
      const { error } = await supabase
        .from('bitrix_field_mappings')
        .update(editForm)
        .eq('id', editingId);

      if (error) throw error;

      toast.success('Mapeamento atualizado');
      setEditingId(null);
      onUpdate();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar mapeamento');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente deletar este mapeamento?')) return;

    try {
      const { error } = await supabase
        .from('bitrix_field_mappings')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Mapeamento deletado');
      onUpdate();
    } catch (error) {
      console.error('Erro ao deletar:', error);
      toast.error('Erro ao deletar mapeamento');
    }
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from('bitrix_field_mappings')
        .update({ active: !active })
        .eq('id', id);

      if (error) throw error;

      toast.success(active ? 'Mapeamento desativado' : 'Mapeamento ativado');
      onUpdate();
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead>Campo Bitrix</TableHead>
            <TableHead className="w-16 text-center">↔</TableHead>
            <TableHead>Campo Supabase</TableHead>
            <TableHead>Transformação</TableHead>
            <TableHead className="w-24 text-center">Prioridade</TableHead>
            <TableHead className="w-24 text-center">Status</TableHead>
            <TableHead className="w-32 text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mappings.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                Nenhum mapeamento configurado. Clique em "Adicionar Mapeamento" para começar.
              </TableCell>
            </TableRow>
          ) : (
            mappings.map((mapping) => {
              const isEditing = editingId === mapping.id;
              const bitrixInfo = bitrixFields.find(
                (field) => field.field_id === mapping.bitrix_field
              );
              
              return (
                <TableRow key={mapping.id}>
                  <TableCell>
                    <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                  </TableCell>
                  
                  <TableCell>
                    {isEditing ? (
                      <Select
                        value={editForm.bitrix_field}
                        onValueChange={(value) => setEditForm({ ...editForm, bitrix_field: value })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {bitrixFields.map((field) => (
                            <SelectItem key={field.field_id} value={field.field_id}>
                              <div className="flex items-center justify-between gap-2">
                                <span>{getBitrixFieldLabel(field)}</span>
                                <code className="text-xs text-muted-foreground">{field.field_id}</code>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {getBitrixFieldLabel(bitrixInfo || { field_id: mapping.bitrix_field })}
                        </span>
                        <code className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded mt-1 inline-block">
                          {mapping.bitrix_field}
                        </code>
                        {mapping.bitrix_field_type && (
                          <Badge variant="outline" className="text-[10px] mt-1 self-start">
                            {mapping.bitrix_field_type}
                          </Badge>
                        )}
                        {!bitrixInfo && (
                          <span className="mt-1 text-xs text-destructive">
                            Campo não encontrado no Bitrix (verifique se foi removido).
                          </span>
                        )}
                      </div>
                    )}
                  </TableCell>
                  
                  <TableCell className="text-center">
                    <Badge variant={mapping.active ? "default" : "secondary"}>
                      {mapping.active ? '✓' : '✗'}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    {isEditing ? (
                      <Select
                        value={editForm.tabuladormax_field}
                        onValueChange={(value) => setEditForm({ ...editForm, tabuladormax_field: value })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {supabaseFields.map((field) => (
                            <SelectItem key={field.column_name} value={field.column_name}>
                              {field.column_name} ({field.data_type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div>
                        <code className="text-xs bg-muted px-2 py-1 rounded">{mapping.tabuladormax_field}</code>
                        {mapping.tabuladormax_field_type && (
                          <Badge variant="outline" className="ml-2 text-xs">{mapping.tabuladormax_field_type}</Badge>
                        )}
                      </div>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    {isEditing ? (
                      <Select
                        value={editForm.transform_function || 'none'}
                        onValueChange={(value) => setEditForm({ 
                          ...editForm, 
                          transform_function: value === 'none' ? null : value 
                        })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhuma</SelectItem>
                          <SelectItem value="toNumber">toNumber</SelectItem>
                          <SelectItem value="toString">toString</SelectItem>
                          <SelectItem value="toBoolean">toBoolean</SelectItem>
                          <SelectItem value="toDate">toDate</SelectItem>
                          <SelectItem value="toTimestamp">toTimestamp</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      mapping.transform_function ? (
                        <Badge variant="secondary" className="text-xs">{mapping.transform_function}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )
                    )}
                  </TableCell>
                  
                  <TableCell className="text-center">
                    {isEditing ? (
                      <Input
                        type="number"
                        value={editForm.priority || 0}
                        onChange={(e) => setEditForm({ ...editForm, priority: parseInt(e.target.value) })}
                        className="w-20 text-center"
                      />
                    ) : (
                      <Badge variant="outline">{mapping.priority}</Badge>
                    )}
                  </TableCell>
                  
                  <TableCell className="text-center">
                    <Switch
                      checked={mapping.active}
                      onCheckedChange={() => handleToggleActive(mapping.id, mapping.active)}
                      disabled={isEditing}
                    />
                  </TableCell>
                  
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {isEditing ? (
                        <>
                          <Button size="icon" variant="ghost" onClick={handleSave}>
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="icon" variant="ghost" onClick={() => handleEdit(mapping)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(mapping.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
