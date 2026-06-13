
-- Enums
CREATE TYPE public.inspection_type AS ENUM ('checkin', 'checkout');
CREATE TYPE public.ticket_category AS ENUM ('manutencao', 'financeiro', 'convivencia', 'outros');
CREATE TYPE public.ticket_status AS ENUM ('aberto', 'em_andamento', 'resolvido', 'escalado');
CREATE TYPE public.ticket_priority AS ENUM ('baixa', 'media', 'alta');
CREATE TYPE public.dispute_status AS ENUM ('aberta', 'mediando', 'resolvida');

-- inspections
CREATE TABLE public.inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  type public.inspection_type NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  photos text[] NOT NULL DEFAULT '{}',
  signed_by_tenant_at timestamptz,
  signed_by_owner_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (proposal_id, type)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspections TO authenticated;
GRANT ALL ON public.inspections TO service_role;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read inspections" ON public.inspections FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = inspections.proposal_id
    AND (p.tenant_id = auth.uid() OR p.owner_id = auth.uid())) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Participants insert inspections" ON public.inspections FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = inspections.proposal_id
    AND (p.tenant_id = auth.uid() OR p.owner_id = auth.uid())) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Participants update inspections" ON public.inspections FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = inspections.proposal_id
    AND (p.tenant_id = auth.uid() OR p.owner_id = auth.uid())) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = inspections.proposal_id
    AND (p.tenant_id = auth.uid() OR p.owner_id = auth.uid())) OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_inspections_updated_at BEFORE UPDATE ON public.inspections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- tickets
CREATE TABLE public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  category public.ticket_category NOT NULL DEFAULT 'outros',
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  status public.ticket_status NOT NULL DEFAULT 'aberto',
  priority public.ticket_priority NOT NULL DEFAULT 'media',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tickets TO authenticated;
GRANT ALL ON public.tickets TO service_role;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read tickets" ON public.tickets FOR SELECT TO authenticated
  USING (auth.uid() = tenant_id OR auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Tenant creates ticket" ON public.tickets FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = tenant_id);
CREATE POLICY "Participants update tickets" ON public.tickets FOR UPDATE TO authenticated
  USING (auth.uid() = tenant_id OR auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = tenant_id OR auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ticket_messages
CREATE TABLE public.ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  body text NOT NULL,
  attachments text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ticket_messages TO authenticated;
GRANT ALL ON public.ticket_messages TO service_role;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read messages" ON public.ticket_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_messages.ticket_id
    AND (t.tenant_id = auth.uid() OR t.owner_id = auth.uid())) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Participants post messages" ON public.ticket_messages FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND (EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_messages.ticket_id
    AND (t.tenant_id = auth.uid() OR t.owner_id = auth.uid())) OR public.has_role(auth.uid(), 'admin')));

-- disputes
CREATE TABLE public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  opened_by uuid NOT NULL,
  reason text NOT NULL,
  status public.dispute_status NOT NULL DEFAULT 'aberta',
  resolution text,
  escrow_split jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.disputes TO authenticated;
GRANT ALL ON public.disputes TO service_role;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read disputes" ON public.disputes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = disputes.proposal_id
    AND (p.tenant_id = auth.uid() OR p.owner_id = auth.uid())) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Participants open dispute" ON public.disputes FOR INSERT TO authenticated
  WITH CHECK (opened_by = auth.uid() AND EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = disputes.proposal_id
    AND (p.tenant_id = auth.uid() OR p.owner_id = auth.uid())));
CREATE POLICY "Admin resolves dispute" ON public.disputes FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_disputes_updated_at BEFORE UPDATE ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- contracts
CREATE TABLE public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL UNIQUE REFERENCES public.proposals(id) ON DELETE CASCADE,
  pdf_path text NOT NULL,
  pdf_hash text NOT NULL,
  signed_by_tenant boolean NOT NULL DEFAULT false,
  signed_by_owner boolean NOT NULL DEFAULT false,
  signed_by_tenant_at timestamptz,
  signed_by_owner_at timestamptz,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.contracts TO authenticated;
GRANT ALL ON public.contracts TO service_role;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read contract" ON public.contracts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = contracts.proposal_id
    AND (p.tenant_id = auth.uid() OR p.owner_id = auth.uid())) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Participants sign contract" ON public.contracts FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = contracts.proposal_id
    AND (p.tenant_id = auth.uid() OR p.owner_id = auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = contracts.proposal_id
    AND (p.tenant_id = auth.uid() OR p.owner_id = auth.uid())));
CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
