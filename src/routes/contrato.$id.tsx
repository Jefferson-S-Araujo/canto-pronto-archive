import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient, useQueryClient as useQC } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getProposal,
  signProposal,
  confirmCheckin,
  type ProposalRow,
} from "@/lib/proposals.api";
import { supabase } from "@/integrations/supabase/client";
import {
  getContract,
  getContractSignedUrl,
  markContractSigned,
} from "@/lib/contracts.api";
import { generateContractPdf } from "@/lib/contracts.functions";
import { openDispute } from "@/lib/disputes.api";
import { InspectionWizard } from "@/components/InspectionWizard";
import {
  Wallet,
  PenLine,
  ShieldCheck,
  KeyRound,
  Loader2,
  FileText,
  Download,
  AlertTriangle,
  LogOut,
} from "lucide-react";

export const Route = createFileRoute("/contrato/$id")({ component: Contrato });

function Contrato() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
  }, []);

  const { data: pr, isLoading } = useQuery({
    queryKey: ["proposal", id],
    queryFn: () => getProposal(id),
  });

  if (isLoading) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center text-muted-foreground">
        <Loader2 className="mx-auto h-6 w-6 animate-spin" />
      </main>
    );
  }

  if (!pr) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Contrato não encontrado</h1>
        <Link to="/inquilino" className="mt-4 inline-block text-primary hover:underline">
          Voltar
        </Link>
      </main>
    );
  }

  const isTenant = uid === pr.tenant_id;
  const role: "tenant" | "owner" = isTenant ? "tenant" : "owner";

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link to="/inquilino" className="text-sm text-muted-foreground hover:text-foreground">
        ← Voltar
      </Link>
      <h1 className="mt-3 text-2xl font-bold tracking-tight">Contrato & Locação</h1>
      <p className="text-sm text-muted-foreground">
        {(pr.property_snapshot as { title?: string })?.title ?? "imóvel"}
      </p>

      <StepValues pr={pr} />
      <StepContract pr={pr} role={role} qc={qc} />
      <StepSignAndPay pr={pr} qc={qc} />
      <StepCheckin pr={pr} role={role} />
      <StepActive pr={pr} role={role} />
      <StepCheckout pr={pr} role={role} qc={qc} />
    </main>
  );
}

function StepValues({ pr }: { pr: ProposalRow }) {
  const escrowAmount = Number(pr.escrow_amount);
  const deposit = Number(pr.deposit);
  const fee = Math.round(escrowAmount * 0.05);
  const ownerNet = escrowAmount - fee - deposit;
  return (
    <section className="mt-6 rounded-xl border bg-card p-6">
      <h2 className="font-semibold">Split de valores</h2>
      <ul className="mt-3 space-y-1.5 text-sm">
        <Row label="Total a pagar (entrada)" value={escrowAmount} bold />
        <Row label="Taxa Canto Pronto (5%)" value={fee} muted />
        <Row label="Caução retido em Escrow" value={deposit} muted />
        <Row label="Repasse líquido ao proprietário" value={ownerNet} muted />
      </ul>
    </section>
  );
}

function StepContract({ pr, role, qc }: { pr: ProposalRow; role: "tenant" | "owner"; qc: ReturnType<typeof useQC> }) {
  const { data: contract } = useQuery({
    queryKey: ["contract", pr.id],
    queryFn: () => getContract(pr.id),
  });

  const { data: url } = useQuery({
    queryKey: ["contract-url", contract?.pdf_path],
    queryFn: () => getContractSignedUrl(contract!.pdf_path),
    enabled: !!contract?.pdf_path,
    staleTime: 1000 * 60 * 30,
  });

  const gen = useServerFn(generateContractPdf);
  const generate = useMutation({
    mutationFn: () => gen({ data: { proposalId: pr.id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contract", pr.id] }),
  });

  const sign = useMutation({
    mutationFn: () => markContractSigned(contract!.id, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contract", pr.id] }),
  });

  const mySign = role === "tenant" ? contract?.signed_by_tenant : contract?.signed_by_owner;

  return (
    <section className="mt-6 rounded-xl border bg-card p-6">
      <h2 className="font-semibold flex items-center gap-2">
        <FileText className="h-4 w-4" /> Contrato em PDF
      </h2>
      {!contract && (
        <div className="mt-3">
          <p className="text-sm text-muted-foreground">
            Gere o contrato com os dados desta proposta. O PDF é assinado por hash criptográfico.
          </p>
          <button
            onClick={() => generate.mutate()}
            disabled={generate.isPending}
            className="mt-3 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {generate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Gerar contrato
          </button>
          {generate.error && (
            <p className="mt-2 text-xs text-destructive">{(generate.error as Error).message}</p>
          )}
        </div>
      )}
      {contract && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/30 p-3 text-sm">
            <FileText className="h-4 w-4 text-primary" />
            <div className="flex-1 min-w-[120px]">
              <p className="font-medium">contrato-{pr.id.slice(0, 8)}.pdf</p>
              <p className="text-[10px] text-muted-foreground font-mono break-all">hash: {contract.pdf_hash.slice(0, 32)}...</p>
            </div>
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
              >
                <Download className="h-3.5 w-3.5" /> Abrir / baixar
              </a>
            )}
          </div>
          {url && (
            <iframe src={url} title="contrato" className="h-64 w-full rounded-md border" />
          )}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className={contract.signed_by_tenant ? "text-success font-semibold" : "text-muted-foreground"}>
              {contract.signed_by_tenant ? "✓" : "•"} Assinado pelo inquilino
            </span>
            <span className={contract.signed_by_owner ? "text-success font-semibold" : "text-muted-foreground"}>
              {contract.signed_by_owner ? "✓" : "•"} Assinado pelo proprietário
            </span>
            {!mySign && (
              <button
                onClick={() => sign.mutate()}
                disabled={sign.isPending}
                className="ml-auto inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
              >
                <PenLine className="h-3.5 w-3.5" /> Assinar como {role === "tenant" ? "inquilino" : "proprietário"}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function StepSignAndPay({ pr, qc }: { pr: ProposalRow; qc: ReturnType<typeof useQC> }) {
  const [signature, setSignature] = useState("");
  const sign = useMutation({
    mutationFn: () => signProposal(pr.id, signature),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposal", pr.id] }),
  });
  const escrowAmount = Number(pr.escrow_amount);

  if (pr.status === "rejected") {
    return (
      <section className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive font-medium">
        Esta proposta foi rejeitada pelo proprietário.
      </section>
    );
  }

  if (pr.status !== "pending" && pr.status !== "accepted") return null;

  return (
    <section className="mt-6 rounded-xl border bg-card p-6">
      <h2 className="font-semibold flex items-center gap-2">
        <PenLine className="h-4 w-4" /> Aceite e pagamento
      </h2>
      <span className="mt-2 inline-block rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold text-warning-foreground">
        Pagamento simulado — sem cobrança real
      </span>
      <input
        value={signature}
        onChange={(e) => setSignature(e.target.value)}
        placeholder="Digite seu nome completo para confirmar"
        className="mt-3 w-full rounded-md border bg-background px-3 py-2 text-sm"
      />
      <button
        onClick={() => sign.mutate()}
        disabled={!signature || sign.isPending}
        className="mt-3 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
      >
        <Wallet className="h-4 w-4" /> Aceitar e pagar R$ {escrowAmount.toLocaleString("pt-BR")}
      </button>
    </section>
  );
}

function StepCheckin({ pr, role }: { pr: ProposalRow; role: "tenant" | "owner" }) {
  if (pr.status !== "escrow") return null;
  return (
    <section className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-6">
      <h2 className="font-semibold flex items-center gap-2">
        <KeyRound className="h-4 w-4" /> Vistoria de entrada (check-in)
      </h2>
      <div className="mt-2 rounded-md border border-primary/30 bg-card p-3 text-sm">
        <p className="font-semibold text-primary flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" /> Valor retido em Escrow
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Faça a vistoria e assine. Quando ambas as partes assinarem, o valor será liberado ao proprietário.
        </p>
      </div>
      <div className="mt-4">
        <InspectionWizard proposalId={pr.id} type="checkin" role={role} />
      </div>
      <CheckinReleaser pr={pr} />
    </section>
  );
}

function CheckinReleaser({ pr }: { pr: ProposalRow }) {
  const qc = useQueryClient();
  const { data: insp } = useQuery({
    queryKey: ["inspection", pr.id, "checkin"],
    queryFn: async () => {
      const r = await supabase.from("inspections").select("*").eq("proposal_id", pr.id).eq("type", "checkin").maybeSingle();
      return r.data;
    },
  });
  const release = useMutation({
    mutationFn: () => confirmCheckin(pr.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposal", pr.id] }),
  });
  const bothSigned = insp?.signed_by_tenant_at && insp?.signed_by_owner_at;
  if (!bothSigned) return null;
  return (
    <button
      onClick={() => release.mutate()}
      disabled={release.isPending}
      className="mt-4 inline-flex items-center gap-2 rounded-md bg-success px-4 py-2 text-sm font-semibold text-success-foreground disabled:opacity-50"
    >
      <KeyRound className="h-4 w-4" /> Liberar repasse e ativar contrato
    </button>
  );
}

function StepActive({ pr, role }: { pr: ProposalRow; role: "tenant" | "owner" }) {
  const qc = useQueryClient();
  const checkout = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("proposals").update({ status: "ended" }).eq("id", pr.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposal", pr.id] }),
  });

  if (pr.status !== "active") return null;
  return (
    <section className="mt-6 rounded-xl border border-success/30 bg-success/10 p-6">
      <h2 className="font-semibold text-success flex items-center gap-2">
        <ShieldCheck className="h-4 w-4" /> Locação ativa
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Valor liberado ao proprietário. Quando estiver pronto para sair, faça a vistoria de saída.
      </p>
      <p className="mt-3 text-xs text-muted-foreground">
        Chamados de manutenção podem ser abertos na aba "Chamados" do seu dashboard.
      </p>
      {role === "tenant" && (
        <button
          onClick={() => checkout.mutate()}
          disabled={checkout.isPending}
          className="mt-3 inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
        >
          <LogOut className="h-3.5 w-3.5" /> Iniciar processo de saída
        </button>
      )}
    </section>
  );
}

function StepCheckout({ pr, role, qc }: { pr: ProposalRow; role: "tenant" | "owner"; qc: ReturnType<typeof useQC> }) {
  if (pr.status !== "ended") return null;
  const dispute = useMutation({
    mutationFn: () => openDispute({ proposalId: pr.id, reason: "Divergência na vistoria de saída" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["disputes"] }),
  });
  return (
    <section className="mt-6 rounded-xl border bg-card p-6">
      <h2 className="font-semibold flex items-center gap-2">
        <LogOut className="h-4 w-4" /> Vistoria de saída (check-out)
      </h2>
      <div className="mt-3">
        <InspectionWizard proposalId={pr.id} type="checkout" role={role} />
      </div>
      <div className="mt-4 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm">
        <p className="font-semibold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> Houve divergência ou avaria?
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Abra uma disputa para que a Canto Pronto faça a mediação humana do valor da caução.
        </p>
        <button
          onClick={() => dispute.mutate()}
          disabled={dispute.isPending || dispute.isSuccess}
          className="mt-2 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
        >
          {dispute.isSuccess ? "✓ Disputa aberta" : "Abrir disputa"}
        </button>
      </div>
    </section>
  );
}

function Row({ label, value, bold, muted }: { label: string; value: number; bold?: boolean; muted?: boolean }) {
  return (
    <li className={`flex justify-between ${bold ? "font-semibold" : ""}`}>
      <span className={muted ? "text-muted-foreground" : ""}>{label}</span>
      <span className={bold ? "text-primary" : ""}>R$ {value.toLocaleString("pt-BR")}</span>
    </li>
  );
}
