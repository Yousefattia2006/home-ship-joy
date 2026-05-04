-- 1. Remove privilege-escalation INSERT policy on driver_balance_transactions
DROP POLICY IF EXISTS "Drivers can insert own top_up" ON public.driver_balance_transactions;

-- 2. Move OTP codes into a separate, more restricted table
CREATE TABLE IF NOT EXISTS public.delivery_otps (
  delivery_id uuid PRIMARY KEY REFERENCES public.deliveries(id) ON DELETE CASCADE,
  otp_code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.delivery_otps ENABLE ROW LEVEL SECURITY;

-- Backfill existing OTPs
INSERT INTO public.delivery_otps (delivery_id, otp_code)
SELECT id, otp_code
FROM public.deliveries
WHERE otp_code IS NOT NULL
ON CONFLICT (delivery_id) DO NOTHING;

-- Drop the old column so drivers cannot read it via the deliveries table
ALTER TABLE public.deliveries DROP COLUMN IF EXISTS otp_code;

-- Only the store owner of the delivery (and admins) may read the OTP
CREATE POLICY "Store can read own delivery OTP"
ON public.delivery_otps
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.deliveries d
  WHERE d.id = delivery_otps.delivery_id
    AND d.store_user_id = auth.uid()
));

CREATE POLICY "Admins can manage all OTPs"
ON public.delivery_otps
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Storage policies for driver-documents (UPDATE/DELETE)
CREATE POLICY "Drivers can update own docs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'driver-documents'
  AND (storage.foldername(name))[1] = (auth.uid())::text
)
WITH CHECK (
  bucket_id = 'driver-documents'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

CREATE POLICY "Drivers can delete own docs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'driver-documents'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

CREATE POLICY "Admins can manage all driver docs"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'driver-documents'
  AND public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  bucket_id = 'driver-documents'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

-- 4. Restrict direct EXECUTE on has_role (it is still callable internally by RLS as the owner)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM authenticated;

-- 5. Realtime channel authorization
-- Allow users to subscribe only to their own user channel or to a delivery channel
-- they participate in. Topic naming convention: "user:<uuid>", "delivery:<uuid>",
-- "conversation:<uuid>".
CREATE POLICY "Authenticated users can subscribe to allowed channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Personal channel
  (realtime.topic() = 'user:' || auth.uid()::text)
  OR
  -- Delivery channel where user is the store or driver
  (
    realtime.topic() LIKE 'delivery:%'
    AND EXISTS (
      SELECT 1 FROM public.deliveries d
      WHERE d.id::text = split_part(realtime.topic(), ':', 2)
        AND (d.store_user_id = auth.uid() OR d.driver_user_id = auth.uid())
    )
  )
  OR
  -- Conversation channel
  (
    realtime.topic() LIKE 'conversation:%'
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id::text = split_part(realtime.topic(), ':', 2)
        AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
    )
  )
  OR
  -- Admins can subscribe to any channel
  public.has_role(auth.uid(), 'admin'::app_role)
);
