import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type ProposalRow = Tables<"proposals">;

export type PropertySnapshot = {
  title: string;
  neighborhood: string;
  image: string;
  price: number;
  deposit: number;
};

export async function createProposal(input: {
  propertyId: string;
  snapshot: PropertySnapshot;
  extraDeposit: number;
}): Promise<ProposalRow> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("Você precisa estar autenticado para fazer uma proposta.");

  // Buscar owner_id real do imóvel
  const { data: prop, error: propErr } = await supabase
    .from("properties")
    .select("owner_id")
    .eq("id", input.propertyId)
    .maybeSingle();
  if (propErr) throw propErr;
  if (!prop) throw new Error("Imóvel não encontrado.");

  const escrow_amount = input.snapshot.price + input.snapshot.deposit + input.extraDeposit;

  const { data, error } = await supabase
    .from("proposals")
    .insert({
      property_id: input.propertyId,
      tenant_id: uid,
      owner_id: prop.owner_id,
      status: "pending",
      monthly_price: input.snapshot.price,
      deposit: input.snapshot.deposit,
      extra_deposit: input.extraDeposit,
      escrow_amount,
      property_snapshot: input.snapshot,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listMyProposals(): Promise<ProposalRow[]> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return [];
  const { data, error } = await supabase
    .from("proposals")
    .select("*")
    .eq("tenant_id", uid)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listProposalsForMyProperties(): Promise<ProposalRow[]> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return [];
  const { data, error } = await supabase
    .from("proposals")
    .select("*")
    .eq("owner_id", uid)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listAllProposals(): Promise<ProposalRow[]> {
  const { data, error } = await supabase
    .from("proposals")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getProposal(id: string): Promise<ProposalRow | null> {
  const { data, error } = await supabase
    .from("proposals")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function signProposal(id: string, signature: string) {
  const { error } = await supabase
    .from("proposals")
    .update({ status: "escrow", signature_name: signature })
    .eq("id", id);
  if (error) throw error;
}

export async function confirmCheckin(id: string) {
  const { error } = await supabase
    .from("proposals")
    .update({ status: "active", checked_in: true, checked_in_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function acceptProposal(id: string) {
  const { error } = await supabase.from("proposals").update({ status: "accepted" }).eq("id", id);
  if (error) throw error;
}

export async function rejectProposal(id: string) {
  const { error } = await supabase.from("proposals").update({ status: "rejected" }).eq("id", id);
  if (error) throw error;
}

export async function cancelProposal(id: string) {
  const { error } = await supabase.from("proposals").update({ status: "cancelled" }).eq("id", id);
  if (error) throw error;
}
