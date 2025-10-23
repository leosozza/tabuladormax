import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase-helper';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role_id: number;
  role_name?: string;
  scouter_id?: number | null;
  supervisor_id?: string | null;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer profile fetch
        if (session?.user) {
          setTimeout(() => {
            fetchUserProfile(session.user.id);
          }, 0);
        } else {
          setUserProfile(null);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      // @ts-ignore - Supabase types will be generated after migration
      const response: any = await supabase
        .from('users')
        .select(`
          id,
          name,
          email,
          role_id,
          scouter_id,
          supervisor_id,
          roles (
            name
          )
        `)
        .eq('id', userId)
        .single();
      
      const { data, error } = response;

      if (error) throw error;

      if (data) {
        setUserProfile({
          id: data.id,
          name: data.name,
          email: data.email,
          role_id: data.role_id,
          role_name: data.roles?.name,
          scouter_id: data.scouter_id,
          supervisor_id: data.supervisor_id,
        });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, name: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          name,
        },
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
      setSession(null);
      setUserProfile(null);
    }
    return { error: error as Error | null };
  };

  const hasPermission = (module: string, action: string): boolean => {
    // Admin sempre tem todas as permissões
    if (userProfile?.role_name === 'admin') return true;
    
    // TODO: Implementar verificação via banco de dados
    return false;
  };

  return {
    user,
    session,
    userProfile,
    loading,
    signIn,
    signUp,
    signOut,
    hasPermission,
    isAdmin: userProfile?.role_name === 'admin',
    isSupervisor: userProfile?.role_name === 'supervisor',
    isScouter: userProfile?.role_name === 'scouter',
  };
}
