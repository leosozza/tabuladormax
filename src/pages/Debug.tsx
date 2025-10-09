import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { extractChatwootData, extractAssigneeData, saveChatwootContact } from "@/lib/chatwoot";
import { supabase } from "@/integrations/supabase/client";

export default function Debug() {
  const navigate = useNavigate();
  const [debugLog, setDebugLog] = useState<string[]>([]);

  useEffect(() => {
    console.log("🎧 Listener de mensagens do Chatwoot ativado no Debug");
    
    const processChatwootData = async (eventData: any) => {
      try {
        console.log("📦 eventData completo:", eventData);
        setDebugLog(prev => [...prev, `Has conversation: ${!!eventData?.conversation}`]);

        // 1. Tentar auto-login via assignee
        const assigneeData = extractAssigneeData(eventData);
        if (assigneeData) {
          console.log("🔐 Tentando auto-login com assignee:", assigneeData.email);
          setDebugLog(prev => [...prev, `Auto-login: ${assigneeData.email}`]);
          
          try {
            const { data: loginData, error: loginError } = await supabase.functions.invoke('chatwoot-auth', {
              body: assigneeData
            });

            if (loginError) throw loginError;

            if (loginData?.session) {
              console.log("✅ Auto-login retornou sessão - aplicando...");
              
              // Aplicar a sessão recebida
              const { error: setSessionError } = await supabase.auth.setSession({
                access_token: loginData.session.access_token,
                refresh_token: loginData.session.refresh_token
              });

              if (setSessionError) {
                console.error("❌ Erro ao aplicar sessão:", setSessionError);
                setDebugLog(prev => [...prev, `Erro ao aplicar sessão: ${setSessionError.message}`]);
              } else {
                console.log("✅ Sessão aplicada! Usuário:", loginData.user);
                setDebugLog(prev => [...prev, `Auto-login OK: ${loginData.user.email} (${loginData.user.role})`]);
              }
            } else {
              console.warn("⚠️ Auto-login não retornou sessão");
              setDebugLog(prev => [...prev, "Auto-login falhou: sessão não retornada"]);
            }
          } catch (loginError) {
            console.error("❌ Erro no auto-login:", loginError);
            setDebugLog(prev => [...prev, `Erro auto-login: ${loginError}`]);
          }
        }

        // 2. Processar dados do contato
        if (eventData?.conversation?.meta?.sender || eventData?.data?.contact) {
          const contactData = extractChatwootData(eventData);
          console.log("👤 Dados extraídos:", contactData);
          
          if (contactData && contactData.bitrix_id) {
            console.log("💾 Salvando contato:", contactData.bitrix_id);
            setDebugLog(prev => [...prev, `ID Bitrix encontrado: ${contactData.bitrix_id}`]);
            
            await saveChatwootContact(contactData);
            
            // Registrar log do evento
            await supabase.from('actions_log').insert([{
              lead_id: Number(contactData.bitrix_id),
              action_label: 'Evento Chatwoot - Debug',
              payload: {
                conversation_id: contactData.conversation_id,
                contact_id: contactData.contact_id
              } as any,
              status: 'OK',
            }]);
            
            console.log("✅ Dados processados - redirecionando para /lead");
            setDebugLog(prev => [...prev, "Navegando para /lead"]);
            
            navigate('/lead');
          } else {
            console.log("⚠️ Nenhum idbitrix encontrado");
            setDebugLog(prev => [...prev, "Nenhum idbitrix nos dados"]);
          }
        } else {
          console.log("ℹ️ Dados sem conversation.meta.sender");
          setDebugLog(prev => [...prev, "Sem conversation.meta.sender"]);
        }
      } catch (error) {
        console.error("❌ Erro ao processar evento:", error);
        setDebugLog(prev => [...prev, `Erro: ${error}`]);
      }
    };
    
    // 1. Verificar se já existem dados pré-carregados
    if ((window as any)._CHATWOOT_DATA_) {
      console.log("✅ [Debug] Dados pré-carregados encontrados!");
      setDebugLog(prev => [...prev, "Dados pré-carregados encontrados"]);
      processChatwootData((window as any)._CHATWOOT_DATA_);
    }

    // 2. Escutar evento customizado
    const handleChatwootReady = (event: Event) => {
      console.log("✅ [Debug] Evento chatwoot-data-ready recebido!");
      setDebugLog(prev => [...prev, "Evento customizado recebido"]);
      const customEvent = event as CustomEvent;
      processChatwootData(customEvent.detail);
    };
    
    window.addEventListener('chatwoot-data-ready', handleChatwootReady);

    // 3. Listener de postMessage (fallback)
    const handleMessage = async (event: MessageEvent) => {
      console.log("📨 Mensagem recebida no Debug:", {
        origin: event.origin,
        dataType: typeof event.data,
      });
      
      setDebugLog(prev => [...prev, `Origem: ${event.origin}`, `Tipo: ${typeof event.data}`]);

      try {
        let eventData;
        
        if (typeof event.data === "string") {
          try {
            eventData = JSON.parse(event.data);
            console.log("✅ JSON parseado");
            setDebugLog(prev => [...prev, "JSON parseado com sucesso"]);
          } catch (parseError) {
            console.log("⚠️ Não é JSON válido");
            setDebugLog(prev => [...prev, "Não é JSON válido"]);
            return;
          }
        } else {
          eventData = event.data;
          console.log("✅ Dados diretos (objeto)");
        }

        await processChatwootData(eventData);
      } catch (error) {
        console.error("❌ Erro ao processar evento:", error);
        setDebugLog(prev => [...prev, `Erro: ${error}`]);
      }
    };

    window.addEventListener("message", handleMessage);
    console.log("✅ Listener registrado no Debug");
    
    return () => {
      console.log("🔌 Listeners removidos do Debug");
      window.removeEventListener('chatwoot-data-ready', handleChatwootReady);
      window.removeEventListener("message", handleMessage);
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center max-w-2xl w-full">
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" onClick={() => navigate('/lead')} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <h1 className="text-2xl font-semibold text-foreground">
            🔍 Modo Debug
          </h1>
          <div className="w-24"></div>
        </div>
        
        <p className="text-muted-foreground mb-4">
          Esta página monitora mensagens do Chatwoot em tempo real
        </p>
        
        {/* Debug info */}
        <div className="mt-8 p-4 bg-muted rounded-lg text-left">
          <p className="text-sm font-semibold mb-2">Debug Log:</p>
          <div className="text-xs font-mono space-y-1 max-h-96 overflow-y-auto">
            {debugLog.length === 0 ? (
              <p className="text-muted-foreground">Nenhuma mensagem recebida ainda...</p>
            ) : (
              debugLog.map((log, i) => (
                <p key={i} className="text-foreground">{log}</p>
              ))
            )}
          </div>
          <button 
            onClick={() => setDebugLog([])} 
            className="mt-2 text-xs text-blue-600 hover:underline"
          >
            Limpar log
          </button>
        </div>
        
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg text-left">
          <p className="text-xs font-semibold mb-2">💡 Como funciona:</p>
          <p className="text-xs text-muted-foreground">
            Esta página está escutando eventos via <code className="bg-muted px-1 rounded">window.postMessage</code>.
            Quando o Chatwoot enviar dados com <code className="bg-muted px-1 rounded">conversation.meta.sender.custom_attributes.idbitrix</code>,
            você será redirecionado automaticamente para a página do lead.
          </p>
        </div>
      </div>
    </div>
  );
}
