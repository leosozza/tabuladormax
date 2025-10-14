import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw, Plus } from "lucide-react";
import { toast } from "sonner";

interface TelemarketingOption {
  id: number;
  title: string;
}

interface TelemarketingSelectorProps {
  value?: number;
  onChange: (value: number) => void;
  placeholder?: string;
}

export function TelemarketingSelector({ value, onChange, placeholder = "Selecione o telemarketing" }: TelemarketingSelectorProps) {
  const [options, setOptions] = useState<TelemarketingOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTelemarketingName, setNewTelemarketingName] = useState("");
  const [creating, setCreating] = useState(false);

  // Carregar lista do cache
  const loadFromCache = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('config_kv')
        .select('value')
        .eq('key', 'bitrix_telemarketing_list')
        .maybeSingle();

      if (error) {
        console.error('Erro ao carregar cache:', error);
        toast.error('Erro ao carregar lista de telemarketing');
        return;
      }

      if (data?.value) {
        setOptions(data.value as unknown as TelemarketingOption[]);
      } else {
        // Se não houver cache, sincronizar
        await syncFromBitrix();
      }
    } catch (error) {
      console.error('Erro ao carregar lista de telemarketing:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar lista de telemarketing';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Sincronizar do Bitrix24
  const syncFromBitrix = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-bitrix-telemarketing');

      if (error) {
        console.error('Erro ao sincronizar telemarketing:', error);
        toast.error(error.message || 'Erro ao sincronizar do Bitrix24');
        return;
      }

      if (data?.error) {
        console.error('Erro do servidor ao sincronizar:', data.error);
        toast.error(data.error);
        return;
      }

      if (data?.items) {
        setOptions(data.items);
        toast.success(`${data.count} operadores sincronizados`);
      } else {
        toast.error('Resposta inválida do servidor');
      }
    } catch (error) {
      console.error('Erro ao sincronizar telemarketing:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao sincronizar do Bitrix24';
      toast.error(errorMessage);
    } finally {
      setRefreshing(false);
    }
  };

  // Criar novo telemarketing
  const handleCreateNew = async () => {
    if (!newTelemarketingName.trim()) {
      toast.error("Por favor, digite o nome do operador de telemarketing");
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-bitrix-telemarketing', {
        body: { title: newTelemarketingName.trim() }
      });

      if (error) {
        console.error('Erro ao criar telemarketing:', error);
        toast.error(error.message || 'Erro ao criar operador de telemarketing');
        return;
      }

      if (data?.error) {
        console.error('Erro do servidor ao criar telemarketing:', data.error);
        toast.error(data.error);
        return;
      }

      if (data?.item) {
        // Adicionar à lista local
        const newOption = { id: data.item.id, title: data.item.title };
        setOptions(prev => [...prev, newOption]);
        
        // Selecionar automaticamente
        onChange(data.item.id);
        
        toast.success(`Operador "${data.item.title}" criado com sucesso!`);
        
        // Fechar dialog e limpar campo
        setCreateDialogOpen(false);
        setNewTelemarketingName("");
      } else {
        toast.error('Resposta inválida do servidor');
      }
    } catch (error) {
      console.error('Erro ao criar telemarketing:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao criar operador de telemarketing';
      toast.error(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    loadFromCache();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="flex gap-2">
        <Select value={value?.toString()} onValueChange={(v) => onChange(parseInt(v))}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.id} value={option.id.toString()}>
                {option.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setCreateDialogOpen(true)}
          title="Criar novo operador"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={syncFromBitrix}
          disabled={refreshing}
          title="Sincronizar lista"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Operador de Telemarketing</DialogTitle>
            <DialogDescription>
              Digite o nome do operador de telemarketing que será criado no Bitrix24.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="telemarketing-name">Nome do Operador *</Label>
              <Input
                id="telemarketing-name"
                placeholder="Ex: João Silva"
                value={newTelemarketingName}
                onChange={(e) => setNewTelemarketingName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !creating) {
                    handleCreateNew();
                  }
                }}
                disabled={creating}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                setNewTelemarketingName("");
              }}
              disabled={creating}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleCreateNew}
              disabled={creating || !newTelemarketingName.trim()}
            >
              {creating ? "Criando..." : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
