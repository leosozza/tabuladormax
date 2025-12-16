import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Headset, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TelemarketingOperatorData {
  operator_id: string;
  operator_name: string;
  operator_photo: string | null;
  bitrix_id: number;
  cargo: string;
  commercial_project_id: string | null;
}

interface TelemarketingAccessKeyFormProps {
  onAccessGranted: (operatorData: TelemarketingOperatorData) => void;
}

export const TelemarketingAccessKeyForm = ({ onAccessGranted }: TelemarketingAccessKeyFormProps) => {
  const [accessKey, setAccessKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!accessKey.trim()) {
      setError('Digite sua chave de acesso');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('validate_telemarketing_access_key', {
        p_access_key: accessKey.trim()
      });

      if (rpcError) {
        console.error('Erro ao validar chave:', rpcError);
        setError('Erro ao validar chave de acesso');
        return;
      }

      if (!data || data.length === 0) {
        setError('Chave de acesso inválida ou operador inativo');
        return;
      }

      const operatorData = data[0] as TelemarketingOperatorData;
      toast.success(`Bem-vindo(a), ${operatorData.operator_name}!`);
      onAccessGranted(operatorData);
    } catch (err) {
      console.error('Erro inesperado:', err);
      setError('Erro ao conectar com o servidor');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Headset className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Portal do Telemarketing</CardTitle>
          <CardDescription>
            Digite sua chave de acesso para entrar no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="Sua chave de acesso"
                value={accessKey}
                onChange={(e) => {
                  setAccessKey(e.target.value);
                  setError(null);
                }}
                className="text-center text-lg tracking-wider"
                autoFocus
                disabled={isLoading}
              />
              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              size="lg"
              disabled={isLoading || !accessKey.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Validando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
