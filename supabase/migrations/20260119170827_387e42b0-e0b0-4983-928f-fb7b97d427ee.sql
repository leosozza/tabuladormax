-- 1) Seed permissions for /admin/database-maintenance
INSERT INTO public.route_permissions (route_id, department, role, can_access)
SELECT 
  ar.id as route_id,
  d.dept::app_department as department,
  r.rol::app_role as role,
  CASE WHEN r.rol = 'admin' THEN true ELSE false END as can_access
FROM public.app_routes ar
CROSS JOIN (
  SELECT 'telemarketing' as dept
  UNION SELECT 'scouters'
  UNION SELECT 'administrativo'
  UNION SELECT 'analise'
) d
CROSS JOIN (
  SELECT 'admin' as rol
  UNION SELECT 'manager'
  UNION SELECT 'agent'
  UNION SELECT 'supervisor'
) r
WHERE ar.path = '/admin/database-maintenance'
ON CONFLICT DO NOTHING;

-- 2) Create function to auto-seed permissions for new routes
CREATE OR REPLACE FUNCTION public.seed_route_permissions_for_new_route()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.route_permissions (route_id, department, role, can_access)
  SELECT 
    NEW.id as route_id,
    d.dept::app_department as department,
    r.rol::app_role as role,
    CASE WHEN r.rol = 'admin' THEN true ELSE false END as can_access
  FROM (
    SELECT 'telemarketing' as dept
    UNION SELECT 'scouters'
    UNION SELECT 'administrativo'
    UNION SELECT 'analise'
  ) d
  CROSS JOIN (
    SELECT 'admin' as rol
    UNION SELECT 'manager'
    UNION SELECT 'agent'
    UNION SELECT 'supervisor'
  ) r
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- 3) Create trigger to auto-seed permissions on new route insert
DROP TRIGGER IF EXISTS trigger_seed_route_permissions ON public.app_routes;
CREATE TRIGGER trigger_seed_route_permissions
  AFTER INSERT ON public.app_routes
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_route_permissions_for_new_route();