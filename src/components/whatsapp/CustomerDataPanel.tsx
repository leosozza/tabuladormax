import { useState } from 'react';
import { 
  User, Phone, Mail, MapPin, Calendar, Building, 
  RefreshCw, Loader2, ExternalLink, AlertCircle, 
  CheckCircle, Sparkles, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface CustomerDataPanelProps {
  phoneNumber: string;
  bitrixId?: string;
}

interface LeadData {
  id: number;
  name: string | null;
  nome_modelo: string | null;
  celular: string | null;
  telefone_trabalho: string | null;
  responsible: string | null;
  etapa: string | null;
  fonte: string | null;
  address: string | null;
  age: number | null;
  data_agendamento: string | null;
  horario_agendamento: string | null;
  ficha_confirmada: boolean | null;
  presenca_confirmada: boolean | null;
  compareceu: boolean | null;
  scouter: string | null;
  op_telemarketing: string | null;
  criado: string | null;
  date_modify: string | null;
  raw: Record<string, any> | null;
}

// Normalizar telefone para busca
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('55')) {
    const ddd = digits.slice(2, 4);
    const number = digits.slice(4);
    return `55${ddd}9${number}`;
  }
  return digits;
}

export function CustomerDataPanel({ phoneNumber, bitrixId }: CustomerDataPanelProps) {
  const queryClient = useQueryClient();
  const [isEnriching, setIsEnriching] = useState(false);

  // Buscar dados do lead pelo bitrix_id ou telefone
  const { data: leadData, isLoading, refetch } = useQuery({
    queryKey: ['customer-data', phoneNumber, bitrixId],
    queryFn: async () => {
      // Primeiro tentar por bitrix_id
      if (bitrixId) {
        const { data, error } = await supabase
          .from('leads')
          .select('*')
          .eq('id', parseInt(bitrixId))
          .maybeSingle();
        
        if (data) return data as LeadData;
      }

      // Se não encontrou, tentar por telefone
      const normalized = normalizePhone(phoneNumber);
      const last9 = normalized.slice(-9);

      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .or(`celular.ilike.%${last9},telefone_trabalho.ilike.%${last9}`)
        .order('date_modify', { ascending: false })
        .limit(1)
        .maybeSingle();

      return data as LeadData | null;
    },
    enabled: !!phoneNumber,
    staleTime: 30000,
  });

  // Mutation para enriquecer dados via Bitrix
  const enrichMutation = useMutation({
    mutationFn: async () => {
      setIsEnriching(true);
      
      // Chamar edge function para buscar no Bitrix
      const { data, error } = await supabase.functions.invoke('enrich-customer-from-bitrix', {
        body: { phone_number: phoneNumber }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.found) {
        toast.success(`Lead encontrado: ${data.lead_name || 'ID ' + data.lead_id}`);
        queryClient.invalidateQueries({ queryKey: ['customer-data', phoneNumber] });
        refetch();
      } else {
        toast.info('Nenhum lead ou deal encontrado no Bitrix com este telefone');
      }
    },
    onError: (error) => {
      console.error('Erro ao enriquecer:', error);
      toast.error('Erro ao buscar dados no Bitrix');
    },
    onSettled: () => {
      setIsEnriching(false);
    }
  });

  const handleEnrich = () => {
    enrichMutation.mutate();
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const formatDateOnly = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Se não tem dados vinculados
  if (!leadData) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
        <h3 className="text-lg font-medium mb-2">Nenhum lead vinculado</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs">
          Este contato não está vinculado a nenhum lead ou deal no Bitrix. 
          Clique abaixo para buscar automaticamente.
        </p>
        <Button 
          onClick={handleEnrich}
          disabled={isEnriching}
          className="gap-2"
        >
          {isEnriching ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Buscando no Bitrix...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Enriquecer Informações
            </>
          )}
        </Button>
      </div>
    );
  }

  // Tem dados - exibir painel completo
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Dados do Cliente</span>
            <Badge variant="secondary" className="text-xs">
              ID: {leadData.id}
            </Badge>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => refetch()}
            className="h-7 px-2"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 p-3">
        <div className="space-y-4">
          {/* Informações Básicas */}
          <Card>
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Informações Básicas
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 space-y-2">
              <DataRow label="Nome" value={leadData.name || leadData.nome_modelo} />
              <DataRow label="Modelo" value={leadData.nome_modelo} />
              <DataRow label="Idade" value={leadData.age ? `${leadData.age} anos` : null} />
            </CardContent>
          </Card>

          {/* Contato */}
          <Card>
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Contato
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 space-y-2">
              <DataRow label="Celular" value={leadData.celular} icon={<Phone className="h-3 w-3" />} />
              <DataRow label="Telefone" value={leadData.telefone_trabalho} icon={<Phone className="h-3 w-3" />} />
              <DataRow label="Endereço" value={leadData.address} icon={<MapPin className="h-3 w-3" />} />
            </CardContent>
          </Card>

          {/* Status e Funil */}
          <Card>
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Status
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 space-y-2">
              <DataRow label="Etapa" value={leadData.etapa} badge />
              <DataRow label="Fonte" value={leadData.fonte} />
              <DataRow 
                label="Ficha Confirmada" 
                value={leadData.ficha_confirmada === true ? 'Sim' : leadData.ficha_confirmada === false ? 'Não' : null}
                icon={leadData.ficha_confirmada ? <CheckCircle className="h-3 w-3 text-green-500" /> : null}
              />
              <DataRow 
                label="Presença Confirmada" 
                value={leadData.presenca_confirmada === true ? 'Sim' : leadData.presenca_confirmada === false ? 'Não' : null}
                icon={leadData.presenca_confirmada ? <CheckCircle className="h-3 w-3 text-green-500" /> : null}
              />
              <DataRow 
                label="Compareceu" 
                value={leadData.compareceu === true ? 'Sim' : leadData.compareceu === false ? 'Não' : null}
                icon={leadData.compareceu ? <CheckCircle className="h-3 w-3 text-green-500" /> : null}
              />
            </CardContent>
          </Card>

          {/* Agendamento */}
          {(leadData.data_agendamento || leadData.horario_agendamento) && (
            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Agendamento
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-2">
                <DataRow label="Data" value={formatDateOnly(leadData.data_agendamento)} />
                <DataRow label="Horário" value={leadData.horario_agendamento} />
              </CardContent>
            </Card>
          )}

          {/* Responsáveis */}
          <Card>
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Building className="h-4 w-4" />
                Responsáveis
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 space-y-2">
              <DataRow label="Responsável" value={leadData.responsible} />
              <DataRow label="Scouter" value={leadData.scouter} />
              <DataRow label="Op. Telemarketing" value={leadData.op_telemarketing} />
            </CardContent>
          </Card>

          {/* Datas */}
          <Card>
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Histórico
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 space-y-2">
              <DataRow label="Criado em" value={formatDate(leadData.criado)} />
              <DataRow label="Última atualização" value={formatDate(leadData.date_modify)} />
            </CardContent>
          </Card>

          {/* Link para Bitrix */}
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => window.open(`https://maxsystem.bitrix24.com.br/crm/lead/details/${leadData.id}/`, '_blank')}
          >
            <ExternalLink className="h-4 w-4" />
            Abrir no Bitrix
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
}

// Componente auxiliar para linhas de dados
function DataRow({ 
  label, 
  value, 
  icon, 
  badge 
}: { 
  label: string; 
  value: string | number | null | undefined; 
  icon?: React.ReactNode;
  badge?: boolean;
}) {
  if (!value && value !== 0) {
    return (
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-muted-foreground/50">-</span>
      </div>
    );
  }

  return (
    <div className="flex justify-between items-center text-sm gap-2">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <div className="flex items-center gap-1.5 text-right">
        {icon}
        {badge ? (
          <Badge variant="secondary" className="text-xs">
            {value}
          </Badge>
        ) : (
          <span className="font-medium truncate max-w-[180px]">{value}</span>
        )}
      </div>
    </div>
  );
}
