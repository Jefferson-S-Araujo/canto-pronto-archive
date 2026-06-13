import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getPropertyById } from "@/lib/properties.api";
import { getMyPassport } from "@/lib/tenant.api";
import { createProposal } from "@/lib/proposals.api";
import { CertBadge, ScoreBadge } from "@/components/Badges";
import { Bed, Bath, Maximize2, MapPin, Wifi, Calendar, Send, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/imovel/$id")({
  component: Detail,
});

function Detail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s?.user));
    return () => sub.subscription.unsubscribe();
  }, []);

  const { data: p, isLoading } = useQuery({
    queryKey: ["property", id],
    queryFn: () => getPropertyById(id),
  });
  const { data: passport } = useQuery({
    queryKey: ["passport", "mine"],
    queryFn: getMyPassport,
    enabled: authed === true,
  });
  const [scheduled, setScheduled] = useState(false);

  const proposalMut = useMutation({
    mutationFn: () => {
      if (!p) throw new Error("Imóvel não encontrado.");
      return createProposal({
        propertyId: p.id,
        snapshot: {
          title: p.title,
          neighborhood: p.neighborhood,
          image: p.image,
          price: Number(p.price),
          deposit: Number(p.deposit),
        },
        extraDeposit: passport?.credit_status === "aprovado" && (passport.credit_score ?? 0) >= 700 ? 0 : Number(p.deposit),
      });
    },
    onSuccess: (proposal) => navigate({ to: "/contrato/$id", params: { id: proposal.id } }),
  });

  if (isLoading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">
        <Loader2 className="mx-auto h-6 w-6 animate-spin" />
        <p className="mt-2 text-sm">Carregando imóvel...</p>
      </main>
    );
  }

  if (!p) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Imóvel não encontrado</h1>
        <Link to="/buscar" className="mt-4 inline-block text-primary hover:underline">Voltar ao catálogo</Link>
      </main>
    );
  }

  const price = Number(p.price);
  const deposit = Number(p.deposit);
  const creditApproved = passport?.credit_status === "aprovado" && (passport.credit_score ?? 0) >= 700;
  const extraDeposit = creditApproved ? 0 : deposit;
  const totalInicial = price + deposit + extraDeposit;
  const fallback = "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80";

  const handleProposal = () => {
    if (authed === false) {
      navigate({ to: "/entrar", search: { redirect: `/imovel/${p.id}` } });
      return;
    }
    proposalMut.mutate();
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <Link to="/buscar" className="text-sm text-muted-foreground hover:text-foreground">← Voltar</Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="relative overflow-hidden rounded-xl border">
            <img src={p.image || fallback} alt={p.title} className="aspect-[16/10] w-full object-cover" />
            <div className="absolute left-4 top-4 flex flex-wrap gap-2">
              <CertBadge cert={p.certification} score={p.score} />
              <ScoreBadge score={p.score} />
            </div>
          </div>

          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{p.title}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" /> {p.address}
            </p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <span className="flex items-center gap-1.5"><Bed className="h-4 w-4 text-primary" />{p.bedrooms} quartos</span>
              <span className="flex items-center gap-1.5"><Bath className="h-4 w-4 text-primary" />{p.bathrooms} banheiros</span>
              <span className="flex items-center gap-1.5"><Maximize2 className="h-4 w-4 text-primary" />{p.area}m²</span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{p.description}</p>
          </div>

          {p.amenities.length > 0 && (
            <div>
              <h2 className="font-semibold">Mobília e comodidades</h2>
              <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {p.amenities.map((a) => (
                  <li key={a} className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm">
                    <Wifi className="h-4 w-4 text-primary" /> {a}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <aside className="lg:sticky lg:top-20 h-fit space-y-4 rounded-xl border bg-card p-5 shadow-sm">
          <div>
            <p className="text-xs text-muted-foreground">Aluguel mensal</p>
            <p className="text-3xl font-bold text-primary">R$ {price.toLocaleString("pt-BR")}</p>
          </div>
          <div className="space-y-1.5 border-t pt-4 text-sm">
            <Row label="Aluguel" value={`R$ ${price.toLocaleString("pt-BR")}`} />
            <Row label="Depósito caução" value={`R$ ${deposit.toLocaleString("pt-BR")}`} />
            {extraDeposit > 0 && (
              <Row label="Caução adicional (score < 700)" value={`R$ ${extraDeposit.toLocaleString("pt-BR")}`} warn />
            )}
            <div className="mt-2 flex justify-between border-t pt-2 font-semibold">
              <span>Total inicial</span>
              <span className="text-primary">R$ {totalInicial.toLocaleString("pt-BR")}</span>
            </div>
          </div>
          <button
            onClick={handleProposal}
            disabled={proposalMut.isPending}
            className="w-full rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:opacity-95 inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Send className="h-4 w-4" /> {proposalMut.isPending ? "Enviando..." : "Fazer Proposta"}
          </button>
          {proposalMut.isError && (
            <p className="text-xs text-destructive">{(proposalMut.error as Error).message}</p>
          )}
          <button
            onClick={() => setScheduled(true)}
            className="w-full rounded-md border px-4 py-3 text-sm font-semibold hover:bg-secondary inline-flex items-center justify-center gap-2"
          >
            <Calendar className="h-4 w-4" /> {scheduled ? "Visita agendada ✓" : "Agendar Visita"}
          </button>
          {authed && !creditApproved && (
            <p className="rounded-md bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
              💡 Envie seu Passaporte do Inquilino no <Link to="/inquilino" className="font-semibold underline">dashboard</Link> para eliminar a caução adicional.
            </p>
          )}
        </aside>
      </div>
    </main>
  );
}

function Row({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={warn ? "text-warning-foreground" : "text-muted-foreground"}>{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
