
-- inspections bucket: path = {proposal_id}/...
CREATE POLICY "Inspections read participants" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'inspections' AND EXISTS (
    SELECT 1 FROM public.proposals p
    WHERE p.id::text = split_part(name, '/', 1)
      AND (p.tenant_id = auth.uid() OR p.owner_id = auth.uid())
  ) OR (bucket_id = 'inspections' AND public.has_role(auth.uid(), 'admin')));

CREATE POLICY "Inspections write participants" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'inspections' AND EXISTS (
    SELECT 1 FROM public.proposals p
    WHERE p.id::text = split_part(name, '/', 1)
      AND (p.tenant_id = auth.uid() OR p.owner_id = auth.uid())
  ));

CREATE POLICY "Inspections delete participants" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'inspections' AND EXISTS (
    SELECT 1 FROM public.proposals p
    WHERE p.id::text = split_part(name, '/', 1)
      AND (p.tenant_id = auth.uid() OR p.owner_id = auth.uid())
  ));

-- ticket-attachments bucket: path = {ticket_id}/...
CREATE POLICY "Ticket files read participants" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'ticket-attachments' AND EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id::text = split_part(name, '/', 1)
      AND (t.tenant_id = auth.uid() OR t.owner_id = auth.uid())
  ) OR (bucket_id = 'ticket-attachments' AND public.has_role(auth.uid(), 'admin')));

CREATE POLICY "Ticket files write participants" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ticket-attachments' AND EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id::text = split_part(name, '/', 1)
      AND (t.tenant_id = auth.uid() OR t.owner_id = auth.uid())
  ));

-- contracts bucket: path = {proposal_id}/contract.pdf — only signed URLs; insert reserved to service role
CREATE POLICY "Contracts read participants" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'contracts' AND EXISTS (
    SELECT 1 FROM public.proposals p
    WHERE p.id::text = split_part(name, '/', 1)
      AND (p.tenant_id = auth.uid() OR p.owner_id = auth.uid())
  ) OR (bucket_id = 'contracts' AND public.has_role(auth.uid(), 'admin')));
