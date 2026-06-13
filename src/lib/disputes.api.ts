import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type DisputeRow = Tables<"disputes">;

export async function listDisputes(): Promise<DisputeRow[]> {
  const { data, error } = await supabase
    .from("disputes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listMyDisputes(): Promise<DisputeRow[]> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return [];
  const { data, error } = await supabase
    .from("disputes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function openDispute(input: { proposalId: string; reason: string }) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Você precisa estar autenticado.");
  const { data, error } = await supabase
    .from("disputes")
    .insert({
      proposal_id: input.proposalId,
      opened_by: u.user.id,
      reason: input.reason,
      status: "aberta",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function resolveDispute(input: {
  id: string;
  resolution: string;
  split: { tenant: number; owner: number };
}) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Você precisa estar autenticado.");
  const { error } = await supabase
    .from("disputes")
    .update({
      status: "resolvida",
      resolution: input.resolution,
      escrow_split: input.split,
      resolved_by: u.user.id,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", input.id);
  if (error) throw error;
}

export async function setDisputeMediating(id: string) {
  const { error } = await supabase
    .from("disputes")
    .update({ status: "mediando" })
    .eq("id", id);
  if (error) throw error;
}
