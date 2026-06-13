import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, Wallet, KeyRound, Sparkles, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { PropertyCard } from "@/components/PropertyCard";
import { listPublishedProperties } from "@/lib/properties.api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Canto Pronto — Aluguel mobiliado em Salvador, sem fiador" },
      { name: "description", content: "Alugue imóveis mobiliados com segurança digital em Salvador. Sem fiador, sem burocracia." },
    ],
  }),
  component: Index,
});

function Index() {
  const { data: properties = [] } = useQuery({
    queryKey: ["properties", "published"],
    queryFn: listPublishedProperties,
  });
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 via-background to-success/10" />
        <div className="mx-auto max-w-7xl px-4 py-16 md:py-24">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success">
                <ShieldCheck className="h-3.5 w-3.5" /> Protocolo Parede Seca
              </span>
              <h1 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight">
                Alugue imóveis mobiliados com{" "}
                <span className="text-primary">segurança digital</span>.
              </h1>
              <p className="mt-4 text-lg text-muted-foreground">
                Sem fiador, sem burocracia. A primeira plataforma P2P de locação focada em Salvador/BA, com vistoria certificada e pagamento em custódia.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/buscar"
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-95"
                >
                  Buscar imóveis <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/cadastrar"
                  className="inline-flex items-center gap-2 rounded-md border px-5 py-3 text-sm font-semibold hover:bg-secondary"
                >
                  Cadastrar agora
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-success" /> Certificação anti-mofo</div>
                <div className="flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" /> Caução em Escrow</div>
                <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Score em 1 minuto</div>
              </div>
            </div>
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&q=80"
                alt="Salvador, vista da Barra"
                className="aspect-[4/3] w-full rounded-2xl object-cover shadow-xl"
              />
              <div className="absolute -bottom-4 -left-4 hidden md:flex items-center gap-3 rounded-xl bg-card p-4 shadow-lg border">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/15 text-success">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Vistoria certificada</p>
                  <p className="text-sm font-semibold">98% Score</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <h2 className="text-2xl font-bold tracking-tight">Como funciona</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { icon: KeyRound, title: "Passaporte do Inquilino", desc: "Envie seu Serasa e libere o crédito em segundos. Score ≥ 700 elimina caução extra." },
            { icon: ShieldCheck, title: "Selo Parede Seca", desc: "Vistoria ambiental obrigatória contra mofo e infiltrações antes do anúncio." },
            { icon: Wallet, title: "Pagamento em Escrow", desc: "Seu dinheiro fica retido em custódia e só é liberado após o check-in confirmado." },
          ].map((s) => (
            <div key={s.title} className="rounded-xl border bg-card p-5">
              <s.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-3 font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Destaques */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Destaques em Salvador</h2>
          <Link to="/buscar" className="text-sm font-medium text-primary hover:underline">
            Ver todos
          </Link>
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {properties.slice(0, 3).map((p) => (
            <PropertyCard key={p.id} p={p} />
          ))}
        </div>
      </section>

      <footer className="mt-16 border-t py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Canto Pronto · Salvador/BA
      </footer>
    </main>
  );
}
