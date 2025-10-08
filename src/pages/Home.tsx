import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { extractChatwootData, saveChatwootContact } from "@/lib/chatwoot";
import { supabase } from "@/integrations/supabase/client";

export default function Home() {
  const navigate = useNavigate();
  const [debugLog, setDebugLog] = useState<string[]>([]);

  useEffect(() => {
    console.log("🎧 Listener de mensagens do Chatwoot ativado na Home");
    
    const processChatwootData = async (eventData: any) => {
      try {
        console.log("📦 eventData completo:", eventData);
        setDebugLog(prev => [...prev, `Has conversation: ${!!eventData?.conversation}`]);

        // Verificar se tem dados de conversação
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
              action_label: 'Evento Chatwoot - Home',
              payload: {
                conversation_id: contactData.conversation_id,
                contact_id: contactData.contact_id
              } as any,
              status: 'OK',
            }]);
            
            console.log("✅ Navegando para /lead");
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
      console.log("✅ [Home] Dados pré-carregados encontrados!");
      setDebugLog(prev => [...prev, "Dados pré-carregados encontrados"]);
      processChatwootData((window as any)._CHATWOOT_DATA_);
    }

    // 2. Escutar evento customizado
    const handleChatwootReady = (event: Event) => {
      console.log("✅ [Home] Evento chatwoot-data-ready recebido!");
      setDebugLog(prev => [...prev, "Evento customizado recebido"]);
      const customEvent = event as CustomEvent;
      processChatwootData(customEvent.detail);
    };
    
    window.addEventListener('chatwoot-data-ready', handleChatwootReady);

    // 3. Listener de postMessage (fallback)
    const handleMessage = async (event: MessageEvent) => {
      console.log("📨 Mensagem recebida na Home:", {
        origin: event.origin,
        dataType: typeof event.data,
      });
      
      setDebugLog(prev => [...prev, `Origem: ${event.origin}`, `Tipo: ${typeof event.data}`]);

      try {
        let eventData;
        
        // Tenta parsear se for string
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
    console.log("✅ Listener registrado na Home");
    
    return () => {
      console.log("🔌 Listeners removidos da Home");
      window.removeEventListener('chatwoot-data-ready', handleChatwootReady);
      window.removeEventListener("message", handleMessage);
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center max-w-2xl w-full">
        <h1 className="text-2xl font-semibold text-foreground mb-2">
          Aguardando dados do Chatwoot...
        </h1>
        <p className="text-muted-foreground mb-4">
          Selecione uma conversa para começar
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
