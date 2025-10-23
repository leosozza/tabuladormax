/**
 * Repository for user and role operations
 * Provides robust fetching with fallback for PostgREST schema cache issues
 */

import { supabase } from '@/lib/supabase-helper';

export interface User {
  id: string;
  name: string;
  email: string;
  role_id: number;
  scouter_id?: number | null;
  supervisor_id?: string | null;
  role_name?: string; // Joined role name
  role?: { name: string }; // Embedded role object (changed from roles to role)
}

export interface Role {
  id: number;
  name: string;
  description?: string;
}

/**
 * Safely fetch users with their role names
 * Attempts embedded fetch first, falls back to separate queries if schema cache lacks FK
 * 
 * @returns Array of users with role_name populated
 */
export async function getUsersWithRolesSafe(): Promise<User[]> {
  try {
    console.log('🔍 [UsersRepo] Buscando usuários com roles (método seguro)...');

    // Attempt 1: Try standard PostgREST join syntax
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          name,
          email,
          role_id,
          scouter_id,
          supervisor_id,
          role:roles(name)
        `)
        .order('name');

      // Success with embed
      if (!error && data) {
        console.log('✅ [UsersRepo] Usuários carregados via embed (', data.length, ')');
        return data.map(u => ({
          ...u,
          role_name: u.role?.name || 'Sem Cargo',
        })) as User[];
      }

      // Check for PGRST200 (relationship not found) or similar FK errors
      if (error && (error.code === 'PGRST200' || error.message?.includes('relationship'))) {
        console.warn('⚠️ [UsersRepo] Schema cache FK não disponível (PGRST200), usando fallback...');
        throw new Error('FK_NOT_FOUND'); // Trigger fallback
      }

      // Other errors should be thrown
      if (error) {
        console.error('❌ [UsersRepo] Erro ao buscar usuários com embed:', error);
        throw error;
      }
    } catch (embedError: any) {
      // Attempt 2: Fallback to separate queries
      if (embedError.message === 'FK_NOT_FOUND' || embedError.code === 'PGRST200') {
        console.log('🔄 [UsersRepo] Executando fallback: busca separada de users + roles');
        
        // Fetch users
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, name, email, role_id, scouter_id, supervisor_id')
          .order('name');

        if (usersError) {
          console.error('❌ [UsersRepo] Erro ao buscar usuários:', usersError);
          throw usersError;
        }

        // Fetch roles
        const { data: roles, error: rolesError } = await supabase
          .from('roles')
          .select('id, name');

        if (rolesError) {
          console.error('❌ [UsersRepo] Erro ao buscar roles:', rolesError);
          throw rolesError;
        }

        // Create role map
        const roleMap = new Map<number, string>();
        if (roles) {
          roles.forEach(r => roleMap.set(r.id, r.name));
        }

        // Join in client
        const usersWithRoles = (users || []).map(u => ({
          ...u,
          role_name: roleMap.get(u.role_id) || 'Sem Cargo',
        })) as User[];

        console.log('✅ [UsersRepo] Usuários carregados via fallback (', usersWithRoles.length, ')');
        return usersWithRoles;
      }

      // Unexpected error, re-throw
      throw embedError;
    }

    return [];
  } catch (error) {
    console.error('❌ [UsersRepo] Exceção ao buscar usuários:', error);
    throw error;
  }
}

/**
 * Fetch all roles
 */
export async function getRoles(): Promise<Role[]> {
  try {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('name');

    if (error) throw error;
    return (data || []) as Role[];
  } catch (error) {
    console.error('❌ [UsersRepo] Erro ao buscar roles:', error);
    return [];
  }
}

/**
 * Create a new user
 */
export async function createUser(user: {
  name: string;
  email: string;
  password: string;
  role_id: number;
  scouter_id?: number;
}): Promise<User | null> {
  try {
    // Note: This creates the user in the users table only
    // Auth user creation should be handled separately via Supabase Auth
    const { data, error } = await supabase
      .from('users')
      .insert([{
        name: user.name,
        email: user.email,
        role_id: user.role_id,
        scouter_id: user.scouter_id || null,
      }])
      .select()
      .single();

    if (error) throw error;
    return data as User;
  } catch (error) {
    console.error('❌ [UsersRepo] Erro ao criar usuário:', error);
    return null;
  }
}

/**
 * Update an existing user
 */
export async function updateUser(
  userId: string,
  updates: Partial<Omit<User, 'id'>>
): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data as User;
  } catch (error) {
    console.error('❌ [UsersRepo] Erro ao atualizar usuário:', error);
    return null;
  }
}

/**
 * Delete a user
 */
export async function deleteUser(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('❌ [UsersRepo] Erro ao deletar usuário:', error);
    return false;
  }
}
