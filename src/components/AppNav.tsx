import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Home, Search, User, Building2, Shield, LogIn, LogOut, QrCode } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { getMyRoles, type AppRole } from "@/lib/auth.functions";

type NavLink = { to: string; label: string; icon: typeof Home };

const PUBLIC_LINKS: NavLink[] = [
  { to: "/", label: "Início", icon: Home },
  { to: "/buscar", label: "Buscar", icon: Search },
];

const TENANT_LINK: NavLink = { to: "/inquilino", label: "Inquilino", icon: User };
const OWNER_LINK: NavLink = { to: "/proprietario", label: "Proprietário", icon: Building2 };
const ADMIN_LINK: NavLink = { to: "/admin", label: "Admin", icon: Shield };

export function AppNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user: mockUser, logout: mockLogout } = useStore();

  // Real Supabase session (source of truth when present)
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setSessionUserId(data.user?.id ?? null);
      setSessionEmail(data.user?.email ?? null);
      setSessionReady(true);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      setSessionUserId(session?.user?.id ?? null);
      setSessionEmail(session?.user?.email ?? null);
      setSessionReady(true);
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Fetch real roles from DB whenever signed in
  const { data: rolesData } = useQuery({
    queryKey: ["my-roles", sessionUserId],
    queryFn: () => getMyRoles(),
    enabled: !!sessionUserId,
    staleTime: 30_000,
  });

  const realRoles: AppRole[] = rolesData?.roles ?? [];
  const isAuthenticated = !!sessionUserId || !!mockUser?.isAuthenticated;

  // Real role wins; admin > owner > tenant
  let role: AppRole | null = null;
  if (sessionUserId) {
    if (realRoles.includes("admin")) role = "admin";
    else if (realRoles.includes("owner")) role = "owner";
    else if (realRoles.includes("tenant")) role = "tenant";
  } else if (mockUser?.isAuthenticated) {
    role = mockUser.role;
  }

  console.log("Auth state:", { sessionUserId, sessionEmail, realRoles, role });

  const links: NavLink[] = [...PUBLIC_LINKS];

  // CORREÇÃO: Se estiver autenticado, garante o link de Proprietário visível para evitar sumiço
  if (isAuthenticated) {
    if (role === "admin") {
      links.push(TENANT_LINK, OWNER_LINK, ADMIN_LINK);
    } else if (role === "tenant") {
      links.push(TENANT_LINK, OWNER_LINK); // Deixa proprietário visível como atalho
    } else {
      // Por padrão, exibe Proprietário para evitar loops enquanto as roles carregam
      links.push(OWNER_LINK);
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
    mockLogout();
    qc.clear();
    // Força recarregamento completo para limpar estados residuais do navegador
    window.location.href = "/";
  };

  const displayName = sessionEmail || mockUser?.name || "";

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
            C
          </div>
          <span className="font-semibold tracking-tight">Canto Pronto</span>
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => {
            const Icon = l.icon;
            const active = path === l.to || (l.to !== "/" && path.startsWith(l.to));
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-secondary text-secondary-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                }`}
              >
                <Icon className="h-4 w-4" />
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden md:flex items-center gap-2">
          <Link
            to="/qr"
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium hover:bg-secondary"
            title="Abrir no celular"
          >
            <QrCode className="h-4 w-4" /> Celular
          </Link>
          {isAuthenticated && sessionReady ? (
            <div className="flex items-center gap-2">
              {/* Botão extra de perfil/painel rápido para garantir navegação */}
              <Link
                to="/proprietario"
                className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 text-primary px-3 py-2 text-sm font-medium hover:bg-primary/20 transition-colors"
              >
                <User className="h-4 w-4" /> Painel
              </Link>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium hover:bg-secondary text-destructive"
                title={displayName}
              >
                <LogOut className="h-4 w-4" /> Sair
              </button>
            </div>
          ) : (
            <Link
              to="/entrar"
              className="inline-flex items-center gap-1.5 rounded-md border bg-primary text-primary-foreground px-3 py-2 text-sm font-medium hover:opacity-90"
            >
              <LogIn className="h-4 w-4" /> Entrar
            </Link>
          )}
        </div>
      </div>
      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${links.length}, minmax(0, 1fr))` }}>
          {links.map((l) => {
            const Icon = l.icon;
            const active = path === l.to || (l.to !== "/" && path.startsWith(l.to));
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`flex flex-col items-center gap-0.5 py-2 text-[10px] ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                {l.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
