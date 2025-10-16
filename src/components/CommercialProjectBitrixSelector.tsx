import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Plus, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ProjectOption {
  id: string;
  title: string;
}

interface CommercialProjectBitrixSelectorProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onPendingCreate?: (name: string | null) => void;
  defaultSearchValue?: string;
  disabled?: boolean;
}

export function CommercialProjectBitrixSelector({ 
  value, 
  onChange, 
  placeholder = "Selecione o projeto comercial", 
  onPendingCreate, 
  defaultSearchValue, 
  disabled = false 
}: CommercialProjectBitrixSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchResults, setSearchResults] = useState<ProjectOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedOption, setSelectedOption] = useState<ProjectOption | null>(null);
  const [pendingCreateName, setPendingCreateName] = useState<string | null>(null);
  const [options, setOptions] = useState<ProjectOption[]>([]);

  // Carregar cache inicial
  useEffect(() => {
    loadFromCache();
  }, []);

  // Atualizar selectedOption quando value mudar
  useEffect(() => {
    if (value) {
      const option = options.find(o => o.id === value) || searchResults.find(o => o.id === value);
      if (option) {
        setSelectedOption(option);
      }
    }
  }, [value, options, searchResults]);

  // Sincronizar searchValue com defaultSearchValue
  useEffect(() => {
    if (defaultSearchValue && defaultSearchValue.trim()) {
      setSearchValue(defaultSearchValue.trim());
    }
  }, [defaultSearchValue]);

  // Debounce para busca automática
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue.length >= 3) {
        setDebouncedSearch(searchValue);
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue]);

  // Buscar quando debounce atualizar
  useEffect(() => {
    if (debouncedSearch.length >= 3) {
      performSearch(debouncedSearch);
    }
  }, [debouncedSearch]);

  const loadFromCache = async () => {
    try {
      const { data, error } = await supabase
        .from('config_kv')
        .select('value')
        .eq('key', 'bitrix_commercial_projects_list')
        .maybeSingle();

      if (!error && data?.value) {
        setOptions(data.value as unknown as ProjectOption[]);
      }
    } catch (error) {
      console.error('Erro ao carregar cache de projetos:', error);
    }
  };

  const performSearch = async (term: string) => {
    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-bitrix-commercial-projects', {
        body: { searchTerm: term }
      });

      if (!error && data?.results) {
        setSearchResults(data.results);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Erro na busca de projetos:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectOption = (option: ProjectOption) => {
    // Adicionar à lista local se não existir
    const exists = options.find(o => o.id === option.id);
    if (!exists) {
      setOptions(prev => [...prev, option]);
    }

    // Selecionar
    setSelectedOption(option);
    onChange(option.id);
    setOpen(false);
    
    // Limpar criação pendente
    setPendingCreateName(null);
    if (onPendingCreate) {
      onPendingCreate(null);
    }
    
    toast.success(`✅ Projeto "${option.title}" selecionado!`);
  };

  const handleCreateNewClick = () => {
    const name = (defaultSearchValue && defaultSearchValue.trim()) || searchValue.trim();
    
    if (!name) {
      toast.error("Nome não pode estar vazio");
      return;
    }
    
    setPendingCreateName(name);
    
    if (onPendingCreate) {
      onPendingCreate(name);
    }
    
    setSelectedOption({ id: '-1', title: `✨ Novo: ${name}` });
    onChange('-1');
    setOpen(false);
    
    toast.info(`Projeto "${name}" será criado ao finalizar o cadastro`);
  };

  return (
    <Popover open={open} onOpenChange={disabled ? () => {} : setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between"
        >
          {selectedOption ? (
            <span className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              {selectedOption.title}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-full p-0" align="start">
        <div className="flex flex-col">
          {/* Input personalizado */}
          <div className="p-3 border-b">
            <Input
              placeholder="Digite o nome do projeto (mín. 3 letras)..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              autoFocus
              className="w-full"
            />
          </div>
          
          {/* Lista de resultados */}
          <ScrollArea className="h-[300px]">
            {isSearching && (
              <div className="py-6 text-center">
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                <p className="text-sm text-muted-foreground mt-2">
                  Buscando no Bitrix...
                </p>
              </div>
            )}
            
            {!isSearching && searchValue.length > 0 && searchValue.length < 3 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Digite pelo menos 3 letras
              </div>
            )}
            
            {!isSearching && searchValue.length === 0 && options.length > 0 && (
              <div className="p-2">
                <p className="text-xs text-muted-foreground mb-2 px-2">
                  Projetos em cache
                </p>
                {options.slice(0, 10).map((option) => (
                  <div
                    key={option.id}
                    onClick={() => handleSelectOption(option)}
                    className="flex items-center justify-between p-2 hover:bg-muted rounded cursor-pointer"
                  >
                    <div className="flex items-center flex-1">
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedOption?.id === option.id ? "opacity-100 text-green-600" : "opacity-0"
                        )}
                      />
                      <span className={cn(selectedOption?.id === option.id && "font-semibold")}>
                        {option.title}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {!isSearching && searchResults.length > 0 && (
              <div className="p-2">
                <p className="text-xs text-muted-foreground mb-2 px-2">
                  {searchResults.length} projeto(s) encontrado(s)
                </p>
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    onClick={() => handleSelectOption(result)}
                    className="flex items-center justify-between p-2 hover:bg-muted rounded cursor-pointer"
                  >
                    <div className="flex items-center flex-1">
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedOption?.id === result.id ? "opacity-100 text-green-600" : "opacity-0"
                        )}
                      />
                      <span className={cn(selectedOption?.id === result.id && "font-semibold")}>
                        {result.title}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      ID: {result.id}
                    </span>
                  </div>
                ))}
              </div>
            )}
            
            {!isSearching && 
             searchValue.length >= 3 && 
             searchResults.length === 0 && (
              <div className="p-2 border-t">
                <div
                  onClick={handleCreateNewClick}
                  className="flex items-center p-2 hover:bg-muted rounded cursor-pointer"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <span>✨ Criar novo: <strong>{searchValue}</strong></span>
                </div>
              </div>
            )}
            
            {!isSearching && 
             searchValue.length >= 3 && 
             searchResults.length > 0 && (
              <div className="p-2 border-t">
                <div
                  onClick={handleCreateNewClick}
                  className="flex items-center p-2 hover:bg-muted rounded cursor-pointer text-muted-foreground"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <span>Ou criar novo: <strong>{searchValue}</strong></span>
                </div>
              </div>
            )}
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}
