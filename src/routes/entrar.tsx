import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { ensureDefaultRole, getMyRoles } from "@/lib/auth.functions";
import { useServerFn } from "@tanstack/react-start";

type EntrarSearch = {
  redirect?: string;
};

function resolveRedirect(searchRedirect?: string): string | undefined {
  if (typeof window !== "undefined") {
    const stored = sessionStorage.getItem("auth_redirect");
    if (stored) {
      sessionStorage.removeItem("auth_redirect");
      return stored;
    }
  }
  return searchRedirect;
}

export const Route = createFileRoute("/entrar")({
  validateSearch: (search: Record<string, unknown>): EntrarSearch => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  // If user is already signed in, jump straight to the right area (respecting ?redirect).
  beforeLoad: async ({ search }) => {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      try {
        const res = await getMyRoles();
        const fallback = res.roles.includes("admin")
          ? "/admin"
          : res.roles.includes("owner")
            ? "/proprietario"
            : "/inquilino";
        const target = resolveRedirect(search.redirect) || fallback;
        throw redirect({ to: target as never });
      } catch (e) {
        // If it's a redirect, re-throw; otherwise ignore
        if (e && typeof e === "object" && "to" in e) throw e;
      }
    }
  },
  component: Entrar,
});

function Entrar() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const ensureRole = useServerFn(ensureDefaultRole);
  const fetchRoles = useServerFn(getMyRoles);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [seedMsg, setSeedMsg] = useState<string>("");

  // Provision demo admin (admin@cantopronto.com / admin123) on first visit. Idempotent.
  useEffect(() => {
    fetch("/api/public/seed-demo-admin", { method: "POST" })
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok) setSeedMsg("Admin demo pronto: admin@cantopronto.com / admin123");
      })
      .catch(() => {});
  }, []);

  const routeForRoles = (roles: string[]) =>
    roles.includes("admin") ? "/admin" : roles.includes("owner") ? "/proprietario" : "/inquilino";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error: signErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signErr) throw signErr;
      // Ensure user has at least a default role
      await ensureRole({ data: undefined as never });
      const { roles } = await fetchRoles();
      const target = redirect || routeForRoles(roles);
      navigate({ to: target as never });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao entrar");
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    setError("");
    if (redirect && typeof window !== "undefined") {
      sessionStorage.setItem("auth_redirect", redirect);
    }
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/entrar",
    });
    if (result.error) {
      setError(result.error.message ?? "Falha no login com Google");
      return;
    }
    if (result.redirected) return;
    // tokens returned — onAuthStateChange in root will invalidate; navigate after role lookup
    try {
      await ensureRole({ data: undefined as never });
      const { roles } = await fetchRoles();
      const target = redirect || routeForRoles(roles);
      navigate({ to: target as never });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro pós-login");
    }
  };

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-xl border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight">Entrar</h1>
        <p className="mt-1 text-sm text-muted-foreground">Acesse sua conta Canto Pronto.</p>

        <button
          type="button"
          onClick={onGoogle}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-md border bg-background py-2.5 text-sm font-medium hover:bg-secondary"
        >
          <GoogleIcon /> Continuar com Google
        </button>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> ou <div className="h-px flex-1 bg-border" />
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <Field label="E-mail" type="email" placeholder="voce@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Field label="Senha" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-95 disabled:opacity-60"
          >
            {loading ? "Aguarde…" : "Entrar"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => navigate({ to: "/criar-conta" })}
          className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
        >
          Não tem conta? Criar conta
        </button>

        {seedMsg && (
          <div className="mt-6 rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
            <span className="font-semibold">Conta demo:</span> {seedMsg}
          </div>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:underline">Voltar ao início</Link>
        </p>
      </div>
    </main>
  );
}

function Field({ label, ...rest }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <input
        {...rest}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.9 6.6 29.2 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24s8.7 19.5 19.5 19.5c10.1 0 18.7-7.4 19.4-16.8-.1-.8-.2-1.5-.3-2.2z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.3 19 13.5 24 13.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.9 7.6 29.2 5.5 24 5.5 16.3 5.5 9.7 9.5 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 43.5c5.1 0 9.7-1.9 13.2-5.1l-6.1-5c-2 1.4-4.5 2.2-7.1 2.2-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.7 38.6 16.3 43.5 24 43.5z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.1 5c-.4.4 6.4-4.7 6.4-14.7 0-1.3-.1-2.3-.4-3.5z"/>
    </svg>
  );
}
