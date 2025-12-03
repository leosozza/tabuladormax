import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface UserCommercialProject {
  projectId: string | null;
  projectName: string | null;
  projectCode: string | null;
  isRestricted: boolean;
  loading: boolean;
}

export function useUserCommercialProject(): UserCommercialProject {
  const { data, isLoading } = useQuery({
    queryKey: ["user-commercial-project"],
    queryFn: async () => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { projectId: null, projectName: null, projectCode: null, isRestricted: false };
      }

      // Check user role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      const role = roleData?.role;

      // Admin and manager see everything
      if (role === 'admin' || role === 'manager') {
        return { projectId: null, projectName: null, projectCode: null, isRestricted: false };
      }

      // For supervisor and agent, get their commercial project from agent_telemarketing_mapping
      const { data: mapping } = await supabase
        .from("agent_telemarketing_mapping")
        .select(`
          commercial_project_id,
          commercial_projects:commercial_project_id(id, name, code)
        `)
        .eq("tabuladormax_user_id", user.id)
        .single();

      if (mapping?.commercial_project_id) {
        const project = mapping.commercial_projects as any;
        return {
          projectId: mapping.commercial_project_id,
          projectName: project?.name || null,
          projectCode: project?.code || null,
          isRestricted: true
        };
      }

      // User has no mapping - allow all (fallback for backward compatibility)
      return { projectId: null, projectName: null, projectCode: null, isRestricted: false };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    projectId: data?.projectId ?? null,
    projectName: data?.projectName ?? null,
    projectCode: data?.projectCode ?? null,
    isRestricted: data?.isRestricted ?? false,
    loading: isLoading,
  };
}
