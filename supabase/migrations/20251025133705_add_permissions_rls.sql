-- Enable Row Level Security for permissions tables
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_permissions ENABLE ROW LEVEL SECURITY;

-- Permissions table policies
-- Allow authenticated users to read permissions
CREATE POLICY "Allow authenticated users to read permissions"
ON public.permissions
FOR SELECT
USING (auth.role() = 'authenticated');

-- Allow authenticated users to manage permissions (for admin UI)
-- In production, you may want to restrict this to admin users only
CREATE POLICY "Allow authenticated users to manage permissions"
ON public.permissions
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Role permissions table policies
-- Allow authenticated users to read role permissions
CREATE POLICY "Allow authenticated users to read role_permissions"
ON public.role_permissions
FOR SELECT
USING (auth.role() = 'authenticated');

-- Allow authenticated users to manage role permissions
CREATE POLICY "Allow authenticated users to manage role_permissions"
ON public.role_permissions
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- App routes table policies
-- Allow authenticated users to read routes
CREATE POLICY "Allow authenticated users to read app_routes"
ON public.app_routes
FOR SELECT
USING (auth.role() = 'authenticated');

-- Allow authenticated users to manage routes
CREATE POLICY "Allow authenticated users to manage app_routes"
ON public.app_routes
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Route permissions table policies
-- Allow authenticated users to read route permissions
CREATE POLICY "Allow authenticated users to read route_permissions"
ON public.route_permissions
FOR SELECT
USING (auth.role() = 'authenticated');

-- Allow authenticated users to manage route permissions
CREATE POLICY "Allow authenticated users to manage route_permissions"
ON public.route_permissions
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');
