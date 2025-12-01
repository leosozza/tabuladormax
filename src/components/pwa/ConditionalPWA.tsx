import { useLocation } from "react-router-dom";
import { ReloadPrompt } from "./ReloadPrompt";

// Rotas públicas que NÃO devem mostrar prompt de PWA
const PUBLIC_ROUTES = ['/precadastro', '/cadastro', '/auth'];

export function ConditionalPWA() {
  const location = useLocation();
  
  // Verificar se está em rota pública
  const isPublicRoute = PUBLIC_ROUTES.some(route => 
    location.pathname.startsWith(route)
  );
  
  // Não renderizar PWA em rotas públicas
  if (isPublicRoute) {
    return null;
  }
  
  return <ReloadPrompt />;
}
