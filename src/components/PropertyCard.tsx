import { Link } from "@tanstack/react-router";
import { CertBadge, ScoreBadge } from "./Badges";
import { Bed, Bath, Maximize2, MapPin } from "lucide-react";

export type CardProperty = {
  id: string;
  title: string;
  neighborhood: string;
  image: string;
  price: number | string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  certification: "parede_seca" | "pendente" | "atencao";
  score: number;
};

export function PropertyCard({ p }: { p: CardProperty }) {
  const price = Number(p.price);
  const fallback =
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80";
  return (
    <Link
      to="/imovel/$id"
      params={{ id: p.id }}
      className="group flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition hover:shadow-md hover:-translate-y-0.5"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={p.image || fallback}
          alt={p.title}
          loading="lazy"
          className="h-full w-full object-cover transition group-hover:scale-105"
        />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <CertBadge cert={p.certification} />
        </div>
        <div className="absolute right-3 top-3">
          <ScoreBadge score={p.score} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-semibold leading-tight">{p.title}</h3>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" /> {p.neighborhood}
        </p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Bed className="h-3.5 w-3.5" />{p.bedrooms}</span>
          <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" />{p.bathrooms}</span>
          <span className="flex items-center gap-1"><Maximize2 className="h-3.5 w-3.5" />{p.area}m²</span>
        </div>
        <div className="mt-auto flex items-baseline justify-between pt-2">
          <span className="text-lg font-bold text-primary">
            R$ {price.toLocaleString("pt-BR")}
          </span>
          <span className="text-xs text-muted-foreground">/mês</span>
        </div>
      </div>
    </Link>
  );
}
