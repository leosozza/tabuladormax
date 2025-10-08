import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { extractChatwootData, saveChatwootContact } from "@/lib/chatwoot";

export default function Home() {
  const navigate = useNavigate();
  const [debugLog, setDebugLog] = useState<string[]>([]);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      console.log("📨 Mensagem recebida:", event);
      console.log("📦 Origem:", event.origin);
      console.log("📋 Dados brutos:", event.data);
      
      setDebugLog(prev => [...prev, `Origem: ${event.origin}`, `Dados: ${typeof event.data}`]);

      try {
        let eventData;
        
        // Tenta parsear se for string
        if (typeof event.data === "string") {
          try {
            eventData = JSON.parse(event.data);
            console.log("✅ Dados parseados:", eventData);
          } catch (parseError) {
            console.log("⚠️ Não é JSON válido, usando dados brutos");
            return;
          }
        } else {
          eventData = event.data;
          console.log("✅ Dados diretos (objeto):", eventData);
        }

        const contactData = extractChatwootData(eventData);
        console.log("👤 Dados do contato extraídos:", contactData);
        
        if (contactData) {
          console.log("💾 Salvando contato no Supabase...");
          await saveChatwootContact(contactData);
          console.log("✅ Contato salvo, navegando para:", `/${contactData.bitrix_id}`);
          navigate(`/${contactData.bitrix_id}`);
        } else {
          console.log("⚠️ Nenhum dado de contato válido encontrado");
          setDebugLog(prev => [...prev, "Nenhum idbitrix encontrado nos dados"]);
        }
      } catch (error) {
        console.error("❌ Erro ao processar evento do Chatwoot:", error);
        setDebugLog(prev => [...prev, `Erro: ${error}`]);
      }
    };

    console.log("🎧 Listener de mensagens ativado");
    window.addEventListener("message", handleMessage);
    
    return () => {
      console.log("🔌 Listener de mensagens removido");
      window.removeEventListener("message", handleMessage);
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center max-w-2xl">
        <h1 className="text-2xl font-semibold text-foreground mb-2">
          Aguardando dados do Chatwoot...
        </h1>
        <p className="text-muted-foreground mb-4">
          Selecione uma conversa para começar
        </p>
        
        {/* Debug info */}
        <div className="mt-8 p-4 bg-muted rounded-lg text-left">
          <p className="text-sm font-semibold mb-2">Debug Log:</p>
          <div className="text-xs font-mono space-y-1 max-h-64 overflow-y-auto">
            {debugLog.length === 0 ? (
              <p className="text-muted-foreground">Nenhuma mensagem recebida ainda...</p>
            ) : (
              debugLog.map((log, i) => (
                <p key={i} className="text-foreground">{log}</p>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
