ALTER TABLE public.admin_broadcasts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage all broadcasts" ON public.admin_broadcasts;
CREATE POLICY "Admins can manage all broadcasts"
ON public.admin_broadcasts
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS admin_broadcasts_set_updated_at ON public.admin_broadcasts;
CREATE TRIGGER admin_broadcasts_set_updated_at
BEFORE UPDATE ON public.admin_broadcasts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

NOTIFY pgrst, 'reload schema';