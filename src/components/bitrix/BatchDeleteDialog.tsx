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
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { FieldUsageInfo } from "@/hooks/useFieldUsageInButtons";

interface FieldMapping {
  id: string;
  bitrix_field: string;
  tabuladormax_field: string;
}

interface BatchDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedMappings: FieldMapping[];
  usageInfoMap: Map<string, FieldUsageInfo>;
  onConfirmDelete: () => void;
  onDeactivateInstead: () => void;
}

export function BatchDeleteDialog({
  open,
  onOpenChange,
  selectedMappings,
  usageInfoMap,
  onConfirmDelete,
  onDeactivateInstead,
}: BatchDeleteDialogProps) {
  const criticalMappings = selectedMappings.filter((m) => {
    const usage = usageInfoMap.get(m.bitrix_field);
    return usage && (usage.usageLevel === "critical" || usage.usageLevel === "important");
  });

  const hasCriticalFields = criticalMappings.length > 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {hasCriticalFields && <AlertTriangle className="h-5 w-5 text-destructive" />}
            {hasCriticalFields
              ? "⚠️ ATENÇÃO: Campos Críticos Selecionados!"
              : "Confirmar Exclusão em Lote"}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 text-sm">
              {hasCriticalFields ? (
                <>
                  <p className="text-destructive font-medium">
                    Você está tentando excluir {criticalMappings.length} mapeamento(s) que são
                    usados em botões do tabulador (/telemarketing).
                  </p>
                  <p>
                    <strong>Isso pode causar mau funcionamento grave dos botões!</strong>
                  </p>

                  <div className="bg-muted p-3 rounded-md space-y-2">
                    <p className="font-semibold">Campos críticos selecionados:</p>
                    {criticalMappings.map((mapping) => {
                      const usage = usageInfoMap.get(mapping.bitrix_field);
                      return (
                        <div key={mapping.id} className="text-xs border-l-2 border-destructive pl-2">
                          <div className="font-medium">{mapping.bitrix_field}</div>
                          <div className="text-muted-foreground">
                            → Campo Supabase: {mapping.tabuladormax_field}
                          </div>
                          {usage && (
                            <div className="text-destructive">
                              Usado em {usage.buttonCount} botão(ões): {usage.buttonNames.join(", ")}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="bg-primary/10 p-3 rounded-md">
                    <p className="font-semibold mb-2">🛡️ Alternativas seguras:</p>
                    <ol className="list-decimal list-inside space-y-1 text-xs">
                      <li>
                        <strong>Desativar</strong> ao invés de excluir (recomendado) - mantém o
                        histórico
                      </li>
                      <li>Excluir apenas os campos não críticos</li>
                      <li>Revisar configuração dos botões antes de excluir</li>
                    </ol>
                  </div>
                </>
              ) : (
                <>
                  <p>
                    Tem certeza que deseja excluir <strong>{selectedMappings.length}</strong>{" "}
                    mapeamento(s)?
                  </p>
                  <div className="bg-muted p-3 rounded-md space-y-1">
                    {selectedMappings.map((mapping) => (
                      <div key={mapping.id} className="text-xs">
                        {mapping.tabuladormax_field} → {mapping.bitrix_field || "Não mapeado"}
                      </div>
                    ))}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Esta ação não pode ser desfeita.
                  </p>
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          {hasCriticalFields && (
            <Button variant="outline" onClick={onDeactivateInstead}>
              Desativar Selecionados (Seguro)
            </Button>
          )}
          <AlertDialogAction
            onClick={onConfirmDelete}
            className={hasCriticalFields ? "bg-destructive hover:bg-destructive/90" : ""}
          >
            {hasCriticalFields ? "Excluir Mesmo Assim" : "Excluir Todos"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
