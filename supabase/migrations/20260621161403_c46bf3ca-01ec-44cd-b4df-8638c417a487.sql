-- CONTRACTS: add INSERT (participants + admin) and DELETE (admin only)
DROP POLICY IF EXISTS "Participants insert contract" ON public.contracts;
CREATE POLICY "Participants insert contract" ON public.contracts
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.proposals p
      WHERE p.id = contracts.proposal_id
        AND (p.tenant_id = auth.uid() OR p.owner_id = auth.uid())
    )
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Admin delete contract" ON public.contracts;
CREATE POLICY "Admin delete contract" ON public.contracts
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- INSPECTIONS: add DELETE (participants + admin)
DROP POLICY IF EXISTS "Participants delete inspections" ON public.inspections;
CREATE POLICY "Participants delete inspections" ON public.inspections
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.proposals p
      WHERE p.id = inspections.proposal_id
        AND (p.tenant_id = auth.uid() OR p.owner_id = auth.uid())
    )
    OR public.has_role(auth.uid(), 'admin')
  );

-- TICKETS: add DELETE (participants + admin)
DROP POLICY IF EXISTS "Participants delete tickets" ON public.tickets;
CREATE POLICY "Participants delete tickets" ON public.tickets
  FOR DELETE TO authenticated
  USING (
    auth.uid() = tenant_id
    OR auth.uid() = owner_id
    OR public.has_role(auth.uid(), 'admin')
  );

-- TICKET_MESSAGES: add UPDATE and DELETE (author + admin)
DROP POLICY IF EXISTS "Author updates own message" ON public.ticket_messages;
CREATE POLICY "Author updates own message" ON public.ticket_messages
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Author deletes own message" ON public.ticket_messages;
CREATE POLICY "Author deletes own message" ON public.ticket_messages
  FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- PROPOSALS: tighten INSERT — owner_id must match the property's actual owner
DROP POLICY IF EXISTS "Tenant creates own proposal" ON public.proposals;
CREATE POLICY "Tenant creates own proposal" ON public.proposals
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = tenant_id
    AND EXISTS (
      SELECT 1 FROM public.properties pr
      WHERE pr.id = proposals.property_id
        AND pr.owner_id = proposals.owner_id
    )
  );

-- STORAGE: drop public SELECT on property-images to prevent bucket listing.
-- Direct file access via the public bucket CDN still works because the bucket
-- itself is marked public; only the storage.objects listing API is blocked.
DROP POLICY IF EXISTS "property-images public read" ON storage.objects;
DROP POLICY IF EXISTS "property_images_public_read" ON storage.objects;