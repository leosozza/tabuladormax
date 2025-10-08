-- ============================================
-- PHASE 1: CREATE RBAC SYSTEM
-- ============================================

-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'agent');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- Create trigger function for new user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  first_user BOOLEAN;
BEGIN
  -- Check if this is the first user
  SELECT COUNT(*) = 0 INTO first_user FROM auth.users WHERE id != NEW.id;
  
  -- Insert profile
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  
  -- Assign role (first user gets admin, others get agent)
  IF first_user THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'agent');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- PHASE 2: RLS POLICIES FOR NEW TABLES
-- ============================================

-- Profiles: Users can read all, update only their own
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- User roles: Users can view their own roles, admins can manage all
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- PHASE 3: REPLACE EXISTING RLS POLICIES
-- ============================================

-- Drop all existing insecure policies
DROP POLICY IF EXISTS "Enable all access for leads" ON public.leads;
DROP POLICY IF EXISTS "Leads são acessíveis por todos autenticados" ON public.leads;
DROP POLICY IF EXISTS "Enable all access for actions_log" ON public.actions_log;
DROP POLICY IF EXISTS "Ligações são acessíveis por todos autenticados" ON public.call_logs;
DROP POLICY IF EXISTS "Enable all access for button_config" ON public.button_config;
DROP POLICY IF EXISTS "Configs são acessíveis por todos autenticados" ON public.config_kv;
DROP POLICY IF EXISTS "Enable all access for profile_field_mapping" ON public.profile_field_mapping;

-- LEADS: Agents see their own, managers see team, admins see all
CREATE POLICY "Users can view accessible leads"
  ON public.leads FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager') OR
    auth.uid()::text = responsible
  );

CREATE POLICY "Users can update accessible leads"
  ON public.leads FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager') OR
    auth.uid()::text = responsible
  );

CREATE POLICY "Managers and admins can insert leads"
  ON public.leads FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

-- ACTIONS_LOG: Same access as leads
CREATE POLICY "Users can view action logs for accessible leads"
  ON public.actions_log FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager') OR
    EXISTS (
      SELECT 1 FROM public.leads
      WHERE leads.id = actions_log.lead_id
        AND leads.responsible = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert action logs"
  ON public.actions_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- CALL_LOGS: Same access as leads
CREATE POLICY "Users can view call logs for accessible leads"
  ON public.call_logs FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager') OR
    EXISTS (
      SELECT 1 FROM public.leads
      WHERE leads.id = call_logs.lead_id
        AND leads.responsible = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert call logs"
  ON public.call_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- BUTTON_CONFIG: Read for all, write for managers/admins
CREATE POLICY "All authenticated users can view buttons"
  ON public.button_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers and admins can manage buttons"
  ON public.button_config FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

-- CONFIG_KV: Admins only
CREATE POLICY "Admins can manage config"
  ON public.config_kv FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- PROFILE_FIELD_MAPPING: Managers and admins
CREATE POLICY "Managers and admins can manage field mappings"
  ON public.profile_field_mapping FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

-- ============================================
-- PHASE 4: CLEANUP
-- ============================================

-- Remove insecure admin password from config_kv
DELETE FROM public.config_kv WHERE key = 'admin_password';