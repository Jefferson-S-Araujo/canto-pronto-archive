
-- 1. user_roles: only admins can INSERT/UPDATE/DELETE
CREATE POLICY "Only admins insert user_roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins update user_roles"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins delete user_roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. proposals: prevent non-admin participants from changing sensitive/financial fields
CREATE OR REPLACE FUNCTION public.protect_proposal_immutable_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
     OR NEW.owner_id IS DISTINCT FROM OLD.owner_id
     OR NEW.property_id IS DISTINCT FROM OLD.property_id
     OR NEW.monthly_price IS DISTINCT FROM OLD.monthly_price
     OR NEW.deposit IS DISTINCT FROM OLD.deposit
     OR NEW.extra_deposit IS DISTINCT FROM OLD.extra_deposit
     OR NEW.escrow_amount IS DISTINCT FROM OLD.escrow_amount THEN
    RAISE EXCEPTION 'Campos financeiros e identificadores da proposta são imutáveis para inquilino/proprietário';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS proposals_protect_fields ON public.proposals;
CREATE TRIGGER proposals_protect_fields
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.protect_proposal_immutable_fields();

-- 3. storage.objects: contracts bucket — write only via admin role; uploads go through service role serverFn
CREATE POLICY "Contracts admin write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'contracts' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Contracts admin update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'contracts' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'contracts' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Contracts admin delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'contracts' AND public.has_role(auth.uid(), 'admin'));

-- 4. inspections bucket: add UPDATE policy for participants
CREATE POLICY "Inspections update participants"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'inspections' AND (
      EXISTS (SELECT 1 FROM public.proposals p
              WHERE p.id::text = split_part(objects.name, '/', 1)
                AND (p.tenant_id = auth.uid() OR p.owner_id = auth.uid()))
      OR public.has_role(auth.uid(), 'admin')
    )
  )
  WITH CHECK (
    bucket_id = 'inspections' AND (
      EXISTS (SELECT 1 FROM public.proposals p
              WHERE p.id::text = split_part(objects.name, '/', 1)
                AND (p.tenant_id = auth.uid() OR p.owner_id = auth.uid()))
      OR public.has_role(auth.uid(), 'admin')
    )
  );

-- 5. ticket-attachments bucket: add UPDATE and DELETE policies for participants
CREATE POLICY "Ticket files update participants"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'ticket-attachments' AND (
      EXISTS (SELECT 1 FROM public.tickets t
              WHERE t.id::text = split_part(objects.name, '/', 1)
                AND (t.tenant_id = auth.uid() OR t.owner_id = auth.uid()))
      OR public.has_role(auth.uid(), 'admin')
    )
  )
  WITH CHECK (
    bucket_id = 'ticket-attachments' AND (
      EXISTS (SELECT 1 FROM public.tickets t
              WHERE t.id::text = split_part(objects.name, '/', 1)
                AND (t.tenant_id = auth.uid() OR t.owner_id = auth.uid()))
      OR public.has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "Ticket files delete participants"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'ticket-attachments' AND (
      EXISTS (SELECT 1 FROM public.tickets t
              WHERE t.id::text = split_part(objects.name, '/', 1)
                AND (t.tenant_id = auth.uid() OR t.owner_id = auth.uid()))
      OR public.has_role(auth.uid(), 'admin')
    )
  );

-- 6. Revoke EXECUTE on SECURITY DEFINER helpers from public roles
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, PUBLIC;
-- has_role kept executable to authenticated because RLS policies reference it directly
