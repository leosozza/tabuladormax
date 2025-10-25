import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

/**
 * Página 403 - Acesso Negado
 * Exibida quando um usuário autenticado tenta acessar uma rota admin sem permissões adequadas
 */
const Forbidden = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-red-50 to-orange-50">
      <div className="text-center max-w-md">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-red-100 p-4">
            <Shield className="h-12 w-12 text-red-600" />
          </div>
        </div>
        
        <h1 className="text-4xl font-bold mb-2 text-red-900">403</h1>
        <h2 className="text-2xl font-semibold mb-4 text-gray-900">Acesso Negado</h2>
        
        <p className="text-gray-600 mb-8">
          Você não tem permissão para acessar esta página. 
          Esta área é restrita a usuários com privilégios administrativos.
        </p>

        <div className="flex gap-4 justify-center">
          <Button 
            onClick={() => navigate(-1)}
            variant="outline"
          >
            Voltar
          </Button>
          <Button 
            onClick={() => navigate('/')}
          >
            Ir para Início
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Forbidden;
