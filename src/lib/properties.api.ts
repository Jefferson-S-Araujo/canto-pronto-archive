import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type PropertyRow = Tables<"properties">;
export type PropertyInsert = TablesInsert<"properties">;

export async function listPublishedProperties(): Promise<PropertyRow[]> {
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getPropertyById(id: string): Promise<PropertyRow | null> {
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listMyProperties(): Promise<PropertyRow[]> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return [];
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("owner_id", uid)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createProperty(
  input: Omit<PropertyInsert, "owner_id" | "id" | "created_at" | "updated_at">,
): Promise<PropertyRow> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("Você precisa estar autenticado.");
  const { data, error } = await supabase
    .from("properties")
    .insert({ ...input, owner_id: uid })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updatePropertyCertification(
  id: string,
  certification: PropertyRow["certification"],
  score: number,
) {
  const { error } = await supabase
    .from("properties")
    .update({ certification, score })
    .eq("id", id);
  if (error) throw error;
}

export async function updatePropertyStatus(id: string, status: PropertyRow["status"]) {
  const { error } = await supabase.from("properties").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function deleteProperty(id: string) {
  const { error } = await supabase.from("properties").delete().eq("id", id);
  if (error) throw error;
}
