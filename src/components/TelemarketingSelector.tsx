import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw, Plus, Search } from "lucide-react";
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
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [newTelemarketingName, setNewTelemarketingName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<TelemarketingOption[]>([]);
  const [creating, setCreating] = useState(false);
  const [searching, setSearching] = useState(false);

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

  // Buscar telemarketing no Bitrix24
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast.error("Por favor, digite um nome para buscar");
      return;
    }

    setSearching(true);
    setSearchResults([]);
    
    try {
      const { data, error } = await supabase.functions.invoke('search-bitrix-telemarketing', {
        body: { searchTerm: searchTerm.trim() }
      });

      if (error) {
        console.error('Erro ao buscar telemarketing:', error);
        toast.error(error.message || 'Erro ao buscar no Bitrix24');
        return;
      }

      if (data?.error) {
        console.error('Erro do servidor ao buscar:', data.error);
        toast.error(data.error);
        return;
      }

      if (data?.results) {
        setSearchResults(data.results);
        
        if (data.results.length === 0) {
          toast.info('Nenhum operador encontrado com esse nome');
        } else {
          toast.success(`${data.count} operador(es) encontrado(s)`);
        }
      } else {
        toast.error('Resposta inválida do servidor');
      }
    } catch (error) {
      console.error('Erro ao buscar telemarketing:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar no Bitrix24';
      toast.error(errorMessage);
    } finally {
      setSearching(false);
    }
  };

  // Selecionar um resultado da busca
  const handleSelectSearchResult = (option: TelemarketingOption) => {
    // Adicionar à lista local se não estiver lá
    const exists = options.find(o => o.id === option.id);
    if (!exists) {
      setOptions(prev => [...prev, option]);
    }
    
    // Selecionar
    onChange(option.id);
    
    toast.success(`Operador "${option.title}" selecionado`);
    
    // Fechar dialog e limpar
    setSearchDialogOpen(false);
    setSearchTerm("");
    setSearchResults([]);
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
          onClick={() => setSearchDialogOpen(true)}
          title="Buscar operador no Bitrix24"
        >
          <Search className="h-4 w-4" />
        </Button>
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

      {/* Search Dialog */}
      <Dialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Buscar Operador no Bitrix24</DialogTitle>
            <DialogDescription>
              Digite o nome completo do operador. Se não encontrar, buscará por operadores cujo nome comece com as 3 primeiras letras.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <div className="flex-1 space-y-2">
                <Label htmlFor="search-term">Nome do Operador</Label>
                <Input
                  id="search-term"
                  placeholder="Ex: João Silva"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !searching) {
                      handleSearch();
                    }
                  }}
                  disabled={searching}
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  onClick={handleSearch}
                  disabled={searching || !searchTerm.trim()}
                >
                  {searching ? "Buscando..." : "Buscar"}
                </Button>
              </div>
            </div>
            
            {searchResults.length > 0 && (
              <div className="space-y-2">
                <Label>Resultados ({searchResults.length})</Label>
                <div className="border rounded-md max-h-60 overflow-y-auto">
                  {searchResults.map((result) => (
                    <div
                      key={result.id}
                      className="flex items-center justify-between p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                      onClick={() => handleSelectSearchResult(result)}
                    >
                      <span className="font-medium">{result.title}</span>
                      <span className="text-sm text-muted-foreground">ID: {result.id}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSearchDialogOpen(false);
                setSearchTerm("");
                setSearchResults([]);
              }}
              disabled={searching}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
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
