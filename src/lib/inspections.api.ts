import { supabase } from "@/integrations/supabase/client";
import type { Tables, Database } from "@/integrations/supabase/types";

export type InspectionRow = Tables<"inspections">;
export type InspectionType = Database["public"]["Enums"]["inspection_type"];

export type InspectionItem = {
  room: string;
  label: string;
  status: "ok" | "atencao" | "avaria";
  note?: string;
  photos?: string[];
};

export const DEFAULT_INSPECTION_ITEMS: InspectionItem[] = [
  { room: "Sala", label: "Paredes / pintura", status: "ok" },
  { room: "Sala", label: "Piso", status: "ok" },
  { room: "Cozinha", label: "Pia / torneira", status: "ok" },
  { room: "Cozinha", label: "Eletrodomésticos", status: "ok" },
  { room: "Quarto", label: "Janelas / vidros", status: "ok" },
  { room: "Quarto", label: "Armários", status: "ok" },
  { room: "Banheiro", label: "Box / vaso / pia", status: "ok" },
  { room: "Banheiro", label: "Azulejos / rejunte", status: "ok" },
  { room: "Geral", label: "Instalações elétricas", status: "ok" },
  { room: "Geral", label: "Limpeza geral", status: "ok" },
];

export async function getInspection(proposalId: string, type: InspectionType) {
  const { data, error } = await supabase
    .from("inspections")
    .select("*")
    .eq("proposal_id", proposalId)
    .eq("type", type)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertInspection(input: {
  proposalId: string;
  type: InspectionType;
  items: InspectionItem[];
  photos: string[];
}): Promise<InspectionRow> {
  const { data, error } = await supabase
    .from("inspections")
    .upsert(
      {
        proposal_id: input.proposalId,
        type: input.type,
        items: input.items as unknown as Database["public"]["Tables"]["inspections"]["Insert"]["items"],
        photos: input.photos,
      },
      { onConflict: "proposal_id,type" },
    )
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function signInspection(
  id: string,
  role: "tenant" | "owner",
): Promise<InspectionRow> {
  const patch =
    role === "tenant"
      ? { signed_by_tenant_at: new Date().toISOString() }
      : { signed_by_owner_at: new Date().toISOString() };
  const { data, error } = await supabase
    .from("inspections")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function uploadInspectionPhoto(
  proposalId: string,
  file: File,
): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${proposalId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("inspections")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}

export async function getInspectionPhotoUrl(path: string) {
  const { data, error } = await supabase.storage
    .from("inspections")
    .createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

export async function listPendingInspectionsForOwner() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return [];
  // proposals where I'm owner
  const { data: props, error } = await supabase
    .from("proposals")
    .select("id, status, property_snapshot, inspections(*)")
    .eq("owner_id", u.user.id);
  if (error) throw error;
  return props ?? [];
}
