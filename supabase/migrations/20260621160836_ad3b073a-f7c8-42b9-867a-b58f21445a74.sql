ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.proposals  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.contracts  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS properties_is_demo_idx ON public.properties(is_demo) WHERE is_demo;

DROP POLICY IF EXISTS "Admins manage demo properties" ON public.properties;
CREATE POLICY "Admins manage demo properties" ON public.properties
  FOR ALL TO authenticated
  USING (is_demo AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (is_demo AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage demo proposals" ON public.proposals;
CREATE POLICY "Admins manage demo proposals" ON public.proposals
  FOR ALL TO authenticated
  USING (is_demo AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (is_demo AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage demo contracts" ON public.contracts;
CREATE POLICY "Admins manage demo contracts" ON public.contracts
  FOR ALL TO authenticated
  USING (is_demo AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (is_demo AND public.has_role(auth.uid(), 'admin'));