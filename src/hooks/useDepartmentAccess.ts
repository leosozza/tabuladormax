import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type AppDepartment = 'telemarketing' | 'scouters' | 'administrativo';
type AppRole = 'admin' | 'manager' | 'supervisor' | 'agent';

interface DepartmentAccess {
  department: AppDepartment | null;
  role: AppRole | null;
  isAdmin: boolean;
  canAccessTelemarketing: boolean;
  canAccessScouter: boolean;
  canAccessAdmin: boolean;
  loading: boolean;
}

export const useDepartmentAccess = (): DepartmentAccess => {
  const [access, setAccess] = useState<DepartmentAccess>({
    department: null,
    role: null,
    isAdmin: false,
    canAccessTelemarketing: false,
    canAccessScouter: false,
    canAccessAdmin: false,
    loading: true,
  });

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setAccess({
            department: null,
            role: null,
            isAdmin: false,
            canAccessTelemarketing: false,
            canAccessScouter: false,
            canAccessAdmin: false,
            loading: false,
          });
          return;
        }

        // Buscar role
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        const role = roleData?.role as AppRole | null;
        const isAdmin = role === 'admin';

        // Buscar departamento
        const { data: deptData } = await supabase
          .from('user_departments')
          .select('department')
          .eq('user_id', user.id)
          .maybeSingle();

        const department = deptData?.department as AppDepartment | null;

        // Definir permissões de acesso
        let canAccessTelemarketing = false;
        let canAccessScouter = false;
        let canAccessAdmin = false;

        if (isAdmin) {
          // Admin tem acesso a tudo
          canAccessTelemarketing = true;
          canAccessScouter = true;
          canAccessAdmin = true;
        } else {
          // Outros usuários só acessam seu departamento
          canAccessTelemarketing = department === 'telemarketing';
          canAccessScouter = department === 'scouters';
          canAccessAdmin = department === 'administrativo';
        }

        setAccess({
          department,
          role,
          isAdmin,
          canAccessTelemarketing,
          canAccessScouter,
          canAccessAdmin,
          loading: false,
        });
      } catch (error) {
        console.error('Erro ao verificar acesso:', error);
        setAccess({
          department: null,
          role: null,
          isAdmin: false,
          canAccessTelemarketing: false,
          canAccessScouter: false,
          canAccessAdmin: false,
          loading: false,
        });
      }
    };

    checkAccess();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAccess();
    });

    return () => subscription.unsubscribe();
  }, []);

  return access;
};
