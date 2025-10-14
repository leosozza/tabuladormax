import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
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

  // Carregar lista do cache
  const loadFromCache = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('config_kv')
        .select('value')
        .eq('key', 'bitrix_telemarketing_list')
        .maybeSingle();

      if (error) throw error;

      if (data?.value) {
        setOptions(data.value as unknown as TelemarketingOption[]);
      } else {
        // Se não houver cache, sincronizar
        await syncFromBitrix();
      }
    } catch (error) {
      console.error('Erro ao carregar lista de telemarketing:', error);
      toast.error('Erro ao carregar lista de telemarketing');
    } finally {
      setLoading(false);
    }
  };

  // Sincronizar do Bitrix24
  const syncFromBitrix = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-bitrix-telemarketing');

      if (error) throw error;

      if (data?.items) {
        setOptions(data.items);
        toast.success(`${data.count} operadores sincronizados`);
      }
    } catch (error) {
      console.error('Erro ao sincronizar telemarketing:', error);
      toast.error('Erro ao sincronizar do Bitrix24');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadFromCache();
  }, []);

  return (
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
        onClick={syncFromBitrix}
        disabled={refreshing}
      >
        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
      </Button>
    </div>
  );
}
