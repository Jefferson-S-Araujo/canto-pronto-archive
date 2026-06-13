import { ShieldCheck, AlertTriangle } from "lucide-react";
import type { Certification } from "@/lib/store";

export function CertBadge({ cert, score }: { cert: Certification; score?: number }) {
  if (cert === "parede_seca") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success">
        <ShieldCheck className="h-3.5 w-3.5" />
        Parede Seca Aprovado
        {typeof score === "number" && score > 0 && <span className="ml-1 opacity-80">· {score}%</span>}
      </span>
    );
  }
  if (cert === "atencao") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-warning/20 px-2.5 py-1 text-xs font-semibold text-warning-foreground">
        <AlertTriangle className="h-3.5 w-3.5" />
        Atenção · Seguro Adicional
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
      Certificação Pendente
    </span>
  );
}

export function ScoreBadge({ score }: { score: number }) {
  return (
    <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
      {score}% Score
    </span>
  );
}
