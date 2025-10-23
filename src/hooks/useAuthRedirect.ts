import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

/**
 * useAuthRedirect - Hook to redirect users after login based on their metadata/claims
 * 
 * Checks user metadata to determine which module they should access:
 * - If user has 'module' metadata set to 'scouter' or 'gestao', redirect to /scouter
 * - If user has 'module' metadata set to 'tabulador', redirect to /tabulador
 * - Otherwise, redirect to home choice page (/)
 * 
 * This hook can be used on the Auth page or any post-login page to ensure
 * users are directed to the correct module based on their role/permissions.
 * 
 * @param options.enabled - Whether to enable the redirect (default: true)
 * @param options.defaultPath - Default path if no module is specified (default: '/')
 */
interface UseAuthRedirectOptions {
  enabled?: boolean;
  defaultPath?: string;
}

export const useAuthRedirect = (options: UseAuthRedirectOptions = {}) => {
  const { enabled = true, defaultPath = '/' } = options;
  const navigate = useNavigate();

  useEffect(() => {
    if (!enabled) return;

    const checkUserAndRedirect = async () => {
      try {
        // Get current user
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
          console.error('Error getting user:', error);
          return;
        }

        // Check user metadata for module preference
        const userMetadata = user.user_metadata || {};
        const appMetadata = user.app_metadata || {};
        
        // Check both user_metadata and app_metadata for module preference
        const module = userMetadata.module || appMetadata.module;

        // Redirect based on module
        if (module === 'scouter' || module === 'gestao') {
          navigate('/scouter', { replace: true });
        } else if (module === 'tabulador') {
          navigate('/tabulador', { replace: true });
        } else {
          // No specific module - go to choice page
          navigate(defaultPath, { replace: true });
        }
      } catch (err) {
        console.error('Error in auth redirect:', err);
        // On error, go to default path
        navigate(defaultPath, { replace: true });
      }
    };

    checkUserAndRedirect();
  }, [enabled, defaultPath, navigate]);
};

/**
 * Helper function to get the current user's module preference
 * Can be used outside of React components or for conditional rendering
 */
export const getUserModule = async (): Promise<'tabulador' | 'scouter' | null> => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }

    const userMetadata = user.user_metadata || {};
    const appMetadata = user.app_metadata || {};
    
    const module = userMetadata.module || appMetadata.module;

    if (module === 'scouter' || module === 'gestao') {
      return 'scouter';
    } else if (module === 'tabulador') {
      return 'tabulador';
    }

    return null;
  } catch (err) {
    console.error('Error getting user module:', err);
    return null;
  }
};

export default useAuthRedirect;
