import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { extractChatwootData, saveChatwootContact } from "@/lib/chatwoot";

export default function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      try {
        const eventData = JSON.parse(event.data);
        const contactData = extractChatwootData(eventData);
        
        if (contactData) {
          await saveChatwootContact(contactData);
          navigate(`/${contactData.bitrix_id}`);
        }
      } catch (error) {
        console.error("Erro ao processar evento do Chatwoot:", error);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-foreground mb-2">
          Aguardando dados do Chatwoot...
        </h1>
        <p className="text-muted-foreground">
          Selecione uma conversa para começar
        </p>
      </div>
    </div>
  );
}
