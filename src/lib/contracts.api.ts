import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type ContractRow = Tables<"contracts">;

export async function getContract(proposalId: string): Promise<ContractRow | null> {
  const { data, error } = await supabase
    .from("contracts")
    .select("*")
    .eq("proposal_id", proposalId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getContractSignedUrl(path: string) {
  const { data, error } = await supabase.storage
    .from("contracts")
    .createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

export async function markContractSigned(
  contractId: string,
  role: "tenant" | "owner",
) {
  const patch =
    role === "tenant"
      ? { signed_by_tenant: true, signed_by_tenant_at: new Date().toISOString() }
      : { signed_by_owner: true, signed_by_owner_at: new Date().toISOString() };
  const { error } = await supabase
    .from("contracts")
    .update(patch)
    .eq("id", contractId);
  if (error) throw error;
}
