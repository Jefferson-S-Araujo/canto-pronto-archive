import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { requireAdmin } from "@/lib/auth.functions";
import {
  listPendingPassports,
  approvePassport,
  rejectPassport,
} from "@/lib/tenant.api";
import {
  listAllProposals,
  acceptProposal,
  rejectProposal,
} from "@/lib/proposals.api";
import { listAllTickets } from "@/lib/tickets.api";
import { listDisputes, resolveDispute, setDisputeMediating } from "@/lib/disputes.api";
import { TicketThread } from "@/components/TicketThread";
import { ShieldCheck, Gavel, UserCheck, XCircle, FileText, Loader2, Wrench, KeyRound, Receipt, CalendarClock, LifeBuoy, Check, X, Eye, Download, UserPlus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/entrar", search: { redirect: location.href } as never });
    }
    try {
      await requireAdmin();
    } catch {
      throw redirect({
        to: "/acesso-negado",
        search: { reason: "not_admin", from: location.pathname } as never,
      });
    }
  },
  component: Admin,
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-md p-10 text-center">
      <h1 className="text-xl font-semibold">Erro</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
    </main>
  ),
});

function Admin() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"passports" | "proposals" | "tickets" | "disputes" | "seguranca" | "contratos" | "visitas" | "suporte" | "aprovacoes">("passports");

  const safe = <T,>(fn: () => Promise<T>, fallback: T) => async () => {
    try { return await fn(); } catch { return fallback; }
  };
  const { data: passports = [], isLoading: passLoading } = useQuery({
    queryKey: ["admin", "passports", "pending"],
    queryFn: safe(listPendingPassports, [] as Awaited<ReturnType<typeof listPendingPassports>>),
  });
  const { data: proposals = [], isLoading: propLoading } = useQuery({
    queryKey: ["admin", "proposals"],
    queryFn: safe(listAllProposals, [] as Awaited<ReturnType<typeof listAllProposals>>),
  });
  const { data: tickets = [] } = useQuery({
    queryKey: ["admin", "tickets"],
    queryFn: safe(listAllTickets, [] as Awaited<ReturnType<typeof listAllTickets>>),
  });
  const { data: disputes = [] } = useQuery({
    queryKey: ["admin", "disputes"],
    queryFn: safe(listDisputes, [] as Awaited<ReturnType<typeof listDisputes>>),
  });

  const approve = useMutation({
    mutationFn: (uid: string) => approvePassport(uid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "passports"] }),
  });
  const reject = useMutation({
    mutationFn: (uid: string) => rejectPassport(uid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "passports"] }),
  });
  const accept = useMutation({
    mutationFn: (id: string) => acceptProposal(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "proposals"] }),
  });
  const rejectProp = useMutation({
    mutationFn: (id: string) => rejectProposal(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "proposals"] }),
  });

  const resolveD = useMutation({
    mutationFn: (input: { id: string; resolution: string; split: { tenant: number; owner: number } }) => resolveDispute(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "disputes"] }),
  });
  const mediate = useMutation({
    mutationFn: (id: string) => setDisputeMediating(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "disputes"] }),
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Backoffice — Administração</h1>
          <p className="text-sm text-muted-foreground">Passaportes, propostas, chamados e mediação humana.</p>
        </div>
        <button
          onClick={async () => { await supabase.auth.signOut(); window.location.href = "/"; }}
          className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
        >
          Sair
        </button>
      </div>

      <nav className="mt-6 flex gap-1 border-b overflow-x-auto">
        <TabBtn active={tab === "passports"} onClick={() => setTab("passports")}>
          Passaportes ({passports.length})
        </TabBtn>
        <TabBtn active={tab === "proposals"} onClick={() => setTab("proposals")}>
          Propostas ({proposals.length})
        </TabBtn>
        <TabBtn active={tab === "tickets"} onClick={() => setTab("tickets")}>
          Chamados ({tickets.length})
        </TabBtn>
        <TabBtn active={tab === "disputes"} onClick={() => setTab("disputes")}>
          Disputas ({disputes.filter((d) => d.status !== "resolvida").length})
        </TabBtn>
        <TabBtn active={tab === "aprovacoes"} onClick={() => setTab("aprovacoes")}>Aprovação de Cadastros</TabBtn>
        <TabBtn active={tab === "contratos"} onClick={() => setTab("contratos")}>Contratos</TabBtn>
        <TabBtn active={tab === "visitas"} onClick={() => setTab("visitas")}>Visitas</TabBtn>
        <TabBtn active={tab === "suporte"} onClick={() => setTab("suporte")}>Suporte</TabBtn>
        <TabBtn active={tab === "seguranca"} onClick={() => setTab("seguranca")}>Segurança</TabBtn>
      </nav>

      <div className="mt-6">
        {tab === "passports" && (
          <div className="space-y-3">
            {passLoading && <Loading />}
            {!passLoading && passports.length === 0 && (
              <Empty msg="Nenhum cadastro em análise no momento." />
            )}
            {passports.map((p) => (
              <div key={p.user_id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <UserCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-semibold">{p.full_name || "Inquilino"}</p>
                    <p className="text-xs text-muted-foreground">
                      Score: <b>{p.credit_score ?? "—"}</b> · Doc: {p.doc_status} · Crédito: {p.credit_status}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => reject.mutate(p.user_id)}
                    disabled={reject.isPending}
                    className="inline-flex items-center gap-2 rounded-md border border-destructive/40 px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" /> Rejeitar
                  </button>
                  <button
                    onClick={() => approve.mutate(p.user_id)}
                    disabled={approve.isPending}
                    className="inline-flex items-center gap-2 rounded-md bg-success px-4 py-2 text-sm font-semibold text-success-foreground disabled:opacity-50"
                  >
                    <ShieldCheck className="h-4 w-4" /> Aprovar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "proposals" && (
          <div className="space-y-3">
            {propLoading && <Loading />}
            {!propLoading && proposals.length === 0 && <Empty msg="Nenhuma proposta na plataforma." />}
            {proposals.map((pr) => {
              const snap = (pr.property_snapshot ?? {}) as { title?: string; neighborhood?: string };
              return (
                <div key={pr.id} className="rounded-xl border bg-card p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <div>
                        <p className="font-semibold">{snap.title ?? "Imóvel"}</p>
                        <p className="text-xs text-muted-foreground">
                          {snap.neighborhood ?? "—"} · R$ {Number(pr.escrow_amount).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    </div>
                    <StatusBadge s={pr.status} />
                  </div>
                  {pr.status === "pending" && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => rejectProp.mutate(pr.id)}
                        className="rounded-md border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
                      >
                        Rejeitar
                      </button>
                      <button
                        onClick={() => accept.mutate(pr.id)}
                        className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                      >
                        Aceitar (forçar)
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === "tickets" && (
          <div className="space-y-3">
            {tickets.length === 0 && <Empty msg="Nenhum chamado na plataforma." />}
            {tickets.map((t) => (
              <div key={t.id} className="rounded-xl border bg-card p-3">
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <Wrench className="h-3 w-3" /> Proposta {t.proposal_id.slice(0, 8)}
                </p>
                <TicketThread ticket={t} />
              </div>
            ))}
          </div>
        )}

        {tab === "disputes" && (
          <div className="space-y-3">
            {disputes.length === 0 && <Empty msg="Nenhum conflito em arbitragem." />}
            {disputes.map((d) => (
              <div key={d.id} className="rounded-xl border bg-card p-5">
                <div className="flex items-center gap-2">
                  <Gavel className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Caso #{d.id.slice(-5)}</h3>
                  <span className={`ml-auto rounded-full px-2.5 py-1 text-xs font-semibold ${
                    d.status === "aberta" ? "bg-warning/15 text-warning-foreground"
                      : d.status === "mediando" ? "bg-primary/15 text-primary"
                      : "bg-success/15 text-success"
                  }`}>{d.status}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">Motivo: {d.reason}</p>
                <p className="text-xs text-muted-foreground">Proposta: {d.proposal_id.slice(0, 8)}</p>
                {d.status !== "resolvida" ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {d.status === "aberta" && (
                      <button onClick={() => mediate.mutate(d.id)} className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-secondary">
                        Iniciar mediação
                      </button>
                    )}
                    <button
                      onClick={() => resolveD.mutate({ id: d.id, resolution: "Caução devolvido integralmente ao inquilino.", split: { tenant: 100, owner: 0 } })}
                      className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
                    >
                      100% inquilino
                    </button>
                    <button
                      onClick={() => resolveD.mutate({ id: d.id, resolution: "Caução retido para reparos.", split: { tenant: 0, owner: 100 } })}
                      className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
                    >
                      100% proprietário
                    </button>
                    <button
                      onClick={() => resolveD.mutate({ id: d.id, resolution: "Rateio: 50/50.", split: { tenant: 50, owner: 50 } })}
                      className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                    >
                      Rateio 50/50
                    </button>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-success font-medium">
                    ✓ {d.resolution} · Inquilino {(d.escrow_split as { tenant?: number }).tenant ?? 0}% / Proprietário {(d.escrow_split as { owner?: number }).owner ?? 0}%
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === "aprovacoes" && <AprovacoesPanel />}
        {tab === "contratos" && <ContratosPanel />}
        {tab === "visitas" && <VisitasPanel />}
        {tab === "suporte" && <SuportePanel />}
        {tab === "seguranca" && <SegurancaPanel />}
      </div>
    </main>
  );
}

function StatusBadge({ s }: { s: string }) {
  const map: Record<string, { l: string; cls: string }> = {
    pending: { l: "Pendente", cls: "bg-warning/15 text-warning-foreground" },
    accepted: { l: "Aceita", cls: "bg-primary/15 text-primary" },
    rejected: { l: "Rejeitada", cls: "bg-destructive/15 text-destructive" },
    signed: { l: "Assinada", cls: "bg-primary/15 text-primary" },
    escrow: { l: "Em Escrow", cls: "bg-primary/15 text-primary" },
    active: { l: "Ativa", cls: "bg-success/15 text-success" },
    ended: { l: "Encerrada", cls: "bg-muted text-muted-foreground" },
    cancelled: { l: "Cancelada", cls: "bg-muted text-muted-foreground" },
  };
  const v = map[s] ?? { l: s, cls: "bg-secondary" };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${v.cls}`}>{v.l}</span>;
}

function Empty({ msg }: { msg: string }) {
  return <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">{msg}</div>;
}
function Loading() {
  return <div className="flex items-center justify-center py-10 text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...</div>;
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium ${
      active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
    }`}>{children}</button>
  );
}

// ============ Segurança ============
function SegurancaPanel() {
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pwd.length < 8) return toast.error("A senha deve ter ao menos 8 caracteres.");
    if (pwd !== confirm) return toast.error("As senhas não coincidem.");
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwd });
      if (error) throw error;
      toast.success("Senha de administrador atualizada com sucesso.");
      setPwd(""); setConfirm("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao atualizar senha.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md rounded-xl border bg-card p-6">
      <div className="mb-4 flex items-center gap-2">
        <KeyRound className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Alterar senha do administrador</h3>
      </div>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Nova senha</label>
          <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} required minLength={8}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Confirmar nova senha</label>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
        </div>
        <button type="submit" disabled={loading}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />} Salvar nova senha
        </button>
      </form>
    </div>
  );
}

// ============ Contratos Ativos (Salvador) ============
const CONTRATOS_MOCK = [
  { id: "CT-001", inquilino: "Ana Souza", proprietario: "Carlos Lima", bairro: "Pituba", valor: 2400 },
  { id: "CT-002", inquilino: "Bruno Reis", proprietario: "Marta Dias", bairro: "Brotas", valor: 1800 },
  { id: "CT-003", inquilino: "Camila Rocha", proprietario: "Eduardo Sá", bairro: "Ondina", valor: 3100 },
  { id: "CT-004", inquilino: "Diego Alves", proprietario: "Lúcia Mota", bairro: "Cabula", valor: 1500 },
  { id: "CT-005", inquilino: "Elaine Pires", proprietario: "Rafael Nunes", bairro: "Cajazeiras", valor: 1200 },
];
function ContratosPanel() {
  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center gap-2 border-b p-4">
        <Receipt className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Contratos ativos · Salvador-BA</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left">Contrato</th>
              <th className="px-4 py-2 text-left">Inquilino</th>
              <th className="px-4 py-2 text-left">Proprietário</th>
              <th className="px-4 py-2 text-left">Bairro</th>
              <th className="px-4 py-2 text-right">Aluguel</th>
              <th className="px-4 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {CONTRATOS_MOCK.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="px-4 py-3 font-mono text-xs">{c.id}</td>
                <td className="px-4 py-3">{c.inquilino}</td>
                <td className="px-4 py-3">{c.proprietario}</td>
                <td className="px-4 py-3">{c.bairro}</td>
                <td className="px-4 py-3 text-right">R$ {c.valor.toLocaleString("pt-BR")}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => toast.success(`Boleto do contrato ${c.id} gerado e enviado por e-mail.`)}
                      className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-secondary">
                      <Download className="h-3.5 w-3.5" /> Gerar boleto
                    </button>
                    <button onClick={() => toast(`Visualizando contrato ${c.id}…`, { description: `${c.inquilino} · ${c.bairro}` })}
                      className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-secondary">
                      <Eye className="h-3.5 w-3.5" /> Ver contrato
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============ Visitas Técnicas ============
type Visita = { id: string; titulo: string; data: string; status: "pendente" | "aprovada" | "recusada" };
function VisitasPanel() {
  const [items, setItems] = useState<Visita[]>([
    { id: "V-101", titulo: "Inquilino Ana solicitou reparo elétrico no imóvel de Brotas", data: "2026-06-18 10:00", status: "pendente" },
    { id: "V-102", titulo: "Vistoria de entrada no imóvel da Pituba", data: "2026-06-19 14:30", status: "pendente" },
    { id: "V-103", titulo: "Reparo hidráulico em Ondina", data: "2026-06-22 09:00", status: "pendente" },
  ]);

  function update(id: string, patch: Partial<Visita>) {
    setItems((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Agendamentos de visitas técnicas</h3>
      </div>
      {items.map((v) => (
        <div key={v.id} className="rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium">{v.titulo}</p>
              <p className="text-xs text-muted-foreground">Data sugerida: {v.data}</p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              v.status === "aprovada" ? "bg-success/15 text-success"
              : v.status === "recusada" ? "bg-destructive/15 text-destructive"
              : "bg-warning/15 text-warning-foreground"
            }`}>{v.status}</span>
          </div>
          {v.status === "pendente" && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => { update(v.id, { status: "aprovada" }); toast.success("Visita aprovada."); }}
                className="inline-flex items-center gap-1 rounded-md bg-success px-3 py-1.5 text-xs font-semibold text-success-foreground">
                <Check className="h-3.5 w-3.5" /> Aprovar
              </button>
              <button onClick={() => { update(v.id, { status: "recusada" }); toast("Visita recusada."); }}
                className="inline-flex items-center gap-1 rounded-md border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10">
                <X className="h-3.5 w-3.5" /> Recusar
              </button>
              <button onClick={() => {
                const nova = window.prompt("Nova data (AAAA-MM-DD HH:MM):", v.data);
                if (nova) { update(v.id, { data: nova }); toast.success("Data alterada."); }
              }} className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-secondary">
                <CalendarClock className="h-3.5 w-3.5" /> Alterar data
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ============ Suporte Técnico ============
type Chamado = { id: string; autor: string; tipo: string; assunto: string; mensagem: string; status: "aberto" | "resolvido"; resposta?: string };
function SuportePanel() {
  const [items, setItems] = useState<Chamado[]>([
    { id: "S-201", autor: "Ana (Inquilino)", tipo: "Dúvida", assunto: "Como pago meu aluguel?", mensagem: "Não encontrei o boleto deste mês no painel.", status: "aberto" },
    { id: "S-202", autor: "Carlos (Proprietário)", tipo: "Problema no site", assunto: "Erro ao publicar imóvel", mensagem: "Ao clicar em publicar nada acontece.", status: "aberto" },
    { id: "S-203", autor: "Bruno (Inquilino)", tipo: "Dúvida", assunto: "Renovação de contrato", mensagem: "Como funciona a renovação automática?", status: "aberto" },
  ]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [resposta, setResposta] = useState("");

  const aberto = items.find((c) => c.id === openId) ?? null;

  function resolver() {
    if (!aberto) return;
    if (!resposta.trim()) return toast.error("Digite uma resposta antes de resolver.");
    setItems((prev) => prev.map((c) => (c.id === aberto.id ? { ...c, status: "resolvido", resposta } : c)));
    toast.success(`Chamado ${aberto.id} marcado como resolvido.`);
    setOpenId(null); setResposta("");
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <LifeBuoy className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Chamados abertos</h3>
        </div>
        {items.map((c) => (
          <button key={c.id} onClick={() => { setOpenId(c.id); setResposta(c.resposta ?? ""); }}
            className={`w-full rounded-xl border bg-card p-3 text-left hover:bg-secondary/50 ${openId === c.id ? "ring-2 ring-primary" : ""}`}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{c.assunto}</p>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                c.status === "resolvido" ? "bg-success/15 text-success" : "bg-warning/15 text-warning-foreground"
              }`}>{c.status}</span>
            </div>
            <p className="text-xs text-muted-foreground">{c.autor} · {c.tipo}</p>
          </button>
        ))}
      </div>
      <div className="rounded-xl border bg-card p-4">
        {!aberto ? (
          <p className="text-sm text-muted-foreground">Selecione um chamado para visualizar e responder.</p>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">{aberto.autor} · {aberto.tipo}</p>
              <h4 className="font-semibold">{aberto.assunto}</h4>
              <p className="mt-2 rounded-md bg-muted/40 p-3 text-sm">{aberto.mensagem}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Resposta do administrador</label>
              <textarea value={resposta} onChange={(e) => setResposta(e.target.value)} rows={4}
                disabled={aberto.status === "resolvido"}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60" />
            </div>
            {aberto.status === "aberto" ? (
              <button onClick={resolver}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                <Check className="h-4 w-4" /> Marcar como resolvido
              </button>
            ) : (
              <p className="text-sm text-success font-medium">✓ Chamado resolvido</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============ Aprovação de Cadastros ============
type Pendente = {
  id: string;
  nome: string;
  email: string;
  tipo: "Inquilino" | "Proprietário";
  data: string;
  detalhe: string;
};

const PENDENTES_MOCK: Pendente[] = [
  { id: "U-301", nome: "Rafael Mendes", email: "rafael.mendes@email.com", tipo: "Proprietário", data: "2026-06-14", detalhe: "Imóvel em Ondina, Salvador-BA" },
  { id: "U-302", nome: "Juliana Castro", email: "juliana.castro@email.com", tipo: "Inquilino", data: "2026-06-15", detalhe: "Procurando em Brotas, Salvador-BA" },
  { id: "U-303", nome: "Felipe Andrade", email: "felipe.andrade@email.com", tipo: "Proprietário", data: "2026-06-15", detalhe: "Imóvel em Pituba, Salvador-BA" },
  { id: "U-304", nome: "Patrícia Lopes", email: "patricia.lopes@email.com", tipo: "Inquilino", data: "2026-06-16", detalhe: "Procurando em Cabula, Salvador-BA" },
];

function AprovacoesPanel() {
  const [items, setItems] = useState<Pendente[]>([]);
  const [loading, setLoading] = useState(true);

  // Carrega de Supabase (profiles) com fallback estrito para mock local
  // em caso de erro / variáveis de ambiente ausentes / tabela inexistente.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Cast para any: a tabela "profiles" pode não existir no schema
        // gerado; nesse caso o catch redireciona para o mock.
        const sb = supabase as unknown as {
          from: (t: string) => {
            select: (cols: string) => {
              eq: (c: string, v: string) => {
                order: (c: string, o: { ascending: boolean }) => {
                  limit: (n: number) => Promise<{ data: unknown; error: unknown }>;
                };
              };
            };
          };
        };
        const { data, error } = await sb
          .from("profiles")
          .select("id, full_name, email, role, created_at, status")
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(20);
        if (error) throw error;
        if (cancelled) return;
        const rows = (data as Array<{ id: string; full_name?: string; email?: string; role?: string; created_at?: string }>) ?? [];
        const mapped: Pendente[] = rows.map((row) => ({
          id: row.id,
          nome: row.full_name || "Usuário",
          email: row.email || "—",
          tipo: row.role === "owner" ? "Proprietário" : "Inquilino",
          data: (row.created_at ?? "").slice(0, 10),
          detalhe: "Cadastro pendente",
        }));
        setItems(mapped.length ? mapped : PENDENTES_MOCK);
      } catch {
        if (!cancelled) setItems(PENDENTES_MOCK);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  function aprovar(p: Pendente) {
    setItems((arr) => arr.filter((x) => x.id !== p.id));
    toast.success(`${p.nome} aprovado(a). Já pode fazer login como ${p.tipo}.`);
  }
  function recusar(p: Pendente) {
    setItems((arr) => arr.filter((x) => x.id !== p.id));
    toast(`Solicitação de ${p.nome} recusada.`);
  }

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center gap-2 border-b p-4">
        <UserPlus className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Solicitações pendentes ({items.length})</h3>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...
        </div>
      ) : items.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground">Nenhuma solicitação pendente.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Nome</th>
                <th className="px-4 py-2 text-left">E-mail</th>
                <th className="px-4 py-2 text-left">Tipo</th>
                <th className="px-4 py-2 text-left">Data</th>
                <th className="px-4 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-t align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium">{p.nome}</p>
                    <p className="text-xs text-muted-foreground">{p.detalhe}</p>
                  </td>
                  <td className="px-4 py-3">{p.email}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      p.tipo === "Proprietário" ? "bg-primary/15 text-primary" : "bg-secondary text-foreground"
                    }`}>{p.tipo}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{p.data}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => aprovar(p)}
                        className="inline-flex items-center gap-1 rounded-md bg-success px-3 py-1.5 text-xs font-semibold text-success-foreground hover:opacity-90">
                        <Check className="h-3.5 w-3.5" /> Aprovar
                      </button>
                      <button onClick={() => recusar(p)}
                        className="inline-flex items-center gap-1 rounded-md border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10">
                        <X className="h-3.5 w-3.5" /> Recusar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
