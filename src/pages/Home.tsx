import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Bug, Users } from "lucide-react";
import { extractChatwootData, extractAssigneeData, saveChatwootContact } from "@/lib/chatwoot";
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
        console.log("ℹ️ Usuário não autenticado - aguardando login Chatwoot");
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, [navigate]);

  // Listener para auto-login via Chatwoot
  useEffect(() => {
    console.log("🎧 Listener de mensagens do Chatwoot ativado na Home");
    
    const processChatwootData = async (eventData: any) => {
      try {
        console.log("📦 eventData completo:", eventData);

        // Tentar auto-login via assignee
        const assigneeData = extractAssigneeData(eventData);
        if (assigneeData) {
          console.log("🔐 Tentando auto-login com assignee:", assigneeData.email);
          
          try {
            const { data: loginData, error: loginError } = await supabase.functions.invoke('chatwoot-auth', {
              body: assigneeData
            });

            if (loginError) throw loginError;

            console.log("🔐 Resposta da edge function:", {
              success: loginData?.success,
              hasSession: !!loginData?.session,
              hasAccessToken: !!loginData?.session?.access_token,
              hasRefreshToken: !!loginData?.session?.refresh_token,
              userMetadata: loginData?.session?.user?.user_metadata,
              user: loginData?.user
            });

            if (loginData?.session) {
              console.log("✅ Auto-login retornou sessão - aplicando...");
              
              // Aplicar a sessão recebida
              const { error: setSessionError } = await supabase.auth.setSession({
                access_token: loginData.session.access_token,
                refresh_token: loginData.session.refresh_token
              });

              if (setSessionError) {
                console.error("❌ Erro ao aplicar sessão:", setSessionError);
                throw setSessionError;
              } else {
                console.log("✅ Sessão aplicada com sucesso!");
                console.log("👤 User metadata disponível:", loginData.session.user.user_metadata);
                
                // Atualizar perfil com display_name do Chatwoot
                if (loginData.session.user.user_metadata?.display_name) {
                  const { error: profileError } = await supabase
                    .from('profiles')
                    .update({
                      display_name: loginData.session.user.user_metadata.display_name
                    })
                    .eq('id', loginData.session.user.id);
                  
                  if (profileError) {
                    console.error('⚠️ Erro ao atualizar display_name no perfil:', profileError);
                  } else {
                    console.log('✅ Display name atualizado no perfil');
                  }
                }
                
                console.log("✅ Redirecionando para /lead");
                // Processar dados do contato antes de redirecionar
                if (eventData?.conversation?.meta?.sender || eventData?.data?.contact) {
                  const contactData = extractChatwootData(eventData);
                  
                  if (contactData && contactData.bitrix_id) {
                    console.log("💾 Salvando contato:", contactData.bitrix_id);
                    await saveChatwootContact(contactData);
                    
                    await supabase.from('actions_log').insert([{
                      lead_id: Number(contactData.bitrix_id),
                      action_label: 'Auto-login Chatwoot',
                      payload: {
                        conversation_id: contactData.conversation_id,
                        contact_id: contactData.contact_id
                      } as any,
                      status: 'OK',
                    }]);
                  }
                }
                
                navigate('/lead');
              }
            }
          } catch (loginError) {
            console.error("❌ Erro no auto-login:", loginError);
          }
        }
      } catch (error) {
        console.error("❌ Erro ao processar evento:", error);
      }
    };
    
    // 1. Verificar se já existem dados pré-carregados
    if ((window as any)._CHATWOOT_DATA_) {
      console.log("✅ [Home] Dados pré-carregados encontrados!");
      processChatwootData((window as any)._CHATWOOT_DATA_);
    }

    // 2. Escutar evento customizado
    const handleChatwootReady = (event: Event) => {
      console.log("✅ [Home] Evento chatwoot-data-ready recebido!");
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

        await processChatwootData(eventData);
      } catch (error) {
        console.error("❌ Erro ao processar evento:", error);
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
          Aguardando login via Chatwoot...
        </h1>
        <p className="text-muted-foreground mb-6">
          Abra uma conversa no Chatwoot para fazer login automaticamente
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
          <p className="text-xs font-semibold mb-2">💡 Como funciona:</p>
          <p className="text-xs text-muted-foreground">
            Esta aplicação faz login automaticamente quando você abre uma conversa no Chatwoot.
            Após o login, você será redirecionado para a página do lead.
          </p>
        </div>
      </div>
    </div>
  );
}
