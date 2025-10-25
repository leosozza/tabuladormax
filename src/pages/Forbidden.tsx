import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

/**
 * Página 403 - Acesso Negado
 * Exibida quando usuário autenticado não tem permissão para acessar um recurso
 */
const Forbidden = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="text-center max-w-md">
        <ShieldAlert className="h-24 w-24 text-destructive mx-auto mb-6" />
        <h1 className="text-4xl font-bold mb-4">403</h1>
        <h2 className="text-2xl font-semibold mb-4">Acesso Negado</h2>
        <p className="text-muted-foreground mb-6">
          Você não tem permissão para acessar este recurso. 
          Esta área é restrita a administradores do sistema.
        </p>
        <div className="flex gap-4 justify-center">
          <Button onClick={() => navigate(-1)} variant="outline">
            Voltar
          </Button>
          <Button onClick={() => navigate("/")}>
            Ir para Início
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Forbidden;
