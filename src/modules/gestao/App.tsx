import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Package } from 'lucide-react';

const GestaoScouterPlaceholder: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-3xl">
            <Package className="w-8 h-8 text-green-600" />
            Gestão Scouter - Em Configuração
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-yellow-800 mb-2">Módulo Gestão Scouter Detectado</p>
              <p className="text-yellow-700">
                O código fonte está disponível em <code className="bg-yellow-100 px-1 rounded">modules/gestao-scouter/</code>
              </p>
            </div>
          </div>

          <div className="space-y-3 text-sm text-muted-foreground">
            <h3 className="font-semibold text-foreground text-base">Próximos Passos para Integração:</h3>
            
            <ol className="list-decimal list-inside space-y-2 pl-2">
              <li>Configurar path aliases do gestao-scouter no tsconfig principal</li>
              <li>Ajustar imports para resolver @/ corretamente</li>
              <li>Mesclar variáveis de ambiente (.env.local já configurado)</li>
              <li>Testar navegação entre módulos</li>
            </ol>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-blue-800 text-xs font-mono">
                Ambiente: Supabase separados<br/>
                Tabulador: gkvvtfqfggddzotxltxf<br/>
                Gestão: jstsrgyxrrlklnzgsihd
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={() => window.location.href = '/'} variant="outline" className="flex-1">
              Voltar para Home
            </Button>
            <Button onClick={() => window.location.href = '/tabulador'} className="flex-1">
              Acessar Tabulador
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GestaoScouterPlaceholder;
