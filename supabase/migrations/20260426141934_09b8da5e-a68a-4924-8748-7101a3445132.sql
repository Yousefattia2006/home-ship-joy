
-- 1. Fix driver_profiles exposure: drop overly broad policy and create a safe public view
DROP POLICY IF EXISTS "Store users can see approved online drivers" ON public.driver_profiles;

-- Create a safe view exposing only non-sensitive fields needed for store-facing dispatch
CREATE OR REPLACE VIEW public.public_drivers AS
SELECT
  user_id,
  full_name,
  vehicle_type,
  plate_number,
  rating,
  is_online,
  approval_status,
  current_lat,
  current_lng,
  last_active_at
FROM public.driver_profiles
WHERE approval_status = 'approved' AND is_online = true;

GRANT SELECT ON public.public_drivers TO authenticated;

-- 2. Fix privilege escalation in user_roles: prevent self-assigning admin role
DROP POLICY IF EXISTS "Users can insert own role" ON public.user_roles;

CREATE POLICY "Users can insert own non-admin role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role IN ('store'::app_role, 'driver'::app_role)
);

-- 3. Remove redundant self-insert notifications policy (delivery participant + admin policies remain)
DROP POLICY IF EXISTS "users can insert own notifications" ON public.notifications;

-- Also drop duplicate read/update policies, keeping originals
DROP POLICY IF EXISTS "users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "users can update own notifications" ON public.notifications;
