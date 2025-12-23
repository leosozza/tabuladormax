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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MoreHorizontal, Pencil, RefreshCw, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LeadActionsProps {
  lead: {
    lead_id: number;
    nome_modelo: string | null;
    celular: string | null;
    address: string | null;
    ficha_confirmada: boolean | null;
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
  const [deleteReason, setDeleteReason] = useState('');

  const handleDeleteDialogClose = (open: boolean) => {
    setIsDeleteDialogOpen(open);
    if (!open) {
      setDeleteReason(''); // Limpa o motivo ao fechar
    }
  };

  const handleAction = async (action: 'delete' | 'resend') => {
    // Validação do motivo para exclusão
    if (action === 'delete' && !deleteReason.trim()) {
      toast.error('Por favor, informe o motivo da exclusão');
      return;
    }

    setIsLoading(true);
    setLoadingAction(action);

    try {
      const { data, error } = await supabase.functions.invoke('scouter-lead-action', {
        body: {
          action,
          leadId: lead.lead_id,
          scouterBitrixId,
          deleteReason: action === 'delete' ? deleteReason.trim() : undefined,
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
      setDeleteReason('');
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
          <DropdownMenuContent align="end" side="bottom" sideOffset={4} className="z-[600]">
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
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={handleDeleteDialogClose}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Lead</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {lead.ficha_confirmada && (
                  <div className="bg-amber-100 dark:bg-amber-900/30 border border-amber-400 dark:border-amber-600 rounded-md p-3 mb-3">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-medium">
                      <AlertTriangle className="h-4 w-4" />
                      Este lead está CONFIRMADO!
                    </div>
                    <p className="text-sm text-amber-600 dark:text-amber-500 mt-1">
                      Tem certeza que deseja excluir um lead confirmado?
                    </p>
                  </div>
                )}
                <p className="mb-3">Tem certeza que deseja excluir este lead?</p>
                <strong>O que vai acontecer:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>O lead será movido para "Analisar - Sem interesse"</li>
                  <li>A associação com você (scouter) será removida</li>
                  <li>O lead poderá ser excluído definitivamente posteriormente</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-2">
            <Label htmlFor="delete-reason" className="text-sm font-medium">
              Motivo da Exclusão <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="delete-reason"
              placeholder="Informe o motivo da exclusão do lead..."
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              className="mt-2 min-h-[100px] resize-none"
              disabled={loadingAction === 'delete'}
            />
            {deleteReason.trim() === '' && (
              <p className="text-xs text-muted-foreground mt-1">
                Campo obrigatório
              </p>
            )}
          </div>

          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel disabled={loadingAction === 'delete'} className="w-full sm:w-auto">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleAction('delete');
              }}
              disabled={loadingAction === 'delete' || !deleteReason.trim()}
              className="bg-destructive hover:bg-destructive/90 w-full sm:w-auto"
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
