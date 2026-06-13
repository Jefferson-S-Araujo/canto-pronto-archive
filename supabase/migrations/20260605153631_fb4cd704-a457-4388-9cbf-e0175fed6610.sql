
-- Enum para status e certificação
DO $$ BEGIN
  CREATE TYPE public.property_status AS ENUM ('draft','published','paused');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.property_certification AS ENUM ('parede_seca','pendente','atencao');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Tabela properties
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  address TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  deposit NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (deposit >= 0),
  area INTEGER NOT NULL DEFAULT 0 CHECK (area >= 0),
  bedrooms INTEGER NOT NULL DEFAULT 0 CHECK (bedrooms >= 0),
  bathrooms INTEGER NOT NULL DEFAULT 0 CHECK (bathrooms >= 0),
  image TEXT NOT NULL DEFAULT '',
  amenities TEXT[] NOT NULL DEFAULT '{}',
  certification public.property_certification NOT NULL DEFAULT 'pendente',
  score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  status public.property_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_properties_owner ON public.properties(owner_id);
CREATE INDEX idx_properties_status ON public.properties(status);
CREATE INDEX idx_properties_neighborhood ON public.properties(neighborhood);

-- GRANTS
GRANT SELECT ON public.properties TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.properties TO authenticated;
GRANT ALL ON public.properties TO service_role;

-- RLS
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Anyone (anon or auth) can read published properties
CREATE POLICY "Anyone reads published properties"
ON public.properties FOR SELECT
TO anon, authenticated
USING (status = 'published' OR auth.uid() = owner_id OR public.has_role(auth.uid(),'admin'));

-- Owner can manage their own
CREATE POLICY "Owners manage own properties (insert)"
ON public.properties FOR INSERT TO authenticated
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners manage own properties (update)"
ON public.properties FOR UPDATE TO authenticated
USING (auth.uid() = owner_id OR public.has_role(auth.uid(),'admin'))
WITH CHECK (auth.uid() = owner_id OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Owners manage own properties (delete)"
ON public.properties FOR DELETE TO authenticated
USING (auth.uid() = owner_id OR public.has_role(auth.uid(),'admin'));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_properties_updated_at
BEFORE UPDATE ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
