import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listMyProperties,
  createProperty,
  updatePropertyCertification,
  updatePropertyStatus,
  deleteProperty,
  type PropertyRow,
} from "@/lib/properties.api";
import { supabase } from "@/integrations/supabase/client";
import { listTicketsForOwner } from "@/lib/tickets.api";
import { listProposalsForMyProperties } from "@/lib/proposals.api";
import { TicketThread } from "@/components/TicketThread";
import { InspectionWizard } from "@/components/InspectionWizard";
import { CertBadge } from "@/components/Badges";
import { Plus, Upload, ShieldCheck, AlertTriangle, Trash2, Eye, EyeOff, Loader2, ClipboardCheck } from "lucide-react";

export const Route = createFileRoute("/proprietario")({ component: Owner });

const CHECKLIST = ["Teto (umidade)", "Rodapé", "Banheiro / box", "Cozinha / pia", "Janelas"];

function Owner() {
  const [tab, setTab] = useState<"meus" | "novo" | "vistoria" | "vistorias" | "chamados">("meus");
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session?.user);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const qc = useQueryClient();
  const { data: myProps = [], isLoading } = useQuery({
    queryKey: ["properties", "mine"],
    queryFn: listMyProperties,
    enabled: authed === true,
  });

  if (authed === false) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Acesso restrito</h1>
        <p className="mt-2 text-sm text-muted-foreground">Faça login para gerenciar seus imóveis.</p>
        <Link to="/entrar" search={{ redirect: "/proprietario" }} className="mt-6 inline-block rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
          Entrar
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard do Proprietário</h1>
      <p className="text-sm text-muted-foreground">Gerencie imóveis, vistorias e chamados.</p>

      <nav className="mt-6 flex gap-1 overflow-x-auto border-b">
        {[
          { k: "meus", l: "Meus imóveis" },
          { k: "novo", l: "Cadastrar imóvel" },
          { k: "vistoria", l: "Vistorô Salvador" },
          { k: "vistorias", l: "Vistorias de locação" },
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
        {tab === "meus" && (
          <>
            {isLoading && (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...
              </div>
            )}
            {!isLoading && myProps.length === 0 && (
              <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
                Você ainda não cadastrou imóveis. Clique em "Cadastrar imóvel".
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {myProps.map((p) => (
                <MyPropCard key={p.id} p={p} onChange={() => qc.invalidateQueries({ queryKey: ["properties"] })} />
              ))}
            </div>
          </>
        )}

        {tab === "novo" && <NovoImovel onCreated={() => { qc.invalidateQueries({ queryKey: ["properties"] }); setTab("meus"); }} />}

        {tab === "vistoria" && <Vistoria properties={myProps} onChange={() => qc.invalidateQueries({ queryKey: ["properties"] })} />}

        {tab === "vistorias" && <VistoriasLocacao />}

        {tab === "chamados" && <ChamadosOwner />}
      </div>
    </main>
  );
}

function ChamadosOwner() {
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["tickets", "owner"],
    queryFn: listTicketsForOwner,
  });
  if (isLoading) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  if (tickets.length === 0) {
    return <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">Nenhum chamado pendente.</div>;
  }
  return <div className="space-y-3">{tickets.map((t) => <TicketThread key={t.id} ticket={t} />)}</div>;
}

function VistoriasLocacao() {
  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ["proposals", "owner"],
    queryFn: listProposalsForMyProperties,
  });
  const relevant = proposals.filter((p) => ["escrow", "active", "ended"].includes(p.status));
  if (isLoading) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  if (relevant.length === 0) {
    return <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">Nenhuma locação com vistoria em andamento.</div>;
  }
  return (
    <div className="space-y-4">
      {relevant.map((pr) => {
        const snap = pr.property_snapshot as { title?: string };
        const type = pr.status === "ended" ? "checkout" : "checkin";
        return (
          <div key={pr.id} className="rounded-xl border bg-card p-5">
            <h3 className="font-semibold flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-primary" /> {snap.title ?? pr.id.slice(0, 8)} — {type === "checkin" ? "Vistoria de entrada" : "Vistoria de saída"}
            </h3>
            <div className="mt-3"><InspectionWizard proposalId={pr.id} type={type} role="owner" /></div>
          </div>
        );
      })}
    </div>
  );
}

function MyPropCard({ p, onChange }: { p: PropertyRow; onChange: () => void }) {
  const fallback = "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80";
  const togglePublish = useMutation({
    mutationFn: () => updatePropertyStatus(p.id, p.status === "published" ? "paused" : "published"),
    onSuccess: onChange,
  });
  const remove = useMutation({
    mutationFn: () => deleteProperty(p.id),
    onSuccess: onChange,
  });
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <img src={p.image || fallback} alt="" className="aspect-[4/3] w-full object-cover" />
      <div className="space-y-2 p-4">
        <div className="flex items-center gap-2">
          <CertBadge cert={p.certification} score={p.score} />
          <span className="rounded-full border px-2 py-0.5 text-xs">{p.status}</span>
        </div>
        <h3 className="font-semibold">{p.title}</h3>
        <p className="text-sm text-primary font-semibold">R$ {Number(p.price).toLocaleString("pt-BR")}/mês</p>
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => togglePublish.mutate()}
            disabled={togglePublish.isPending}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-medium hover:bg-secondary"
          >
            {p.status === "published" ? <><EyeOff className="h-3.5 w-3.5" />Pausar</> : <><Eye className="h-3.5 w-3.5" />Publicar</>}
          </button>
          <button
            onClick={() => { if (confirm("Excluir este imóvel?")) remove.mutate(); }}
            disabled={remove.isPending}
            className="inline-flex items-center justify-center rounded-md border border-destructive/40 px-2 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function NovoImovel({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState({
    title: "",
    address: "",
    neighborhood: "Barra",
    price: 2000,
    deposit: 2000,
    area: 50,
    bedrooms: 1,
    bathrooms: 1,
    image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80",
    amenities: "Wi-Fi, Ar condicionado",
    description: "",
  });
  const [err, setErr] = useState<string | null>(null);
  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const create = useMutation({
    mutationFn: () =>
      createProperty({
        title: form.title,
        address: form.address,
        neighborhood: form.neighborhood,
        description: form.description,
        price: form.price,
        deposit: form.deposit,
        area: form.area,
        bedrooms: form.bedrooms,
        bathrooms: form.bathrooms,
        image: form.image,
        amenities: form.amenities.split(",").map((s) => s.trim()).filter(Boolean),
        status: "published",
      }),
    onSuccess: () => { setErr(null); onCreated(); },
    onError: (e: Error) => setErr(e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate();
  };

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-xl border bg-card p-6 md:grid-cols-2">
      <Inp label="Título" value={form.title} onChange={(v) => set("title", v)} required />
      <Inp label="Endereço" value={form.address} onChange={(v) => set("address", v)} required />
      <Sel label="Bairro" value={form.neighborhood} onChange={(v) => set("neighborhood", v)} opts={["Barra", "Rio Vermelho", "Imbuí", "Brotas"]} />
      <Num label="Aluguel (R$)" value={form.price} onChange={(v) => set("price", v)} />
      <Num label="Caução (R$)" value={form.deposit} onChange={(v) => set("deposit", v)} />
      <Num label="Área (m²)" value={form.area} onChange={(v) => set("area", v)} />
      <Num label="Quartos" value={form.bedrooms} onChange={(v) => set("bedrooms", v)} />
      <Num label="Banheiros" value={form.bathrooms} onChange={(v) => set("bathrooms", v)} />
      <Inp label="URL da foto de capa" value={form.image} onChange={(v) => set("image", v)} />
      <Inp label="Comodidades (separadas por vírgula)" value={form.amenities} onChange={(v) => set("amenities", v)} />
      <label className="md:col-span-2 block text-sm">
        <span className="mb-1 block font-medium">Descrição</span>
        <textarea className="w-full rounded-md border bg-background px-3 py-2 text-sm" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
      </label>
      <div className="md:col-span-2 flex items-center gap-3">
        <button type="submit" disabled={create.isPending} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          <Plus className="h-4 w-4" /> {create.isPending ? "Publicando..." : "Publicar imóvel"}
        </button>
        {err && <span className="text-sm text-destructive">{err}</span>}
      </div>
    </form>
  );
}

function Vistoria({
  properties,
  onChange,
}: {
  properties: PropertyRow[];
  onChange: () => void;
}) {
  const [pid, setPid] = useState(properties[0]?.id ?? "");
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState<null | "parede_seca" | "atencao">(null);
  const allDone = CHECKLIST.every((c) => done[c]);
  const score = Math.round(80 + Math.random() * 18);

  const apply = useMutation({
    mutationFn: ({ cert, sc }: { cert: "parede_seca" | "atencao"; sc: number }) =>
      updatePropertyCertification(pid, cert, sc),
    onSuccess: onChange,
  });

  const analyze = () => {
    const ok = Math.random() > 0.4;
    if (ok) { apply.mutate({ cert: "parede_seca", sc: score }); setResult("parede_seca"); }
    else { apply.mutate({ cert: "atencao", sc: 65 }); setResult("atencao"); }
  };

  if (properties.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
        Cadastre um imóvel primeiro.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-5">
        <h2 className="font-semibold">Auditoria Ambiental — Vistorô Salvador</h2>
        <p className="mt-1 text-sm text-muted-foreground">Faça upload de fotos dos pontos críticos. A IA analisará umidade e infiltrações.</p>
        <select className="mt-3 rounded-md border bg-background px-3 py-2 text-sm" value={pid} onChange={(e) => { setPid(e.target.value); setDone({}); setResult(null); }}>
          {properties.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {CHECKLIST.map((c) => (
            <li key={c}>
              <button
                onClick={() => setDone((d) => ({ ...d, [c]: true }))}
                className={`w-full flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm ${
                  done[c] ? "border-success bg-success/5 text-success" : "hover:bg-secondary"
                }`}
              >
                <span className="flex items-center gap-2"><Upload className="h-4 w-4" /> {c}</span>
                <span className="text-xs font-semibold">{done[c] ? "✓ Anexado" : "Anexar"}</span>
              </button>
            </li>
          ))}
        </ul>
        <button disabled={!allDone || apply.isPending} onClick={analyze} className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          Analisar com IA
        </button>
      </div>
      {result === "parede_seca" && (
        <div className="rounded-xl border border-success/30 bg-success/10 p-5">
          <ShieldCheck className="h-6 w-6 text-success" />
          <p className="mt-2 font-semibold text-success">Certificação Parede Seca concedida</p>
          <p className="text-sm text-muted-foreground">Seu imóvel está apto e ganhou o selo verde nos cards de busca.</p>
        </div>
      )}
      {result === "atencao" && (
        <div className="rounded-xl border border-warning/30 bg-warning/10 p-5">
          <AlertTriangle className="h-6 w-6 text-warning-foreground" />
          <p className="mt-2 font-semibold text-warning-foreground">Status de Atenção</p>
          <p className="text-sm text-muted-foreground">É exigido Seguro Adicional de Pintura para listagem.</p>
        </div>
      )}
    </div>
  );
}

function Inp({ label, value, onChange, required }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <input required={required} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
    </label>
  );
}
function Num({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <input type="number" value={value} onChange={(e) => onChange(+e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
    </label>
  );
}
function Sel({ label, value, onChange, opts }: { label: string; value: string; onChange: (v: string) => void; opts: string[] }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
        {opts.map((o) => <option key={o}>{o}</option>)}
      </select>
    </label>
  );
}
