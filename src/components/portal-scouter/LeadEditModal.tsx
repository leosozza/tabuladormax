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
  } | null;
  onSuccess: () => void;
}

export function LeadEditModal({ isOpen, onClose, lead, onSuccess }: LeadEditModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [nomeModelo, setNomeModelo] = useState('');

  useEffect(() => {
    if (lead) {
      setNomeModelo(lead.nome_modelo || '');
    }
  }, [lead]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;

    setIsLoading(true);
    try {
      const bitrixLeadId = lead.lead_id;

      // Update Supabase - apenas nome_modelo
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          nome_modelo: nomeModelo || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', lead.lead_id);

      if (updateError) throw updateError;

      // Sync to Bitrix - apenas nome do modelo
      const { error: syncError } = await supabase.functions.invoke('bitrix-entity-update', {
        body: {
          entityType: 'lead',
          entityId: bitrixLeadId,
          fields: {
            UF_CRM_LEAD_1732627097745: nomeModelo ? [nomeModelo] : [],
          },
        },
      });

      if (syncError) {
        console.error('Erro ao sincronizar com Bitrix:', syncError);
        toast.warning('Lead atualizado localmente, mas falhou ao sincronizar com Bitrix');
      } else {
        toast.success('Nome do modelo atualizado com sucesso');
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
          <DialogTitle>Editar Nome do Modelo</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome_modelo">Nome do Modelo</Label>
            <Input
              id="nome_modelo"
              value={nomeModelo}
              onChange={(e) => setNomeModelo(e.target.value)}
              placeholder="Nome completo do modelo"
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
