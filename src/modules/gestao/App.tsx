import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, ArrowLeft, Database } from 'lucide-react';
import { Link } from 'react-router-dom';

const GestaoScouterApp: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950 dark:to-emerald-950 p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-3xl">
            <Package className="w-8 h-8 text-green-600" />
            Gestão Scouter
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <Database className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-green-800 dark:text-green-200 mb-2">
                ✅ Supabase Unificado
              </p>
              <p className="text-green-700 dark:text-green-300">
                Gestão Scouter e Tabulador agora compartilham o mesmo projeto Supabase e a mesma tabela <code className="bg-green-100 dark:bg-green-900 px-1 rounded">leads</code>.
              </p>
            </div>
          </div>

          <div className="space-y-3 text-sm text-muted-foreground">
            <h3 className="font-semibold text-foreground text-base">Configuração Completa:</h3>
            
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li>✅ Cliente Supabase unificado (TabuladorMax)</li>
              <li>✅ Mesma tabela <code>leads</code> compartilhada</li>
              <li>✅ Autenticação compartilhada</li>
              <li>✅ Router sem conflitos (BrowserRouter removido)</li>
            </ul>

            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
              <p className="text-blue-800 dark:text-blue-200 text-xs font-mono">
                <strong>Projeto Supabase:</strong> gkvvtfqfggddzotxltxf<br/>
                <strong>Tabela:</strong> public.leads<br/>
                <strong>Status:</strong> Integrado ✅
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button asChild variant="outline" className="flex-1">
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Link>
            </Button>
            <Button asChild className="flex-1">
              <Link to="/tabulador">
                Acessar Tabulador
              </Link>
            </Button>
          </div>

          <div className="text-xs text-center text-muted-foreground pt-4 border-t">
            <p>
              Para integração completa da interface do Gestão Scouter,<br />
              será necessário configurar path aliases no tsconfig.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GestaoScouterApp;
