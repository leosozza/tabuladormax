import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Instagram } from "lucide-react";
const PreCadastroSucesso = () => {
  const navigate = useNavigate();
  useEffect(() => {
    // Auto-redirect após 10 segundos
    const timer = setTimeout(() => {
      window.close();
    }, 10000);
    return () => clearTimeout(timer);
  }, []);
  return <div className="min-h-screen bg-gradient-to-br from-background via-secondary/10 to-background flex items-center justify-center p-4">
      <Card className="max-w-lg w-full shadow-elegant">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center">
            <CheckCircle2 className="h-12 w-12 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Cadastro Atualizado com Sucesso!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <p className="text-muted-foreground">Suas informações foram atualizadas</p>
          
          <div className="bg-secondary/30 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-foreground">Próximos Passos</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>✓ Aguarde o contato da nossa equipe</li>
              <li>✓ Mantenha suas fotos atualizadas</li>
              <li>✓ Fique atento ao seu telefone e e-mail</li>
            </ul>
          </div>

          <p className="text-xs text-muted-foreground">
            Esta página será fechada automaticamente em alguns segundos.
          </p>

          <Button 
            onClick={() => window.open('https://www.instagram.com/maxfama_oficial', '_blank', 'noopener,noreferrer')} 
            className="w-full gap-2"
          >
            <Instagram className="w-5 h-5" />
            Acesse nosso instagram
          </Button>
        </CardContent>
      </Card>
    </div>;
};
export default PreCadastroSucesso;