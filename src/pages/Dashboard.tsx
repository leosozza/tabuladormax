import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, MapPin, Phone, RefreshCcw, Loader2 } from "lucide-react";
import UserMenu from "@/components/UserMenu";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BitrixError, BitrixLead, listLeads } from "@/lib/bitrix";
import { CSVImportDialog } from "@/components/CSVImportDialog";

interface LeadRow {
  id: number;
  name: string | null;
  age: number | null;
  address: string | null;
  photo_url: string | null;
  updated_at: string | null;
  responsible: string | null;
  scouter: string | null;
}

const mapBitrixLeadToRow = (lead: BitrixLead): LeadRow => ({
  id: Number(lead.ID),
  name: lead.NAME || null,
  age: lead.UF_IDADE ? Number(lead.UF_IDADE) : null,
  address: lead.UF_LOCAL || lead.ADDRESS || null,
  photo_url: lead.UF_PHOTO || lead.PHOTO || null,
  updated_at: lead.DATE_MODIFY || new Date().toISOString(),
  responsible: lead.UF_RESPONSAVEL || lead.ASSIGNED_BY_NAME || null,
  scouter: lead.UF_SCOUTER || null,
});

const Index = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Erro ao carregar leads do cache:', error);
      toast.error('Não foi possível carregar os leads do Supabase');
      setLeads([]);
    } else {
      setLeads(data || []);
    }

    setLoading(false);
  };

  const syncFromBitrix = async () => {
    setSyncing(true);
    try {
      const remoteLeads = await listLeads({ limit: 30 });
      if (remoteLeads.length === 0) {
        toast.info('Nenhum lead retornado pelo Bitrix');
        return;
      }

      const mapped = remoteLeads.map(mapBitrixLeadToRow);

      await supabase.from('leads').upsert(
        mapped.map(lead => ({
          id: lead.id,
          name: lead.name,
          age: lead.age,
          address: lead.address,
          photo_url: lead.photo_url,
          updated_at: lead.updated_at,
          responsible: lead.responsible,
          scouter: lead.scouter,
        }))
      );

      toast.success('Leads sincronizados com o Bitrix!');
      await loadLeads();
    } catch (error) {
      console.error('Erro ao sincronizar com o Bitrix:', error);
      toast.error(error instanceof BitrixError ? error.message : 'Falha ao sincronizar com o Bitrix');
    } finally {
      setSyncing(false);
    }
  };

  const activeTotal = useMemo(() => leads.length, [leads]);
  const scheduledCount = useMemo(() => leads.filter(lead => (lead as any).status === 'SCHEDULED').length, [leads]);
  const todaysContacts = useMemo(() => leads.filter(lead => {
    if (!lead.updated_at) return false;
    const updated = new Date(lead.updated_at);
    const today = new Date();
    return updated.toDateString() === today.toDateString();
  }).length, [leads]);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b">
        <div className="container mx-auto px-4 py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Tabulador Telemarketing
            </h1>
            <p className="text-muted-foreground mt-2">
              Gerencie seus leads com eficiência
            </p>
          </div>
          <div className="flex gap-2">
            <CSVImportDialog onImportComplete={loadLeads} />
            <Button onClick={syncFromBitrix} disabled={syncing} className="gap-2">
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
              {syncing ? 'Sincronizando...' : 'Sincronizar com Bitrix'}
            </Button>
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Leads no cache</p>
                <p className="text-3xl font-bold mt-1">{activeTotal}</p>
              </div>
              <User className="w-12 h-12 text-muted-foreground" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Agendamentos</p>
                <p className="text-3xl font-bold mt-1">{scheduledCount}</p>
              </div>
              <MapPin className="w-12 h-12 text-muted-foreground" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Contatos Hoje</p>
                <p className="text-3xl font-bold mt-1">{todaysContacts}</p>
              </div>
              <Phone className="w-12 h-12 text-muted-foreground" />
            </div>
          </Card>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-foreground">
              Leads para Tabular
            </h2>
            {loading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
          </div>
          {loading ? (
            <Card className="p-6 text-sm text-muted-foreground">Carregando leads...</Card>
          ) : leads.length === 0 ? (
            <Card className="p-6 text-sm text-muted-foreground">
              Nenhum lead encontrado no cache. Clique em "Sincronizar com Bitrix" para importar.
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {leads.map((lead) => (
                <Card
                  key={lead.id}
                  className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => navigate('/lead')}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                      {lead.photo_url ? (
                        <img src={lead.photo_url} alt={lead.name ?? ''} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-foreground">
                        {lead.name || 'Lead sem nome'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {lead.age ? `${lead.age} anos` : 'Idade não informada'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{lead.address || 'Endereço não informado'}</span>
                    </div>
                    {lead.updated_at && (
                      <p className="text-xs text-muted-foreground">
                        Atualizado em: {new Date(lead.updated_at).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>

                  <Button className="w-full" variant="default">
                    Abrir Tabulação
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
