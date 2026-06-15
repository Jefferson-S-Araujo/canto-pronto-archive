import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
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
import { ShieldCheck, Gavel, UserCheck, XCircle, FileText, Loader2, Wrench, KeyRound, Receipt, CalendarClock, LifeBuoy, Check, X, Eye, Download } from "lucide-react";
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
  const [tab, setTab] = useState<"passports" | "proposals" | "tickets" | "disputes" | "seguranca" | "contratos" | "visitas" | "suporte">("passports");

  const { data: passports = [], isLoading: passLoading } = useQuery({
    queryKey: ["admin", "passports", "pending"],
    queryFn: listPendingPassports,
  });
  const { data: proposals = [], isLoading: propLoading } = useQuery({
    queryKey: ["admin", "proposals"],
    queryFn: listAllProposals,
  });
  const { data: tickets = [] } = useQuery({
    queryKey: ["admin", "tickets"],
    queryFn: listAllTickets,
  });
  const { data: disputes = [] } = useQuery({
    queryKey: ["admin", "disputes"],
    queryFn: listDisputes,
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
