import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
    nome_responsavel: string | null;
  } | null;
  onSuccess: () => void;
}

export function LeadEditModal({ isOpen, onClose, lead, onSuccess }: LeadEditModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome_modelo: '',
    nome_responsavel: '',
    observacao: '',
  });

  useEffect(() => {
    if (lead) {
      setFormData({
        nome_modelo: lead.nome_modelo || '',
        nome_responsavel: lead.nome_responsavel || '',
        observacao: '', // Observação sempre começa vazia (é para adicionar nova)
      });
    }
  }, [lead]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;

    setIsLoading(true);
    try {
      const bitrixLeadId = lead.lead_id;

      // Update Supabase - nome_modelo e name (responsável)
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          nome_modelo: formData.nome_modelo || null,
          name: formData.nome_responsavel || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', lead.lead_id);

      if (updateError) throw updateError;

      // Sync to Bitrix - nome do modelo, nome do responsável e observação
      const { error: syncError } = await supabase.functions.invoke('bitrix-entity-update', {
        body: {
          entityType: 'lead',
          entityId: bitrixLeadId,
          fields: {
            NAME: formData.nome_responsavel || '',
            UF_CRM_LEAD_1732627097745: formData.nome_modelo ? [formData.nome_modelo] : [],
            COMMENTS: formData.observacao || '',
          },
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
              placeholder="Ex: Ana Luiza"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nome_responsavel">Nome do Responsável</Label>
            <Input
              id="nome_responsavel"
              value={formData.nome_responsavel}
              onChange={(e) => setFormData(prev => ({ ...prev, nome_responsavel: e.target.value }))}
              placeholder="Ex: Jaqueline"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacao">Observação</Label>
            <Textarea
              id="observacao"
              value={formData.observacao}
              onChange={(e) => setFormData(prev => ({ ...prev, observacao: e.target.value }))}
              placeholder="Adicionar observação ao lead..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Será salvo nos comentários do Bitrix
            </p>
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
