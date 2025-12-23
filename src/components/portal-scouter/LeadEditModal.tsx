import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LeadEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: {
    lead_id: number;
    nome_modelo: string | null;
    celular: string | null;
    address: string | null;
  } | null;
  onSuccess: () => void;
}

export function LeadEditModal({ isOpen, onClose, lead, onSuccess }: LeadEditModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome_modelo: '',
    celular: '',
    address: '',
  });

  useEffect(() => {
    if (lead) {
      setFormData({
        nome_modelo: lead.nome_modelo || '',
        celular: lead.celular || '',
        address: lead.address || '',
      });
    }
  }, [lead]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;

    setIsLoading(true);
    try {
      // lead.lead_id IS the Bitrix lead ID (they're the same)
      const bitrixLeadId = lead.lead_id;

      // Update Supabase first
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          nome_modelo: formData.nome_modelo || null,
          celular: formData.celular || null,
          local_abordagem: formData.address || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', lead.lead_id);

      if (updateError) throw updateError;

      // Sync to Bitrix via edge function
      const { error: syncError } = await supabase.functions.invoke('bitrix-entity-update', {
        body: {
          entityType: 'lead',
          entityId: bitrixLeadId,
          fields: {
            UF_CRM_LEAD_1732627097745: formData.nome_modelo ? [formData.nome_modelo] : [],
            UF_CRM_1741117093: formData.address || '',
          },
          contactFields: formData.celular ? {
            PHONE: [{ VALUE: formData.celular, VALUE_TYPE: 'MOBILE' }],
          } : undefined,
        },
      });

      if (syncError) {
        console.error('Erro ao sincronizar com Bitrix:', syncError);
        toast.warning('Lead atualizado localmente, mas falhou ao sincronizar com Bitrix');
      } else {
        toast.success('Lead atualizado com sucesso');
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao atualizar lead:', error);
      toast.error('Erro ao atualizar lead');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Lead #{lead?.lead_id}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome_modelo">Nome do Modelo</Label>
            <Input
              id="nome_modelo"
              value={formData.nome_modelo}
              onChange={(e) => setFormData(prev => ({ ...prev, nome_modelo: e.target.value }))}
              placeholder="Nome completo"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="celular">Celular</Label>
            <Input
              id="celular"
              value={formData.celular}
              onChange={(e) => setFormData(prev => ({ ...prev, celular: e.target.value }))}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Local de Abordagem</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Endereço"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
