import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useFieldUsageInButtons, getFieldUsageInfo } from "@/hooks/useFieldUsageInButtons";
import { BatchDeleteDialog } from "./BatchDeleteDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, X, AlertTriangle, Info, Trash2 } from "lucide-react";

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
  supabase_field: string;
  bitrix_field: string | null;
  bitrix_field_type: string | null;
  supabase_type: string | null;
  transform_function: string | null;
  sync_active: boolean;
  sync_priority: number | null;
  is_hidden: boolean;
}

interface MergedFieldRow {
  supabase_field: string;
  supabase_type: string;
  supabase_nullable: string;
  bitrix_field: string | null;
  bitrix_display_name: string | null;
  bitrix_field_type: string | null;
  transform_function: string | null;
  sync_active: boolean;
  mapping_id: string | null;
  sync_priority: number | null;
  is_mapped: boolean;
  is_hidden: boolean;
}

export function SupabaseBasedMappingTable() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [showOnlyMapped, setShowOnlyMapped] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [selectedMappings, setSelectedMappings] = useState<Set<string>>(new Set());
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mappingToDelete, setMappingToDelete] = useState<string | null>(null);

  const { data: buttonUsageMap } = useFieldUsageInButtons();

  const {
    data: supabaseFields = [],
    isLoading: isLoadingSchema,
  } = useQuery({
    queryKey: ["supabase-schema"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_leads_schema");
      if (error) throw error;
      return data as SupabaseField[];
    },
  });

  const {
    data: bitrixFields = [],
    isLoading: isLoadingFields,
  } = useQuery({
    queryKey: ["bitrix-fields-cache"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bitrix_fields_cache")
        .select("*")
        .order("field_id");
      if (error) throw error;
      return data as BitrixField[];
    },
  });

  const {
    data: mappings = [],
    isLoading: isLoadingMappings,
  } = useQuery({
    queryKey: ["unified-field-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unified_field_config")
        .select("*")
        .order("sync_priority");
      if (error) throw error;
      return data as FieldMapping[];
    },
  });

  const mergedRows: MergedFieldRow[] = supabaseFields.map((sf) => {
    const mapping = mappings.find((m) => m.supabase_field === sf.column_name);
    const bitrixField = mapping
      ? bitrixFields.find((bf) => bf.field_id === mapping.bitrix_field)
      : null;

    return {
      supabase_field: sf.column_name,
      supabase_type: sf.data_type,
      supabase_nullable: sf.is_nullable,
      bitrix_field: mapping?.bitrix_field || null,
      bitrix_display_name: bitrixField?.display_name || bitrixField?.field_title || null,
      bitrix_field_type: mapping?.bitrix_field_type || null,
      transform_function: mapping?.transform_function || null,
      sync_active: mapping?.sync_active || false,
      mapping_id: mapping?.id || null,
      sync_priority: mapping?.sync_priority || null,
      is_mapped: !!mapping,
      is_hidden: mapping?.is_hidden || false,
    };
  });

  const createMappingMutation = useMutation({
    mutationFn: async (params: {
      bitrixField: string;
      supabaseField: string;
      bitrixFieldType: string | null;
      supabaseFieldType: string;
    }) => {
      const { error } = await supabase.from("bitrix_field_mappings").insert({
        bitrix_field: params.bitrixField,
        tabuladormax_field: params.supabaseField,
        bitrix_field_type: params.bitrixFieldType,
        tabuladormax_field_type: params.supabaseFieldType,
        active: true,
        priority: 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bitrix-field-mappings"] });
      toast.success("Mapeamento criado com sucesso");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar mapeamento: ${error.message}`);
    },
  });

  const updateMappingMutation = useMutation({
    mutationFn: async (params: {
      id: string;
      bitrixField: string;
      bitrixFieldType: string | null;
    }) => {
      const { error } = await supabase
        .from("bitrix_field_mappings")
        .update({
          bitrix_field: params.bitrixField,
          bitrix_field_type: params.bitrixFieldType,
        })
        .eq("id", params.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bitrix-field-mappings"] });
      toast.success("Mapeamento atualizado com sucesso");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar mapeamento: ${error.message}`);
    },
  });

  const deactivateMappingMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("bitrix_field_mappings")
        .update({ active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bitrix-field-mappings"] });
      toast.success("Mapeamento desativado com sucesso");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao desativar mapeamento: ${error.message}`);
    },
  });

  const deleteMappingMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bitrix_field_mappings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bitrix-field-mappings"] });
      setSelectedMappings(new Set());
      toast.success("Mapeamento excluído com sucesso");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir mapeamento: ${error.message}`);
    },
  });

  const batchDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("bitrix_field_mappings").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ["bitrix-field-mappings"] });
      setSelectedMappings(new Set());
      setBatchDeleteDialogOpen(false);
      toast.success(`${ids.length} mapeamento(s) excluído(s) com sucesso`);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir mapeamentos: ${error.message}`);
    },
  });

  const batchDeactivateMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("bitrix_field_mappings")
        .update({ active: false })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ["bitrix-field-mappings"] });
      setSelectedMappings(new Set());
      setBatchDeleteDialogOpen(false);
      toast.success(`${ids.length} mapeamento(s) desativado(s) com sucesso`);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao desativar mapeamentos: ${error.message}`);
    },
  });

  const handleMapField = async (supabaseField: string, supabaseType: string, bitrixField: string) => {
    const existingMapping = mappings.find((m) => m.supabase_field === supabaseField);

    if (!bitrixField || bitrixField === "__none__") {
      if (existingMapping) {
        deactivateMappingMutation.mutate(existingMapping.id);
      }
      return;
    }

    const bitrixFieldData = bitrixFields.find((bf) => bf.field_id === bitrixField);
    if (!bitrixFieldData) {
      toast.error("Campo Bitrix inválido ou não encontrado no cache");
      return;
    }

    if (existingMapping) {
      updateMappingMutation.mutate({
        id: existingMapping.id,
        bitrixField,
        bitrixFieldType: bitrixFieldData.field_type,
      });
    } else {
      createMappingMutation.mutate({
        bitrixField,
        supabaseField,
        bitrixFieldType: bitrixFieldData.field_type,
        supabaseFieldType: supabaseType,
      });
    }
  };

  const handleDeleteMapping = (id: string) => {
    setMappingToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteMapping = () => {
    if (mappingToDelete) {
      deleteMappingMutation.mutate(mappingToDelete);
      setDeleteDialogOpen(false);
      setMappingToDelete(null);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedMappings);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedMappings(newSelection);
  };

  const toggleSelectAll = () => {
    const mappedRows = filteredRows.filter((r) => r.mapping_id);
    if (selectedMappings.size === mappedRows.length && mappedRows.length > 0) {
      setSelectedMappings(new Set());
    } else {
      setSelectedMappings(new Set(mappedRows.map((r) => r.mapping_id!)));
    }
  };

  const filteredRows = mergedRows.filter((row) => {
    const matchesSearch =
      !search ||
      row.supabase_field.toLowerCase().includes(search.toLowerCase()) ||
      row.bitrix_field?.toLowerCase().includes(search.toLowerCase()) ||
      row.bitrix_display_name?.toLowerCase().includes(search.toLowerCase());

    const matchesMappedFilter = !showOnlyMapped || row.is_mapped;

    return matchesSearch && matchesMappedFilter;
  });

  const selectedMappingsData = Array.from(selectedMappings)
    .map((id) => {
      const mapping = mappings.find((m) => m.id === id);
      if (!mapping) return null;
      return {
        id: mapping.id,
        bitrix_field: mapping.bitrix_field,
        supabase_field: mapping.supabase_field,
      };
    })
    .filter(Boolean) as Array<{
    id: string;
    bitrix_field: string;
    supabase_field: string;
  }>;

  const usageInfoMap = new Map(
    selectedMappingsData.map((m) => [
      m.bitrix_field,
      getFieldUsageInfo(m.bitrix_field, buttonUsageMap),
    ])
  );

  const mappingToDeleteData = mappings.find((m) => m.id === mappingToDelete);
  const mappingToDeleteUsage = mappingToDeleteData
    ? getFieldUsageInfo(mappingToDeleteData.bitrix_field, buttonUsageMap)
    : null;

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Input
              placeholder="Buscar por campo Supabase ou Bitrix..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={showOnlyMapped}
              onCheckedChange={setShowOnlyMapped}
              id="show-mapped"
            />
            <Label htmlFor="show-mapped">Mostrar apenas mapeados</Label>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Total: {filteredRows.length}</span>
            <span>Mapeados: {filteredRows.filter((r) => r.is_mapped).length}</span>
            {selectedMappings.size > 0 && (
              <Badge variant="secondary">{selectedMappings.size} selecionado(s)</Badge>
            )}
          </div>
          {selectedMappings.size > 0 && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedMappings(new Set())}>
                Limpar
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setBatchDeleteDialogOpen(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir ({selectedMappings.size})
              </Button>
            </div>
          )}
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    selectedMappings.size === filteredRows.filter((r) => r.mapping_id).length &&
                    filteredRows.filter((r) => r.mapping_id).length > 0
                  }
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Campo Supabase</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-center">→</TableHead>
              <TableHead>Campo Bitrix</TableHead>
              <TableHead>Uso em Botões</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoadingSchema || isLoadingFields || isLoadingMappings ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : (
              filteredRows.map((row) => {
                const usageInfo = getFieldUsageInfo(row.bitrix_field, buttonUsageMap);
                const isSelected = row.mapping_id ? selectedMappings.has(row.mapping_id) : false;

                return (
                  <TableRow key={row.supabase_field}>
                    <TableCell>
                      {row.mapping_id && (
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelection(row.mapping_id!)}
                        />
                      )}
                    </TableCell>

                    <TableCell className="font-mono text-sm">{row.supabase_field}</TableCell>

                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {row.supabase_type}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-center text-muted-foreground">→</TableCell>

                    <TableCell>
                      <Select
                        value={row.bitrix_field || "__none__"}
                        onValueChange={(value) =>
                          handleMapField(row.supabase_field, row.supabase_type, value)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Nenhum</SelectItem>
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
                    </TableCell>

                    <TableCell>
                      {usageInfo.isUsedInButtons ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              {usageInfo.usageLevel === "critical" && (
                                <Badge variant="destructive" className="gap-1 cursor-help">
                                  <AlertTriangle className="h-3 w-3" />
                                  CRÍTICO
                                </Badge>
                              )}
                              {usageInfo.usageLevel === "important" && (
                                <Badge className="gap-1 cursor-help bg-orange-500 hover:bg-orange-600">
                                  <AlertTriangle className="h-3 w-3" />
                                  {usageInfo.buttonCount}
                                </Badge>
                              )}
                              {usageInfo.usageLevel === "moderate" && (
                                <Badge variant="secondary" className="gap-1 cursor-help">
                                  <Info className="h-3 w-3" />
                                  {usageInfo.buttonCount}
                                </Badge>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-xs">
                            <div className="space-y-2">
                              <p className="font-semibold text-xs">
                                ⚠️ Usado em {usageInfo.buttonCount} botão(ões):
                              </p>
                              <ul className="list-disc list-inside text-xs space-y-1">
                                {usageInfo.buttonNames.map((name, idx) => (
                                  <li key={idx}>{name}</li>
                                ))}
                              </ul>
                              {usageInfo.usageLevel === "critical" && (
                                <p className="text-xs text-destructive font-medium mt-2">
                                  ATENÇÃO: Pode quebrar botões em /telemarketing!
                                </p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    <TableCell>
                      {row.is_mapped ? (
                        <Badge className="bg-green-600">Mapeado</Badge>
                      ) : (
                        <Badge variant="outline">Não mapeado</Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      {row.mapping_id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteMapping(row.mapping_id!)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                {mappingToDeleteUsage?.usageLevel === "critical" ||
                mappingToDeleteUsage?.usageLevel === "important" ? (
                  <>
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    ⚠️ Campo em Uso!
                  </>
                ) : (
                  "Confirmar Exclusão"
                )}
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3 text-sm">
                  {mappingToDeleteUsage?.isUsedInButtons ? (
                    <>
                      <p className="text-destructive font-medium">
                        Campo <strong>{mappingToDeleteData?.bitrix_field}</strong> usado em{" "}
                        <strong>{mappingToDeleteUsage.buttonCount} botão(ões)</strong> do tabulador.
                      </p>
                      <div className="bg-muted p-2 rounded text-xs">
                        <p className="font-semibold mb-1">Botões afetados:</p>
                        <ul className="list-disc list-inside">
                          {mappingToDeleteUsage.buttonNames.map((name, idx) => (
                            <li key={idx}>{name}</li>
                          ))}
                        </ul>
                      </div>
                      <p className="text-xs">
                        <strong>Recomendação:</strong> Desative ao invés de excluir.
                      </p>
                    </>
                  ) : (
                    <p>Tem certeza que deseja excluir este mapeamento?</p>
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              {mappingToDeleteUsage?.isUsedInButtons && (
                <Button
                  variant="outline"
                  onClick={() => {
                    if (mappingToDelete) {
                      deactivateMappingMutation.mutate(mappingToDelete);
                      setDeleteDialogOpen(false);
                      setMappingToDelete(null);
                    }
                  }}
                >
                  Desativar
                </Button>
              )}
              <AlertDialogAction onClick={confirmDeleteMapping}>
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <BatchDeleteDialog
          open={batchDeleteDialogOpen}
          onOpenChange={setBatchDeleteDialogOpen}
          selectedMappings={selectedMappingsData}
          usageInfoMap={usageInfoMap}
          onConfirmDelete={() => batchDeleteMutation.mutate(Array.from(selectedMappings))}
          onDeactivateInstead={() => batchDeactivateMutation.mutate(Array.from(selectedMappings))}
        />
      </div>
    </TooltipProvider>
  );
}
