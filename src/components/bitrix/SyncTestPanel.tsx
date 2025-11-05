import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TestTube, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export function SyncTestPanel() {
  const [leadId, setLeadId] = useState('');
  const [direction, setDirection] = useState<'bitrix_to_supabase' | 'supabase_to_bitrix'>('bitrix_to_supabase');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleTest = async () => {
    if (!leadId) {
      toast.error('Digite o ID do lead');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('test-sync', {
        body: { leadId: parseInt(leadId), direction, dryRun: true }
      });

      if (error) throw error;

      setResult(data);
      toast.success('Teste concluído com sucesso');
    } catch (error) {
      console.error('Erro ao testar:', error);
      toast.error('Erro ao executar teste');
      setResult({ error: error instanceof Error ? error.message : 'Erro desconhecido' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="w-5 h-5" />
          Testar Sincronização
        </CardTitle>
        <CardDescription>
          Execute um teste de sincronização sem salvar alterações
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="leadId">ID do Lead</Label>
            <Input
              id="leadId"
              type="number"
              placeholder="Ex: 12345"
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="direction">Direção</Label>
            <Select value={direction} onValueChange={(value: any) => setDirection(value)}>
              <SelectTrigger id="direction">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bitrix_to_supabase">Bitrix → Supabase</SelectItem>
                <SelectItem value="supabase_to_bitrix">Supabase → Bitrix</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={handleTest} disabled={loading} className="w-full">
          {loading ? 'Testando...' : 'Executar Teste'}
        </Button>

        {result && (
          <div className="mt-4 space-y-4">
            {result.error ? (
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>{result.error}</AlertDescription>
              </Alert>
            ) : (
              <>
                <Alert>
                  <CheckCircle2 className="w-4 h-4" />
                  <AlertDescription>
                    Teste executado com sucesso! {result.fieldsCount} campos seriam sincronizados.
                  </AlertDescription>
                </Alert>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Preview dos Dados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {result.appliedMappings?.map((mapping: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-2 rounded bg-muted text-sm">
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-background px-2 py-1 rounded">
                              {direction === 'bitrix_to_supabase' ? mapping.bitrix_field : mapping.tabuladormax_field}
                            </code>
                            <span>→</span>
                            <code className="text-xs bg-background px-2 py-1 rounded">
                              {direction === 'bitrix_to_supabase' ? mapping.tabuladormax_field : mapping.bitrix_field}
                            </code>
                          </div>
                          <div className="flex items-center gap-2">
                            {mapping.transformed && (
                              <Badge variant="secondary" className="text-xs">
                                {mapping.transform_function}
                              </Badge>
                            )}
                            <span className="text-muted-foreground truncate max-w-[200px]">
                              {typeof mapping.value === 'object' 
                                ? JSON.stringify(mapping.value).substring(0, 50) 
                                : String(mapping.value).substring(0, 50)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
