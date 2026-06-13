import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Home, Search, User, Building2, Shield, LogIn, LogOut, QrCode } from "lucide-react";
import { useStore } from "@/lib/store";

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
  const { user, logout } = useStore();

  const links: NavLink[] = [...PUBLIC_LINKS];
  if (user.isAuthenticated) {
    if (user.role === "tenant") links.push(TENANT_LINK);
    else if (user.role === "owner") links.push(OWNER_LINK);
    else if (user.role === "admin") {
      links.push(TENANT_LINK, OWNER_LINK, ADMIN_LINK);
    }
  }

  const handleLogout = () => {
    logout();
    navigate({ to: "/" });
  };

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
          {user.isAuthenticated ? (
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium hover:bg-secondary"
              title={user.name}
            >
              <LogOut className="h-4 w-4" /> Sair
            </button>
          ) : (
            <Link
              to="/entrar"
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium hover:bg-secondary"
            >
              <LogIn className="h-4 w-4" /> Entrar
            </Link>
          )}
        </div>
      </div>
      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur">
        <div
          className="grid"
          style={{ gridTemplateColumns: `repeat(${links.length}, minmax(0, 1fr))` }}
        >
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
