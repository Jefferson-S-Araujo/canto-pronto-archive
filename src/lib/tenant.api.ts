import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type TenantPassport = Tables<"tenant_passport">;
export type TenantPassportInsert = TablesInsert<"tenant_passport">;

export async function getMyPassport(): Promise<TenantPassport | null> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return null;
  const { data, error } = await supabase
    .from("tenant_passport")
    .select("*")
    .eq("user_id", uid)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertMyPassport(input: {
  full_name: string;
  credit_score: number;
}): Promise<TenantPassport> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("Você precisa estar autenticado.");
  const { data, error } = await supabase
    .from("tenant_passport")
    .upsert(
      {
        user_id: uid,
        full_name: input.full_name,
        credit_score: input.credit_score,
        doc_status: "pending",
        credit_status: "pendente",
      },
      { onConflict: "user_id" },
    )
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listPendingPassports(): Promise<TenantPassport[]> {
  const { data, error } = await supabase
    .from("tenant_passport")
    .select("*")
    .or("doc_status.eq.pending,credit_status.eq.pendente")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function approvePassport(userId: string) {
  const { error } = await supabase
    .from("tenant_passport")
    .update({ doc_status: "approved", credit_status: "aprovado" })
    .eq("user_id", userId);
  if (error) throw error;
}

export async function rejectPassport(userId: string) {
  const { error } = await supabase
    .from("tenant_passport")
    .update({ doc_status: "rejected", credit_status: "reprovado" })
    .eq("user_id", userId);
  if (error) throw error;
}
