import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoreHorizontal, Pencil, RefreshCw, Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LeadActionsProps {
  lead: {
    lead_id: number;
    nome_modelo: string | null;
    celular: string | null;
    address: string | null;
  };
  scouterBitrixId?: number;
  onEdit: () => void;
  onActionComplete: () => void;
}

export function LeadActions({ lead, scouterBitrixId, onEdit, onActionComplete }: LeadActionsProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isResendDialogOpen, setIsResendDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<'delete' | 'resend' | null>(null);

  const handleAction = async (action: 'delete' | 'resend') => {
    setIsLoading(true);
    setLoadingAction(action);

    try {
      const { data, error } = await supabase.functions.invoke('scouter-lead-action', {
        body: {
          action,
          leadId: lead.lead_id,
          scouterBitrixId,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(data.message);
        onActionComplete();
      } else {
        throw new Error(data.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error(`Erro ao executar ação ${action}:`, error);
      toast.error(`Erro ao ${action === 'delete' ? 'excluir' : 'reenviar confirmação do'} lead`);
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
      setIsDeleteDialogOpen(false);
      setIsResendDialogOpen(false);
    }
  };

  return (
    <>
      <div onClick={(e) => e.stopPropagation()}>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MoreHorizontal className="h-4 w-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-[100]">
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsResendDialogOpen(true)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reenviar Confirmação
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => setIsDeleteDialogOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir Lead
          </DropdownMenuItem>
        </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este lead?
              <br /><br />
              <strong>O que vai acontecer:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>O lead será movido para "Analisar - Sem interesse"</li>
                <li>A associação com você (scouter) será removida</li>
                <li>O lead poderá ser excluído definitivamente posteriormente</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loadingAction === 'delete'}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleAction('delete')}
              disabled={loadingAction === 'delete'}
              className="bg-destructive hover:bg-destructive/90"
            >
              {loadingAction === 'delete' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Confirmar Exclusão'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Resend Confirmation Dialog */}
      <AlertDialog open={isResendDialogOpen} onOpenChange={setIsResendDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reenviar Confirmação</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja reenviar a confirmação para este lead?
              <br /><br />
              <strong>O que vai acontecer:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>O lead será movido para a etapa "Triagem"</li>
                <li>A automação enviará uma nova mensagem de confirmação</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loadingAction === 'resend'}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleAction('resend')}
              disabled={loadingAction === 'resend'}
            >
              {loadingAction === 'resend' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Reenviando...
                </>
              ) : (
                'Confirmar Reenvio'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
