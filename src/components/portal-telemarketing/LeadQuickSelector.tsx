import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, User, Phone, Calendar, Clock, ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getEtapaStyle } from '@/lib/etapaColors';

interface LeadQuickSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelectLead: (leadId: string) => void;
  operatorBitrixId: number;
}

interface RecentLead {
  id: number;
  nome_modelo: string | null;
  celular: string | null;
  etapa: string | null;
  date_modify: string | null;
  data_criacao_agendamento: string | null;
  photo_url: string | null;
}

export function LeadQuickSelector({ open, onClose, onSelectLead, operatorBitrixId }: LeadQuickSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Buscar leads recentes do operador
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['operator-recent-leads', operatorBitrixId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, nome_modelo, celular, etapa, date_modify, data_criacao_agendamento, photo_url')
        .eq('bitrix_telemarketing_id', operatorBitrixId)
        .order('date_modify', { ascending: false, nullsFirst: false })
        .limit(50);
      
      if (error) throw error;
      return (data || []) as RecentLead[];
    },
    enabled: open && !!operatorBitrixId,
    staleTime: 30 * 1000,
  });

  // Filtrar leads pelo termo de busca
  const filteredLeads = useMemo(() => {
    if (!searchTerm.trim()) return leads;
    
    const term = searchTerm.toLowerCase().replace(/\D/g, '') || searchTerm.toLowerCase();
    
    return leads.filter(lead => {
      const nome = (lead.nome_modelo || '').toLowerCase();
      const celular = (lead.celular || '').replace(/\D/g, '');
      const id = String(lead.id);
      
      return nome.includes(searchTerm.toLowerCase()) ||
             celular.includes(term) ||
             id.includes(term);
    });
  }, [leads, searchTerm]);

  const handleSelect = (lead: RecentLead) => {
    onSelectLead(String(lead.id));
    onClose();
  };

  const formatPhone = (phone: string | null) => {
    if (!phone) return '—';
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    if (digits.length === 13 && digits.startsWith('55')) {
      return `(${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
    }
    return phone;
  };

  const formatDate = (date: string | null) => {
    if (!date) return null;
    try {
      return format(new Date(date), "dd/MM HH:mm", { locale: ptBR });
    } catch {
      return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Selecionar Lead para Tabular
          </DialogTitle>
          <DialogDescription>
            Escolha um lead da sua lista recente ou busque por nome, telefone ou ID.
          </DialogDescription>
        </DialogHeader>

        {/* Campo de busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone ou ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        {/* Lista de leads */}
        <ScrollArea className="flex-1 max-h-[50vh] -mx-6 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Carregando leads...</span>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-10 w-10 mx-auto mb-2 opacity-50" />
              {searchTerm ? (
                <p>Nenhum lead encontrado para "{searchTerm}"</p>
              ) : (
                <p>Nenhum lead recente encontrado</p>
              )}
            </div>
          ) : (
            <div className="space-y-2 py-2">
              {filteredLeads.map((lead) => {
                const etapaStyle = getEtapaStyle(lead.etapa);
                const modifyDate = formatDate(lead.date_modify);
                const agendamentoDate = formatDate(lead.data_criacao_agendamento);
                
                return (
                  <button
                    key={lead.id}
                    onClick={() => handleSelect(lead)}
                    className="w-full p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-left group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium truncate">
                            {lead.nome_modelo || `Lead ${lead.id}`}
                          </span>
                          <Badge 
                            variant="outline" 
                            className="text-xs shrink-0"
                            style={{ 
                              backgroundColor: etapaStyle.bg,
                              color: etapaStyle.text
                            }}
                          >
                            {lead.etapa || 'Sem etapa'}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5" />
                            {formatPhone(lead.celular)}
                          </span>
                          
                          {modifyDate && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {modifyDate}
                            </span>
                          )}
                          
                          {agendamentoDate && (
                            <span className="flex items-center gap-1 text-primary">
                              <Calendar className="h-3.5 w-3.5" />
                              {agendamentoDate}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer com contagem */}
        <div className="flex items-center justify-between pt-2 border-t text-sm text-muted-foreground">
          <span>
            {filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''} 
            {searchTerm && leads.length !== filteredLeads.length && ` (de ${leads.length})`}
          </span>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
