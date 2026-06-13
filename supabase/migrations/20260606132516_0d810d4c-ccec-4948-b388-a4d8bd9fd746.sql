
-- Enums
CREATE TYPE public.passport_credit_status AS ENUM ('pendente', 'aprovado', 'reprovado');
CREATE TYPE public.passport_doc_status AS ENUM ('none', 'pending', 'approved', 'rejected');
CREATE TYPE public.proposal_status AS ENUM ('pending', 'accepted', 'rejected', 'signed', 'escrow', 'active', 'ended', 'cancelled');

-- =========== tenant_passport ===========
CREATE TABLE public.tenant_passport (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  cpf text,
  credit_score integer,
  credit_status public.passport_credit_status NOT NULL DEFAULT 'pendente',
  doc_status public.passport_doc_status NOT NULL DEFAULT 'none',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_passport TO authenticated;
GRANT ALL ON public.tenant_passport TO service_role;

ALTER TABLE public.tenant_passport ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own passport or admin reads all"
  ON public.tenant_passport FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users insert own passport"
  ON public.tenant_passport FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own passport or admin updates all"
  ON public.tenant_passport FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete passports"
  ON public.tenant_passport FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_tenant_passport_updated_at
  BEFORE UPDATE ON public.tenant_passport
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========== proposals ===========
CREATE TABLE public.proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  status public.proposal_status NOT NULL DEFAULT 'pending',
  monthly_price numeric NOT NULL DEFAULT 0,
  deposit numeric NOT NULL DEFAULT 0,
  extra_deposit numeric NOT NULL DEFAULT 0,
  escrow_amount numeric NOT NULL DEFAULT 0,
  property_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  signature_name text,
  checked_in boolean NOT NULL DEFAULT false,
  checked_in_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_proposals_tenant ON public.proposals(tenant_id);
CREATE INDEX idx_proposals_owner ON public.proposals(owner_id);
CREATE INDEX idx_proposals_property ON public.proposals(property_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposals TO authenticated;
GRANT ALL ON public.proposals TO service_role;

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant/owner/admin read proposals"
  ON public.proposals FOR SELECT TO authenticated
  USING (
    auth.uid() = tenant_id
    OR auth.uid() = owner_id
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Tenant creates own proposal"
  ON public.proposals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = tenant_id);

CREATE POLICY "Tenant/owner/admin update proposals"
  ON public.proposals FOR UPDATE TO authenticated
  USING (
    auth.uid() = tenant_id
    OR auth.uid() = owner_id
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    auth.uid() = tenant_id
    OR auth.uid() = owner_id
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Tenant/admin delete proposals"
  ON public.proposals FOR DELETE TO authenticated
  USING (auth.uid() = tenant_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_proposals_updated_at
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
