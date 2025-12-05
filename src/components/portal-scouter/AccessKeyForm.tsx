import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Key, Loader2, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AccessKeyFormProps {
  onAccessGranted: (data: { id: string; name: string; photo: string | null }) => void;
}

export const AccessKeyForm = ({ onAccessGranted }: AccessKeyFormProps) => {
  const [accessKey, setAccessKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!accessKey.trim()) {
      toast.error('Digite sua chave de acesso');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .rpc('validate_scouter_access_key', { p_access_key: accessKey.trim() });

      if (error) throw error;

      if (data && data.length > 0) {
        const scouter = data[0];
        onAccessGranted({
          id: scouter.scouter_id,
          name: scouter.scouter_name,
          photo: scouter.scouter_photo
        });
        toast.success(`Bem-vindo, ${scouter.scouter_name}!`);
      } else {
        toast.error('Chave de acesso inválida');
      }
    } catch (error) {
      console.error('Erro ao validar chave:', error);
      toast.error('Erro ao validar chave de acesso');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Portal do Scouter</CardTitle>
          <CardDescription>
            Digite sua chave de acesso para visualizar seus dados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Digite sua chave de acesso"
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                className="pl-10"
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Validando...
                </>
              ) : (
                'Acessar Dashboard'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
