
REVOKE EXECUTE ON FUNCTION public.protect_proposal_immutable_fields() FROM anon, authenticated, PUBLIC;
-- has_role must remain callable by authenticated because RLS policies invoke it
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
