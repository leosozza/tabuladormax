import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BatchUpdateUpload } from "./BatchUpdateUpload";
import { BatchUpdateJobsTable } from "./BatchUpdateJobsTable";

export function BatchUpdateTab() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadComplete = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="grid gap-6 max-w-4xl">
      {/* Upload de CSV para Atualização */}
      <Card>
        <CardHeader>
          <CardTitle>🔄 Atualização em Lote via CSV</CardTitle>
          <CardDescription>
            Atualize múltiplos leads de uma vez enviando uma planilha CSV com as seguintes colunas:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>ID</strong> - ID do lead no Bitrix (obrigatório)</li>
              <li><strong>Campo a atualizar</strong> - Ex: status_tabulacao, etapa, etc</li>
            </ul>
            <p className="mt-2 text-sm">
              A primeira linha deve conter o nome do campo que será atualizado.
            </p>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BatchUpdateUpload onUploadComplete={handleUploadComplete} />
        </CardContent>
      </Card>

      {/* Tabela de Jobs de Atualização */}
      <Card>
        <CardHeader>
          <CardTitle>Jobs de Atualização em Lote</CardTitle>
          <CardDescription>
            Acompanhe o progresso das atualizações
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BatchUpdateJobsTable key={refreshTrigger} />
        </CardContent>
      </Card>
    </div>
  );
}
