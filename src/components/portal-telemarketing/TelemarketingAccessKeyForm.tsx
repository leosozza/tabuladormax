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

  const performSupabaseAuth = async (bitrixId: number, accessKeyValue: string) => {
    // Generate email based on bitrix_id
    const email = `tele-${bitrixId}@maxfama.internal`;
    const password = accessKeyValue;

    // Try to sign in first
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInData?.session) {
      console.log('Supabase auth: signed in successfully');
      return true;
    }

    // If sign in fails, try to create the user
    if (signInError?.message?.includes('Invalid login credentials')) {
      console.log('User does not exist, creating...');
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/portal-telemarketing`,
          data: {
            bitrix_id: bitrixId,
            role: 'telemarketing_operator'
          }
        }
      });

      if (signUpError) {
        console.error('Error creating user:', signUpError);
        // Continue anyway - the access key validation already passed
        return false;
      }

      // Try to sign in again after signup
      if (signUpData?.user) {
        const { error: retrySignInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (!retrySignInError) {
          console.log('Supabase auth: created and signed in successfully');
          return true;
        }
      }
    }

    console.warn('Supabase auth failed, continuing with access key only');
    return false;
  };

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
      
      // Perform Supabase Auth login/signup
      await performSupabaseAuth(operatorData.bitrix_id, accessKey.trim());
      
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
