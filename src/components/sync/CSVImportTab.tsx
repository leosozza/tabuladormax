import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CSVFileManager } from "./CSVFileManager";
import { CSVImportUpload } from "./CSVImportUpload";
import { CSVImportJobsTable } from "./CSVImportJobsTable";

export function CSVImportTab() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleImportComplete = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="grid gap-6 max-w-4xl">
      {/* Upload e Gerenciamento de Arquivos */}
      <Card>
        <CardHeader>
          <CardTitle>📤 Upload e Gerenciamento de Arquivos CSV</CardTitle>
          <CardDescription>
            Faça upload de planilhas CSV e gerencie os arquivos armazenados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <CSVImportUpload onImportComplete={handleImportComplete} />
          <div className="border-t pt-6">
            <h3 className="text-sm font-medium mb-4">Arquivos no Storage</h3>
            <CSVFileManager key={refreshTrigger} />
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Jobs */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Progresso das Importações</CardTitle>
          <CardDescription>
            Acompanhe o status e progresso das importações em tempo real
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CSVImportJobsTable key={refreshTrigger} />
        </CardContent>
      </Card>
    </div>
  );
}
