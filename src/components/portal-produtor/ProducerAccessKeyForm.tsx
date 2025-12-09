import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { KeyRound, Loader2, Briefcase } from 'lucide-react';

interface ProducerAccessKeyFormProps {
  onAccessGranted: (data: { id: string; name: string; photo: string | null }) => void;
}

export const ProducerAccessKeyForm = ({ onAccessGranted }: ProducerAccessKeyFormProps) => {
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
      const { data, error } = await supabase.rpc('validate_producer_access_key', {
        p_access_key: accessKey.trim()
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error('Chave de acesso inválida');
        return;
      }

      const producer = data[0];
      toast.success(`Bem-vindo, ${producer.producer_name}!`);
      
      onAccessGranted({
        id: producer.producer_id,
        name: producer.producer_name,
        photo: producer.producer_photo
      });
    } catch (error) {
      console.error('Erro ao validar chave:', error);
      toast.error('Erro ao validar chave de acesso');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
      <Card className="w-full max-w-md shadow-xl border-primary/20">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Briefcase className="h-8 w-8 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Portal do Produtor</CardTitle>
            <CardDescription className="mt-2">
              Digite sua chave de acesso para entrar
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Sua chave de acesso"
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                className="pl-10 h-12 text-lg"
                disabled={isLoading}
                autoFocus
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-12 text-lg font-semibold"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Verificando...
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
