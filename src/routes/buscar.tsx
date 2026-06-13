import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listPublishedProperties } from "@/lib/properties.api";
import { PropertyCard } from "@/components/PropertyCard";
import { Search, SlidersHorizontal, Loader2 } from "lucide-react";

export const Route = createFileRoute("/buscar")({
  head: () => ({ meta: [{ title: "Buscar imóveis em Salvador — Canto Pronto" }] }),
  component: Buscar,
});

const NEIGHBORHOODS = ["Todos", "Barra", "Rio Vermelho", "Imbuí", "Brotas"];

function Buscar() {
  const { data: properties = [], isLoading } = useQuery({
    queryKey: ["properties", "published"],
    queryFn: listPublishedProperties,
  });
  const [q, setQ] = useState("");
  const [bairro, setBairro] = useState("Todos");
  const [maxPrice, setMaxPrice] = useState(5000);
  const [minBeds, setMinBeds] = useState(0);
  const [minBaths, setMinBaths] = useState(0);
  const [cert, setCert] = useState<"Todos" | "Parede Seca">("Todos");
  const [open, setOpen] = useState(false);

  const list = useMemo(
    () =>
      properties.filter((p) => {
        if (q && !(`${p.title} ${p.neighborhood} ${p.address}`.toLowerCase().includes(q.toLowerCase()))) return false;
        if (bairro !== "Todos" && p.neighborhood !== bairro) return false;
        if (Number(p.price) > maxPrice) return false;
        if (p.bedrooms < minBeds) return false;
        if (p.bathrooms < minBaths) return false;
        if (cert === "Parede Seca" && p.certification !== "parede_seca") return false;
        return true;
      }),
    [properties, q, bairro, maxPrice, minBeds, minBaths, cert],
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Catálogo de imóveis</h1>
      <p className="text-sm text-muted-foreground">Imóveis mobiliados, vistoriados e certificados em Salvador.</p>

      <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por bairro (Barra, Rio Vermelho, Imbuí...)"
            className="w-full rounded-md border bg-card pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {NEIGHBORHOODS.map((n) => (
            <button
              key={n}
              onClick={() => setBairro(n)}
              className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                bairro === n ? "bg-primary text-primary-foreground border-primary" : "hover:bg-secondary"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium hover:bg-secondary"
        >
          <SlidersHorizontal className="h-4 w-4" /> Filtros
        </button>
      </div>

      {open && (
        <div className="mt-4 grid gap-4 rounded-xl border bg-card p-5 md:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs font-medium">
            Preço máximo: <span className="font-bold text-primary">R$ {maxPrice.toLocaleString("pt-BR")}</span>
            <input type="range" min={1000} max={10000} step={100} value={maxPrice} onChange={(e) => setMaxPrice(+e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium">
            Quartos mínimos
            <select className="rounded-md border bg-background px-2 py-1.5" value={minBeds} onChange={(e) => setMinBeds(+e.target.value)}>
              {[0, 1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}+</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium">
            Banheiros mínimos
            <select className="rounded-md border bg-background px-2 py-1.5" value={minBaths} onChange={(e) => setMinBaths(+e.target.value)}>
              {[0, 1, 2, 3].map((n) => <option key={n} value={n}>{n}+</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium">
            Certificação
            <select className="rounded-md border bg-background px-2 py-1.5" value={cert} onChange={(e) => setCert(e.target.value as "Todos" | "Parede Seca")}>
              <option>Todos</option>
              <option>Parede Seca</option>
            </select>
          </label>
        </div>
      )}

      <p className="mt-6 text-sm text-muted-foreground">
        {isLoading ? "Carregando..." : `${list.length} imóvel(eis) encontrado(s)`}
      </p>
      <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((p) => <PropertyCard key={p.id} p={p} />)}
      </div>
      {isLoading && (
        <div className="mt-10 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando imóveis...
        </div>
      )}
      {!isLoading && list.length === 0 && (
        <div className="mt-10 rounded-xl border bg-card p-10 text-center text-muted-foreground">
          Nenhum imóvel publicado ainda. Proprietários: cadastre seu imóvel no dashboard.
        </div>
      )}
    </main>
  );
}
