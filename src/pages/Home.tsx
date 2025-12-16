import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Bug, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function Home() {
  const navigate = useNavigate();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Verificar autenticação e redirecionar para /lead
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        console.log("✅ Usuário autenticado - redirecionando para /lead");
        navigate('/lead');
      } else {
        console.log("ℹ️ Usuário não autenticado - aguardando login");
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, [navigate]);

  // Listener para eventos de login externo
  useEffect(() => {
    console.log("🎧 Listener de eventos ativado na Home");
    
    const processEventData = async (eventData: any) => {
      try {
        console.log("📦 eventData completo:", eventData);

        // Extrair dados do evento
        const contact = eventData?.data?.contact || eventData?.conversation?.meta?.sender;
        const bitrixId = contact?.custom_attributes?.idbitrix;
        
        if (bitrixId) {
          console.log("✅ ID Bitrix encontrado:", bitrixId);
          
          // Registrar log
          await supabase.from('actions_log').insert([{
            lead_id: Number(bitrixId),
            action_label: 'Evento Home',
            payload: {
              source: 'home_page',
              timestamp: new Date().toISOString()
            } as any,
            status: 'OK',
          }]);
          
          navigate('/lead');
        }
      } catch (error) {
        console.error("❌ Erro ao processar evento:", error);
      }
    };
    
    // 1. Verificar se já existem dados pré-carregados
    if ((window as any)._CHATWOOT_DATA_) {
      console.log("✅ [Home] Dados pré-carregados encontrados!");
      processEventData((window as any)._CHATWOOT_DATA_);
    }

    // 2. Escutar evento customizado
    const handleDataReady = (event: Event) => {
      console.log("✅ [Home] Evento data-ready recebido!");
      const customEvent = event as CustomEvent;
      processEventData(customEvent.detail);
    };
    
    window.addEventListener('chatwoot-data-ready', handleDataReady);

    // 3. Listener de postMessage (fallback)
    const handleMessage = async (event: MessageEvent) => {
      console.log("📨 Mensagem recebida na Home:", {
        origin: event.origin,
        dataType: typeof event.data,
      });

      try {
        let eventData;
        
        if (typeof event.data === "string") {
          try {
            eventData = JSON.parse(event.data);
            console.log("✅ JSON parseado");
          } catch (parseError) {
            console.log("⚠️ Não é JSON válido");
            return;
          }
        } else {
          eventData = event.data;
        }

        await processEventData(eventData);
      } catch (error) {
        console.error("❌ Erro ao processar evento:", error);
      }
    };

    window.addEventListener("message", handleMessage);
    console.log("✅ Listener registrado na Home");
    
    return () => {
      console.log("🔌 Listeners removidos da Home");
      window.removeEventListener('chatwoot-data-ready', handleDataReady);
      window.removeEventListener("message", handleMessage);
    };
  }, [navigate]);

  if (isCheckingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center max-w-2xl w-full">
        <h1 className="text-2xl font-semibold text-foreground mb-2">
          TabuladorMax
        </h1>
        <p className="text-muted-foreground mb-6">
          Faça login para acessar o sistema
        </p>
        
        <div className="flex justify-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => navigate('/scouter')}
            className="gap-2"
          >
            <Users className="w-4 h-4" />
            Gestão Scouter
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => navigate('/debug')}
            className="gap-2"
          >
            <Bug className="w-4 h-4" />
            Modo Debug
          </Button>
        </div>
        
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg text-left">
          <p className="text-xs font-semibold mb-2">💡 Integração Gupshup:</p>
          <p className="text-xs text-muted-foreground">
            O sistema utiliza Gupshup para envio de mensagens WhatsApp.
            Acesse o Tabulador para gerenciar conversas com leads.
          </p>
        </div>
      </div>
    </div>
  );
}
