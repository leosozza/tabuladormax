import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CsvImportWizard } from './CsvImportWizard';

export function BulkImportPanel() {
  const [wizardOpen, setWizardOpen] = useState(false);

  return (
    <>
      <CsvImportWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
      
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-6 w-6" />
            <div>
              <CardTitle>Importação em Lote</CardTitle>
              <CardDescription>
                Importe até 250MB de leads com mapeamento visual de colunas
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              ✅ Suporta arquivos grandes (até 250MB)<br />
              ✅ Processamento em background<br />
              ✅ Mapeamento visual de colunas<br />
              ✅ Progresso em tempo real
            </AlertDescription>
          </Alert>

          <Button onClick={() => setWizardOpen(true)} className="w-full" size="lg">
            <Upload className="h-5 w-5 mr-2" />
            Iniciar Importação em Lote
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
