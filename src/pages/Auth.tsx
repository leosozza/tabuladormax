import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { TelemarketingSelector } from "@/components/TelemarketingSelector";

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [telemarketingId, setTelemarketingId] = useState<number>();
  const [pendingTelemarketingName, setPendingTelemarketingName] = useState<string | null>(null);
  const [newUserDepartment, setNewUserDepartment] = useState<'telemarketing' | 'scouter' | 'administrativo'>('telemarketing');
  const [showTelemarketingModal, setShowTelemarketingModal] = useState(false);
  const [oauthUser, setOauthUser] = useState<{ id: string; user_metadata?: Record<string, unknown> } | null>(null);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Helper function to create agent_telemarketing_mapping without duplicates
  const createAgentMapping = async (userId: string, tmId: number, tmName?: string | null, chatwootAgentId?: number | null): Promise<boolean> => {
    try {
      // Validate inputs
      if (!userId || !tmId || !Number.isInteger(tmId) || tmId <= 0) {
        console.error('❌ Parâmetros inválidos para criação de mapeamento:', { userId, tmId });
        toast.error('Erro: Parâmetros inválidos para criar mapeamento de agente');
        return false;
      }

      // Check if mapping already exists
      const { data: existingMapping, error: checkError } = await supabase
        .from('agent_telemarketing_mapping')
        .select('id')
        .eq('tabuladormax_user_id', userId)
        .maybeSingle();

      if (checkError) {
        console.error('❌ Erro ao verificar mapeamento existente:', checkError);
        toast.error(`Erro ao verificar mapeamento: ${checkError.message}`);
        return false;
      }

      if (existingMapping) {
        console.log('✅ Mapeamento já existe para o usuário');
        return true; // Already exists, consider it a success
      }

      // Use provided name or fetch from cache
      let telemarketingName = tmName;
      
      if (!telemarketingName) {
        const { data: cacheData, error: cacheError } = await supabase
          .from('config_kv')
          .select('value')
          .eq('key', 'bitrix_telemarketing_list')
          .maybeSingle();

        if (cacheError) {
          console.warn('⚠️ Erro ao buscar nome do telemarketing do cache:', cacheError);
          // Continue without the name, it's not critical
        }

        if (cacheData?.value) {
          const items = cacheData.value as Array<{ id: number; title: string }>;
          const found = items.find(item => item.id === tmId);
          telemarketingName = found?.title || null;
        }
      }

      // Create agent_telemarketing_mapping record
      const { error: mappingError } = await supabase
        .from('agent_telemarketing_mapping')
        .insert({
          tabuladormax_user_id: userId,
          bitrix_telemarketing_id: tmId,
          bitrix_telemarketing_name: telemarketingName,
          chatwoot_agent_id: chatwootAgentId,
        });

      if (mappingError) {
        // Check if it's a duplicate error (unique constraint violation)
        if (mappingError.code === '23505') {
          console.log('✅ Mapeamento já existe (constraint)');
          return true;
        }
        
        // Log and alert for all other errors
        console.error('❌ Erro ao criar mapeamento:', {
          code: mappingError.code,
          message: mappingError.message,
          details: mappingError.details,
          hint: mappingError.hint,
        });
        
        // Provide specific error messages based on error codes
        if (mappingError.code === '42501') {
          toast.error('Erro de permissão: Você não tem permissão para criar o mapeamento. Contate o administrador.');
        } else if (mappingError.code === '23503') {
          toast.error('Erro: Referência inválida. Verifique se o usuário existe.');
        } else {
          toast.error(`Erro ao criar mapeamento de agente: ${mappingError.message}`);
        }
        
        return false;
      }

      console.log('✅ Mapeamento criado com sucesso');
      return true;
    } catch (error) {
      console.error('❌ Erro inesperado ao criar mapeamento de agente:', error);
      toast.error('Erro inesperado ao criar mapeamento de agente');
      return false;
    }
  };

  useEffect(() => {
    // Check if user is already logged in or just returned from OAuth
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        console.log('🔍 Verificando sessão do usuário:', session.user.id);
        
        // Check if user has telemarketing_id in metadata
        if (!session.user.user_metadata?.telemarketing_id) {
          // User logged in via OAuth but doesn't have telemarketing set
          console.log('⚠️ Usuário OAuth sem telemarketing_id configurado, mostrando modal');
          setOauthUser(session.user);
          setShowTelemarketingModal(true);
        } else {
          // User has everything set up, but let's verify the mapping exists
          const telemarketingId = session.user.user_metadata.telemarketing_id;
          console.log('✅ Usuário tem telemarketing_id:', telemarketingId);
          
          // Ensure mapping exists (will skip if already exists)
          if (Number.isInteger(telemarketingId) && telemarketingId > 0) {
            await createAgentMapping(session.user.id, telemarketingId, null, null);
          }
          
          // Redirecionar baseado no departamento
          const { data: deptData } = await supabase
            .from('user_departments')
            .select('department')
            .eq('user_id', session.user.id)
            .maybeSingle();

          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id)
            .maybeSingle();

          const isAdmin = roleData?.role === 'admin';
          const department = deptData?.department;

          if (isAdmin) {
            navigate('/home-choice');
          } else if (department === 'telemarketing') {
            navigate('/lead');
          } else if (department === 'scouters') {
            navigate('/scouter');
          } else if (department === 'administrativo') {
            navigate('/dashboard');
          } else {
            navigate('/home-choice');
          }
        }
      }
    });
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let finalTelemarketingId = telemarketingId;
      let finalTelemarketingName: string | null = null;
      let chatwootAgentId: number | null = null;

      // Se há um nome pendente para criar, criar primeiro
      if (pendingTelemarketingName && telemarketingId === -1) {
        console.log('📝 Criando novo operador de telemarketing:', pendingTelemarketingName);
        
        const { data: createData, error: createError } = await supabase.functions.invoke('create-bitrix-telemarketing', {
          body: { title: pendingTelemarketingName.trim() }
        });

        if (createError) {
          toast.error(createError.message || 'Erro ao criar operador de telemarketing');
          setLoading(false);
          return;
        }

        if (createData?.error) {
          toast.error(createData.error);
          setLoading(false);
          return;
        }

        if (createData?.item) {
          finalTelemarketingId = createData.item.id;
          finalTelemarketingName = createData.item.title;
          console.log('✅ Operador criado com ID:', finalTelemarketingId);
          toast.success(`Operador "${createData.item.title}" criado com sucesso!`);
        } else {
          toast.error('Erro ao criar operador de telemarketing');
          setLoading(false);
          return;
        }
      }

      // Validação obrigatória do campo de telemarketing
      if (finalTelemarketingId == null || !Number.isInteger(finalTelemarketingId) || finalTelemarketingId <= 0) {
        toast.error("Por favor, selecione um operador de telemarketing válido");
        setLoading(false);
        return;
      }

      // Criar agente no Chatwoot
      console.log('📝 Criando agente no Chatwoot');

      const { data: chatwootData, error: chatwootError } = await supabase.functions.invoke(
        'create-chatwoot-agent',
        {
          body: {
            name: displayName,
            email: email,
            password: password,
            role: 'agent'
          }
        }
      );

      if (chatwootError) {
        console.error('❌ Erro ao criar agente no Chatwoot:', chatwootError);
        toast.error('Erro ao criar conta no Chatwoot');
        setLoading(false);
        return;
      }

      if (chatwootData?.agent) {
        chatwootAgentId = chatwootData.agent.id;
        console.log('✅ Agente criado/encontrado no Chatwoot com ID:', chatwootAgentId);
        
        if (chatwootData.existed) {
          toast.success(`Agente "${chatwootData.agent.name}" já existia no Chatwoot!`);
        } else {
          toast.success(`Agente "${chatwootData.agent.name}" criado no Chatwoot!`);
        }
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            display_name: displayName,
            telemarketing_id: finalTelemarketingId,
            department: newUserDepartment,
          },
        },
      });

      if (error) throw error;

      // After successful signup, create the agent_telemarketing_mapping
      // This ensures the mapping is created immediately
      if (data.user?.id) {
        console.log('📝 Criando mapeamento de agente após signup bem-sucedido');
        const mappingSuccess = await createAgentMapping(data.user.id, finalTelemarketingId, finalTelemarketingName, chatwootAgentId);
        
        if (!mappingSuccess) {
          console.warn('⚠️ Falha ao criar mapeamento durante signup, mas conta foi criada');
          toast.warning("Conta criada, mas houve um problema ao criar o mapeamento de agente. Contate o suporte se necessário.");
        } else {
          toast.success("Conta criada com sucesso! Você já pode fazer login.");
        }
      } else {
        toast.success("Conta criada com sucesso! Você já pode fazer login.");
      }

      setEmail("");
      setPassword("");
      setDisplayName("");
      setTelemarketingId(undefined);
      setPendingTelemarketingName(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro ao criar conta";
      console.error('❌ Erro ao criar conta:', error);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // After successful login, check if password reset is required
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user?.user_metadata?.password_reset_required) {
        console.log('🔐 Senha temporária detectada - solicitando mudança de senha');
        setCurrentUserId(user.id);
        setShowPasswordChange(true);
        toast.info("Por favor, defina uma nova senha para continuar");
        setLoading(false);
        return;
      }

      // Check if user has telemarketing_id but no mapping
      if (user?.user_metadata?.telemarketing_id) {
        const telemarketingIdFromMetadata = user.user_metadata.telemarketing_id;
        
        // Validate telemarketing_id from metadata
        if (Number.isInteger(telemarketingIdFromMetadata) && telemarketingIdFromMetadata > 0) {
          console.log('📝 Verificando/criando mapeamento de agente após login');
          const success = await createAgentMapping(user.id, telemarketingIdFromMetadata);
          
          if (!success) {
            toast.warning("Login realizado, mas houve um problema ao criar o mapeamento de agente");
          }
        } else {
          console.warn('⚠️ telemarketing_id inválido nos metadados do usuário:', telemarketingIdFromMetadata);
        }
      }

      toast.success("Login realizado com sucesso!");
      
      // Redirecionar baseado no departamento
      const { data: { user: loggedUser } } = await supabase.auth.getUser();
      
      if (loggedUser) {
        const { data: deptData } = await supabase
          .from('user_departments')
          .select('department')
          .eq('user_id', loggedUser.id)
          .maybeSingle();

        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', loggedUser.id)
          .maybeSingle();

        const isAdmin = roleData?.role === 'admin';
        const department = deptData?.department;

        if (isAdmin) {
          navigate('/home-choice');
        } else if (department === 'telemarketing') {
          navigate('/lead');
        } else if (department === 'scouters') {
          navigate('/scouter');
        } else if (department === 'administrativo') {
          navigate('/dashboard');
        } else {
          navigate('/home-choice');
        }
      } else {
        navigate('/');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro ao fazer login";
      console.error('❌ Erro ao fazer login:', error);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmNewPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
        data: {
          password_reset_required: false,
          temp_password_created_at: null,
        },
      });

      if (error) throw error;

      toast.success("Senha alterada com sucesso!");

      // Sincronizar senha com Chatwoot
      try {
        const { data: session } = await supabase.auth.getSession();
        
        if (session?.session?.user) {
          const { data: mappingData } = await supabase
            .from('agent_telemarketing_mapping')
            .select('chatwoot_agent_id')
            .eq('tabuladormax_user_id', session.session.user.id)
            .maybeSingle();
          
          if (mappingData?.chatwoot_agent_id) {
            console.log('📝 Atualizando senha no Chatwoot');
            
            const { error: chatwootError } = await supabase.functions.invoke(
              'update-chatwoot-agent',
              {
                body: {
                  agentId: mappingData.chatwoot_agent_id,
                  password: newPassword
                }
              }
            );
            
            if (chatwootError) {
              console.warn('⚠️ Erro ao atualizar senha no Chatwoot:', chatwootError);
            } else {
              console.log('✅ Senha atualizada no Chatwoot');
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ Erro ao sincronizar senha com Chatwoot:', error);
      }

      setShowPasswordChange(false);
      setNewPassword("");
      setConfirmNewPassword("");
      navigate("/");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro ao alterar senha";
      console.error('❌ Erro ao alterar senha:', error);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth`,
        },
      });

      if (error) throw error;
      // Note: On success, the browser will redirect to Google OAuth page,
      // so no need to reset loading state here
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro ao fazer login com Google";
      toast.error(errorMessage);
      setLoading(false);
    }
  };

  const handleCompleteTelemarketingSetup = async () => {
    // Validação obrigatória do campo de telemarketing
    if (!telemarketingId || !Number.isInteger(telemarketingId) || telemarketingId <= 0) {
      toast.error("Por favor, selecione um operador de telemarketing válido");
      return;
    }

    setLoading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Usuário não encontrado");
      }

      console.log('📝 Completando setup de telemarketing para usuário OAuth:', user.id);

      // Update user metadata with telemarketing_id
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          telemarketing_id: telemarketingId,
        },
      });

      if (updateError) {
        console.error('❌ Erro ao atualizar metadados do usuário:', updateError);
        throw updateError;
      }

      console.log('✅ Metadados do usuário atualizados com telemarketing_id');

      // Create agent_telemarketing_mapping using helper function
      const success = await createAgentMapping(user.id, telemarketingId);

      if (!success) {
        toast.warning("Configuração salva, mas houve um problema ao criar o mapeamento de agente");
      } else {
        toast.success("Configuração concluída com sucesso!");
      }

      setShowTelemarketingModal(false);
      
      // Redirecionar baseado no departamento
      const { data: { user: oauthLoggedUser } } = await supabase.auth.getUser();
      
      if (oauthLoggedUser) {
        const { data: deptData } = await supabase
          .from('user_departments')
          .select('department')
          .eq('user_id', oauthLoggedUser.id)
          .maybeSingle();

        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', oauthLoggedUser.id)
          .maybeSingle();

        const isAdmin = roleData?.role === 'admin';
        const department = deptData?.department;

        if (isAdmin) {
          navigate('/home-choice');
        } else if (department === 'telemarketing') {
          navigate('/lead');
        } else if (department === 'scouters') {
          navigate('/scouter');
        } else if (department === 'administrativo') {
          navigate('/dashboard');
        } else {
          navigate('/home-choice');
        }
      } else {
        navigate('/');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro ao salvar configuração";
      console.error('❌ Erro ao salvar configuração:', error);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) throw error;

      toast.success("Email de recuperação enviado! Verifique sua caixa de entrada.");
      setShowPasswordReset(false);
      setResetEmail("");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro ao enviar email de recuperação";
      console.error('❌ Erro ao solicitar recuperação de senha:', error);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Bem-vindo</CardTitle>
          <CardDescription>
            Faça login ou crie uma nova conta para acessar o sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold">Login</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Entre com sua conta para acessar o sistema
              </p>
            </div>

            {!showPasswordReset ? (
                <>
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="login-password">Senha</Label>
                        <Button
                          type="button"
                          variant="link"
                          className="px-0 text-sm"
                          onClick={() => setShowPasswordReset(true)}
                        >
                          Esqueci minha senha
                        </Button>
                      </div>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Entrando..." : "Entrar"}
                    </Button>
                  </form>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Recuperar Senha</h3>
                    <p className="text-sm text-muted-foreground">
                      Digite seu email e enviaremos um link para redefinir sua senha.
                    </p>
                  </div>
                  <form onSubmit={handlePasswordReset} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email">Email</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setShowPasswordReset(false);
                          setResetEmail("");
                        }}
                        disabled={loading}
                      >
                        Voltar
                      </Button>
                      <Button type="submit" className="flex-1" disabled={loading}>
                        {loading ? "Enviando..." : "Enviar Email"}
                      </Button>
                    </div>
                  </form>
                </div>
              )}
              
              {!showPasswordReset && (
                <>
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        ou
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Entrar com Google
                  </Button>
                </>
              )}
            
            <div className="mt-6 text-center text-sm text-muted-foreground">
              <p>Não tem uma conta? Contate seu administrador ou supervisor para criar um acesso.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Telemarketing Selection Modal for OAuth Users */}
      <Dialog open={showTelemarketingModal} onOpenChange={setShowTelemarketingModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete seu Cadastro</DialogTitle>
            <DialogDescription>
              Para finalizar seu registro, selecione ou busque o operador de telemarketing que você representa no Bitrix24.
              Use o botão de busca para encontrar por nome completo ou pelas 3 primeiras letras.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="oauth-telemarketing">Operador de Telemarketing *</Label>
              <TelemarketingSelector
                value={telemarketingId}
                onChange={setTelemarketingId}
                placeholder="Selecione o operador de telemarketing"
              />
              <p className="text-xs text-muted-foreground">
                Este campo é obrigatório para acessar o sistema.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              onClick={handleCompleteTelemarketingSetup}
              disabled={loading || !telemarketingId}
              className="w-full"
            >
              {loading ? "Salvando..." : "Concluir Cadastro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Change Dialog */}
      <Dialog open={showPasswordChange} onOpenChange={setShowPasswordChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar Senha</DialogTitle>
            <DialogDescription>
              Por motivos de segurança, você deve definir uma nova senha permanente.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova Senha</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
              <p className="text-xs text-muted-foreground">
                Mínimo de 6 caracteres
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Alterando..." : "Alterar Senha"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Auth;
