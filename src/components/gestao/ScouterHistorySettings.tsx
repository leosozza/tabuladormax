import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Trash2, Save, Database } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function ScouterHistorySettings() {
  const queryClient = useQueryClient();
  const [retentionDays, setRetentionDays] = useState<number>(30);

  // Buscar configuração atual
  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['scouter-retention-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('config_kv')
        .select('value')
        .eq('key', 'scouter_location_retention_days')
        .single();
      
      if (error) throw error;
      const days = parseInt(data.value as string);
      setRetentionDays(days);
      return days;
    },
  });

  // Buscar estatísticas
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['scouter-location-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_scouter_location_stats');
      if (error) throw error;
      return data as {
        total_records: number;
        oldest_record: string;
        newest_record: string;
        unique_scouters: number;
      };
    },
  });

  // Salvar configuração
  const saveMutation = useMutation({
    mutationFn: async (days: number) => {
      const { error } = await supabase
        .from('config_kv')
        .upsert({
          key: 'scouter_location_retention_days',
          value: days.toString(),
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Configuração salva com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['scouter-retention-config'] });
    },
    onError: (error) => {
      toast.error('Erro ao salvar configuração: ' + error.message);
    },
  });

  // Limpar histórico manualmente
  const cleanupMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('cleanup-scouter-history');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`${data.deleted_records} registros removidos com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ['scouter-location-stats'] });
    },
    onError: (error) => {
      toast.error('Erro ao limpar histórico: ' + error.message);
    },
  });

  const handleSave = () => {
    if (retentionDays < 1 || retentionDays > 365) {
      toast.error('O período deve estar entre 1 e 365 dias');
      return;
    }
    saveMutation.mutate(retentionDays);
  };

  const handleCleanup = () => {
    if (confirm('Tem certeza que deseja limpar o histórico antigo? Esta ação não pode ser desfeita.')) {
      cleanupMutation.mutate();
    }
  };

  if (configLoading || statsLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Configurações de Histórico de Localização
        </CardTitle>
        <CardDescription>
          Configure por quanto tempo os dados de localização dos scouters serão mantidos no sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configuração de Retenção */}
        <div className="space-y-2">
          <Label htmlFor="retention">Período de Retenção</Label>
          <div className="flex gap-2 items-center">
            <Input
              id="retention"
              type="number"
              min="1"
              max="365"
              value={retentionDays}
              onChange={(e) => setRetentionDays(parseInt(e.target.value) || 30)}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">dias</span>
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              size="sm"
              className="ml-auto"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span className="ml-2">Salvar</span>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Registros mais antigos que {retentionDays} dias serão removidos automaticamente
          </p>
        </div>

        {/* Estatísticas */}
        {stats && (
          <div className="border rounded-lg p-4 space-y-3 bg-muted/50">
            <h4 className="font-medium text-sm">Estatísticas do Histórico</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total de registros</p>
                <p className="font-semibold">{stats.total_records.toLocaleString('pt-BR')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Scouters únicos</p>
                <p className="font-semibold">{stats.unique_scouters}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Registro mais antigo</p>
                <p className="font-semibold">
                  {stats.oldest_record 
                    ? format(new Date(stats.oldest_record), "dd/MM/yyyy HH:mm", { locale: ptBR })
                    : '-'
                  }
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Registro mais recente</p>
                <p className="font-semibold">
                  {stats.newest_record 
                    ? format(new Date(stats.newest_record), "dd/MM/yyyy HH:mm", { locale: ptBR })
                    : '-'
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Limpeza Manual */}
        <div className="pt-4 border-t">
          <Button
            onClick={handleCleanup}
            disabled={cleanupMutation.isPending}
            variant="destructive"
            className="w-full"
          >
            {cleanupMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            <span className="ml-2">Limpar Histórico Manualmente</span>
          </Button>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Remove todos os registros mais antigos que {retentionDays} dias
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
