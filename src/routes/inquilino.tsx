import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getMyPassport, upsertMyPassport, type TenantPassport } from "@/lib/tenant.api";
import { listMyProposals, type ProposalRow } from "@/lib/proposals.api";
import { listMyTickets, createTicket, type TicketRow, type TicketCategory } from "@/lib/tickets.api";
import { TicketThread } from "@/components/TicketThread";

import { Wallet, Upload, KeyRound, Loader2, Plus } from "lucide-react";

export const Route = createFileRoute("/inquilino")({ component: Dashboard });

function Dashboard() {
  const [tab, setTab] = useState<"propostas" | "passaporte" | "chamados">("propostas");
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [userName, setUserName] = useState("Convidado");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setAuthed(!!data.user);
      setUserName(data.user?.user_metadata?.name ?? data.user?.email ?? "Convidado");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session?.user);
      setUserName(session?.user?.user_metadata?.name ?? session?.user?.email ?? "Convidado");
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const { data: proposals = [] } = useQuery({
    queryKey: ["proposals", "mine"],
    queryFn: listMyProposals,
    enabled: authed === true,
  });

  const escrowTotal = proposals
    .filter((p) => p.status === "escrow")
    .reduce((s, p) => s + Number(p.escrow_amount), 0);

  if (authed === false) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Acesso restrito</h1>
        <p className="mt-2 text-sm text-muted-foreground">Faça login para acessar o dashboard do inquilino.</p>
        <Link to="/entrar" search={{ redirect: "/inquilino" }} className="mt-6 inline-block rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
          Entrar
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard do Inquilino</h1>
          <p className="text-sm text-muted-foreground">Olá, {userName}.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary">
          <Wallet className="h-4 w-4" /> Escrow: R$ {escrowTotal.toLocaleString("pt-BR")}
        </div>
      </header>

      <nav className="mt-6 flex gap-1 overflow-x-auto border-b">
        {[
          { k: "propostas", l: "Propostas" },
          { k: "passaporte", l: "Passaporte" },
          { k: "chamados", l: "Chamados" },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k as typeof tab)}
            className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium ${
              tab === t.k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.l}
          </button>
        ))}
      </nav>

      <div className="mt-6">
        {tab === "propostas" && <Propostas proposals={proposals} />}
        {tab === "passaporte" && <Passaporte />}
        {tab === "chamados" && <Chamados proposals={proposals} />}
      </div>
    </main>
  );
}

function Propostas({ proposals }: { proposals: ProposalRow[] }) {
  if (proposals.length === 0) return <Empty msg="Nenhuma proposta ainda. Explore o catálogo." />;
  return (
    <div className="space-y-3">
      {proposals.map((pr) => {
        const snap = (pr.property_snapshot ?? {}) as { title?: string; neighborhood?: string; image?: string };
        return (
          <div key={pr.id} className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4">
            <img src={snap.image ?? ""} alt="" className="h-16 w-24 rounded-md object-cover bg-muted" />
            <div className="flex-1 min-w-[200px]">
              <p className="font-semibold">{snap.title ?? "Imóvel"}</p>
              <p className="text-xs text-muted-foreground">{snap.neighborhood ?? "—"}</p>
            </div>
            <StatusBadge s={pr.status} />
            <Link to="/contrato/$id" params={{ id: pr.id }} className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
              Abrir contrato
            </Link>
          </div>
        );
      })}
    </div>
  );
}

function StatusBadge({ s }: { s: string }) {
  const map: Record<string, string> = {
    pending: "Pendente",
    accepted: "Aceita",
    rejected: "Rejeitada",
    signed: "Assinada",
    escrow: "Em Escrow",
    active: "Ativa",
    ended: "Encerrada",
    cancelled: "Cancelada",
  };
  return <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium">{map[s] ?? s}</span>;
}

function Empty({ msg }: { msg: string }) {
  return <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">{msg}</div>;
}

function Passaporte() {
  const qc = useQueryClient();
  const { data: passport, isLoading } = useQuery({
    queryKey: ["passport", "mine"],
    queryFn: getMyPassport,
  });
  const [hasFile, setHasFile] = useState(false);
  const [pendingScore, setPendingScore] = useState(750);
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    if (passport?.full_name) setFullName(passport.full_name);
    if (passport?.credit_score) setPendingScore(passport.credit_score);
    if (passport) setHasFile(true);
  }, [passport]);

  const save = useMutation({
    mutationFn: () => upsertMyPassport({ full_name: fullName || "Inquilino", credit_score: pendingScore }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["passport"] }),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-10 text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...</div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-xl border bg-card p-6">
        <KeyRound className="h-6 w-6 text-primary" />
        <h2 className="mt-2 font-semibold">Passaporte do Inquilino</h2>
        <p className="mt-1 text-sm text-muted-foreground">Envie seu relatório Serasa (PDF fictício) e valide seu crédito.</p>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Seu nome completo"
          className="mt-4 w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
        <button
          onClick={() => setHasFile(true)}
          className={`mt-3 inline-flex items-center gap-2 rounded-md border-2 border-dashed px-4 py-3 text-sm font-medium ${
            hasFile ? "border-success text-success bg-success/5" : "hover:bg-secondary"
          }`}
        >
          <Upload className="h-4 w-4" /> {hasFile ? "serasa.pdf ✓" : "Selecionar PDF"}
        </button>
        {hasFile && (
          <div className="mt-4 space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Simular score: <b className="text-primary">{pendingScore}</b></span>
              <input type="range" min={400} max={950} step={10} value={pendingScore} onChange={(e) => setPendingScore(+e.target.value)} className="w-full" />
            </label>
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending || !fullName.trim()}
              className="w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {save.isPending ? "Enviando..." : "Enviar para análise"}
            </button>
          </div>
        )}
      </div>

      <PassaporteStatus passport={passport ?? null} />
    </div>
  );
}

function PassaporteStatus({ passport }: { passport: TenantPassport | null }) {
  if (!passport || passport.credit_score == null) {
    return (
      <div className="rounded-xl border bg-card p-6">
        <h2 className="font-semibold">Status atual</h2>
        <p className="mt-2 text-sm text-muted-foreground">Nenhum passaporte enviado ainda.</p>
      </div>
    );
  }
  const approved = passport.credit_status === "aprovado" && passport.credit_score >= 700;
  const pending = passport.doc_status === "pending";
  return (
    <div className="rounded-xl border bg-card p-6">
      <h2 className="font-semibold">Status atual</h2>
      {approved ? (
        <div className="mt-3 rounded-lg border border-success/30 bg-success/10 p-4">
          <p className="text-2xl font-bold text-success">{passport.credit_score}</p>
          <p className="mt-1 font-semibold text-success">Passaporte Aprovado</p>
          <p className="mt-1 text-xs text-muted-foreground">Você está isento da caução adicional.</p>
        </div>
      ) : pending ? (
        <div className="mt-3 rounded-lg border border-warning/30 bg-warning/10 p-4">
          <p className="text-2xl font-bold">{passport.credit_score}</p>
          <p className="mt-1 font-semibold text-warning-foreground">Em análise pelo admin</p>
          <p className="mt-1 text-xs text-muted-foreground">Aguardando aprovação manual. Score &lt; 700 exigirá caução adicional.</p>
        </div>
      ) : passport.credit_status === "reprovado" ? (
        <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
          <p className="text-2xl font-bold text-destructive">{passport.credit_score}</p>
          <p className="mt-1 font-semibold text-destructive">Passaporte reprovado</p>
          <p className="mt-1 text-xs text-muted-foreground">Reenvie um novo relatório para nova análise.</p>
        </div>
      ) : (
        <div className="mt-3 rounded-lg border bg-muted/20 p-4">
          <p className="text-2xl font-bold">{passport.credit_score}</p>
          <p className="mt-1 text-xs text-muted-foreground">Status: {passport.credit_status}</p>
        </div>
      )}
    </div>
  );
}

const CATEGORIES: { v: TicketCategory; l: string }[] = [
  { v: "manutencao", l: "Manutenção" },
  { v: "financeiro", l: "Financeiro" },
  { v: "convivencia", l: "Convivência" },
  { v: "outros", l: "Outros" },
];

function Chamados({ proposals }: { proposals: ProposalRow[] }) {
  const qc = useQueryClient();
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["tickets", "mine"],
    queryFn: listMyTickets,
  });

  const activeProposals = proposals.filter((p) => ["active", "escrow", "signed"].includes(p.status));

  const [open, setOpen] = useState(false);
  const [proposalId, setProposalId] = useState("");
  const [category, setCategory] = useState<TicketCategory>("manutencao");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const create = useMutation({
    mutationFn: () => createTicket({ proposalId, title, description, category }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
      setOpen(false); setTitle(""); setDescription("");
    },
  });

  if (activeProposals.length === 0 && tickets.length === 0) {
    return <Empty msg="Você precisa de uma locação ativa para abrir chamados." />;
  }

  return (
    <div className="space-y-4">
      {!open ? (
        <button
          onClick={() => { setOpen(true); setProposalId(activeProposals[0]?.id ?? ""); }}
          disabled={activeProposals.length === 0}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Abrir chamado
        </button>
      ) : (
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <h2 className="font-semibold">Novo chamado</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <select value={proposalId} onChange={(e) => setProposalId(e.target.value)} className="rounded-md border bg-background px-3 py-2 text-sm">
              {activeProposals.map((p) => {
                const s = p.property_snapshot as { title?: string };
                return <option key={p.id} value={p.id}>{s.title ?? p.id.slice(0, 8)}</option>;
              })}
            </select>
            <select value={category} onChange={(e) => setCategory(e.target.value as TicketCategory)} className="rounded-md border bg-background px-3 py-2 text-sm">
              {CATEGORIES.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
            </select>
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título: ex. Infiltração no teto"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Descreva o problema..."
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button onClick={() => setOpen(false)} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-secondary">Cancelar</button>
            <button
              onClick={() => create.mutate()}
              disabled={!title || !proposalId || create.isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {create.isPending ? "Abrindo..." : "Abrir chamado"}
            </button>
          </div>
        </div>
      )}

      {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      <div className="space-y-3">
        {tickets.length === 0 && !isLoading && <Empty msg="Nenhum chamado aberto." />}
        {tickets.map((t: TicketRow) => <TicketThread key={t.id} ticket={t} />)}
      </div>
    </div>
  );
}
