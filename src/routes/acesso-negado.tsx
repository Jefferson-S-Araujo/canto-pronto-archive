import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldAlert, ArrowLeft, Home, Lock } from "lucide-react";

type AccessDeniedSearch = {
  reason?: "not_admin" | "not_authenticated" | string;
  from?: string;
};

export const Route = createFileRoute("/acesso-negado")({
  validateSearch: (search: Record<string, unknown>): AccessDeniedSearch => ({
    reason: typeof search.reason === "string" ? (search.reason as AccessDeniedSearch["reason"]) : undefined,
    from: typeof search.from === "string" ? search.from : undefined,
  }),
  component: AccessDenied,
});

function AccessDenied() {
  const { reason, from } = Route.useSearch();

  const statusLabel =
    reason === "not_admin"
      ? "Bloqueado: perfil sem permissão de administrador"
      : reason === "not_authenticated"
      ? "Bloqueado: sessão não autenticada"
      : "Bloqueado: acesso restrito";

  const statusDetail =
    reason === "not_admin"
      ? "Sua conta está autenticada, mas não possui a role 'admin' necessária para abrir o painel."
      : reason === "not_authenticated"
      ? "Você precisa entrar com uma conta de administrador para acessar esta área."
      : "Esta área é restrita a usuários autorizados.";

  return (
    <main className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-warning/15">
          <ShieldAlert className="h-10 w-10 text-warning" />
        </div>

        <h1 className="mt-6 text-2xl font-bold tracking-tight">Acesso Negado</h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          Você não tem permissão para acessar o painel de administração.
          Essa área é restrita a usuários com perfil de administrador.
        </p>

        <div className="mt-6 rounded-lg border border-warning/30 bg-warning/5 p-4 text-left">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">{statusLabel}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{statusDetail}</p>
              {from && (
                <p className="text-xs text-muted-foreground">
                  Rota solicitada: <code className="rounded bg-muted px-1 py-0.5 font-mono">{from}</code>
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Home className="h-4 w-4" />
            Ir para a Home
          </Link>
          <Link
            to="/entrar"
            search={{ redirect: from || "/admin" }}
            className="inline-flex items-center gap-2 rounded-md border px-5 py-2.5 text-sm font-medium hover:bg-secondary"
          >
            <ArrowLeft className="h-4 w-4" />
            Entrar e tentar novamente
          </Link>
        </div>

        <p className="mt-8 text-xs text-muted-foreground">
          Se você acredita que deveria ter acesso, entre em contato com o suporte.
        </p>
      </div>
    </main>
  );
}
