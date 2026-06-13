import { supabase } from "@/integrations/supabase/client";
import type { Tables, Database } from "@/integrations/supabase/types";

export type TicketRow = Tables<"tickets">;
export type TicketMessageRow = Tables<"ticket_messages">;
export type TicketCategory = Database["public"]["Enums"]["ticket_category"];
export type TicketStatus = Database["public"]["Enums"]["ticket_status"];
export type TicketPriority = Database["public"]["Enums"]["ticket_priority"];

export async function listMyTickets(): Promise<TicketRow[]> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return [];
  const { data, error } = await supabase
    .from("tickets")
    .select("*")
    .eq("tenant_id", u.user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listTicketsForOwner(): Promise<TicketRow[]> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return [];
  const { data, error } = await supabase
    .from("tickets")
    .select("*")
    .eq("owner_id", u.user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listAllTickets(): Promise<TicketRow[]> {
  const { data, error } = await supabase
    .from("tickets")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createTicket(input: {
  proposalId: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority?: TicketPriority;
}): Promise<TicketRow> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Você precisa estar autenticado.");

  // load proposal to snapshot owner_id
  const { data: pr, error: prErr } = await supabase
    .from("proposals")
    .select("owner_id, tenant_id")
    .eq("id", input.proposalId)
    .maybeSingle();
  if (prErr) throw prErr;
  if (!pr) throw new Error("Proposta não encontrada.");

  const { data, error } = await supabase
    .from("tickets")
    .insert({
      proposal_id: input.proposalId,
      tenant_id: pr.tenant_id,
      owner_id: pr.owner_id,
      title: input.title,
      description: input.description,
      category: input.category,
      priority: input.priority ?? "media",
      status: "aberto",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function getTicket(id: string) {
  const { data, error } = await supabase
    .from("tickets")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listMessages(ticketId: string): Promise<TicketMessageRow[]> {
  const { data, error } = await supabase
    .from("ticket_messages")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function postMessage(
  ticketId: string,
  body: string,
  attachments: string[] = [],
): Promise<TicketMessageRow> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Você precisa estar autenticado.");
  const { data, error } = await supabase
    .from("ticket_messages")
    .insert({
      ticket_id: ticketId,
      author_id: u.user.id,
      body,
      attachments,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateTicketStatus(id: string, status: TicketStatus) {
  const { error } = await supabase.from("tickets").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function uploadTicketAttachment(ticketId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${ticketId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("ticket-attachments")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}

export async function getAttachmentUrl(path: string) {
  const { data, error } = await supabase.storage
    .from("ticket-attachments")
    .createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}
