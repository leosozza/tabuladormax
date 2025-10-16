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
      {/* Upload de CSV */}
      <Card>
        <CardHeader>
          <CardTitle>Upload de CSV</CardTitle>
          <CardDescription>
            Faça upload de planilhas CSV para importar leads em lote
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CSVImportUpload onImportComplete={handleImportComplete} />
        </CardContent>
      </Card>

      {/* Gerenciador de Arquivos */}
      <Card>
        <CardHeader>
          <CardTitle>Arquivos no Bucket</CardTitle>
          <CardDescription>
            Gerencie os arquivos CSV armazenados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CSVFileManager key={refreshTrigger} />
        </CardContent>
      </Card>

      {/* Tabela de Jobs */}
      <Card>
        <CardHeader>
          <CardTitle>Jobs de Importação</CardTitle>
          <CardDescription>
            Acompanhe o status das importações
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CSVImportJobsTable key={refreshTrigger} />
        </CardContent>
      </Card>
    </div>
  );
}
