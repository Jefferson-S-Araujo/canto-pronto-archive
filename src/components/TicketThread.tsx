import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAttachmentUrl, listMessages, postMessage, updateTicketStatus, uploadTicketAttachment, type TicketRow, type TicketStatus } from "@/lib/tickets.api";
import { Paperclip, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

const STATUS_OPTIONS: { v: TicketStatus; l: string }[] = [
  { v: "aberto", l: "Aberto" },
  { v: "em_andamento", l: "Em andamento" },
  { v: "resolvido", l: "Resolvido" },
  { v: "escalado", l: "Escalado" },
];

export function TicketThread({ ticket }: { ticket: TicketRow }) {
  const qc = useQueryClient();
  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null)); }, []);

  const { data: msgs = [], isLoading } = useQuery({
    queryKey: ["ticket-msgs", ticket.id],
    queryFn: () => listMessages(ticket.id),
  });

  const [body, setBody] = useState("");
  const [attachment, setAttachment] = useState<string | null>(null);

  const upload = useMutation({
    mutationFn: (file: File) => uploadTicketAttachment(ticket.id, file),
    onSuccess: (path) => setAttachment(path),
  });

  const send = useMutation({
    mutationFn: () => postMessage(ticket.id, body, attachment ? [attachment] : []),
    onSuccess: () => {
      setBody(""); setAttachment(null);
      qc.invalidateQueries({ queryKey: ["ticket-msgs", ticket.id] });
    },
  });

  const setStatus = useMutation({
    mutationFn: (s: TicketStatus) => updateTicketStatus(ticket.id, s),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tickets"] }),
  });

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold">{ticket.title}</p>
          <p className="text-xs text-muted-foreground">
            {ticket.category} · Prioridade {ticket.priority}
          </p>
        </div>
        <select
          value={ticket.status}
          onChange={(e) => setStatus.mutate(e.target.value as TicketStatus)}
          className="rounded-md border bg-background px-2 py-1 text-xs"
        >
          {STATUS_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
      </div>
      {ticket.description && <p className="mt-2 rounded-md bg-muted/40 p-3 text-sm">{ticket.description}</p>}

      <div className="mt-4 space-y-2 max-h-72 overflow-y-auto">
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        {!isLoading && msgs.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhuma mensagem ainda.</p>
        )}
        {msgs.map((m) => {
          const mine = m.author_id === uid;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                <p className="whitespace-pre-wrap">{m.body}</p>
                {m.attachments.map((a) => <AttachmentLink key={a} path={a} />)}
                <p className={`mt-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {new Date(m.created_at).toLocaleString("pt-BR")}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          placeholder="Escreva uma mensagem..."
          className="min-w-[200px] flex-1 rounded-md border bg-background px-3 py-2 text-sm"
        />
        <label className="cursor-pointer rounded-md border p-2 text-xs hover:bg-secondary">
          <input
            type="file"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = ""; }}
          />
          {upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
        </label>
        <button
          onClick={() => send.mutate()}
          disabled={!body.trim() || send.isPending}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          <Send className="h-4 w-4" /> Enviar
        </button>
        {attachment && <span className="text-xs text-success">anexo pronto ✓</span>}
      </div>
    </div>
  );
}

function AttachmentLink({ path }: { path: string }) {
  const { data } = useQuery({
    queryKey: ["ticket-att", path],
    queryFn: () => getAttachmentUrl(path),
    staleTime: 1000 * 60 * 30,
  });
  if (!data) return null;
  return (
    <a href={data} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs underline">
      <Paperclip className="h-3 w-3" /> anexo
    </a>
  );
}
