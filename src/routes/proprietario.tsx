import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dashboard } from "@/components/Dashboard";
import { AdminUsersPanel } from "@/components/AdminUsersPanel";
import { supabase } from "@/integrations/supabase/client";
import { getMyRoles } from "@/lib/auth.functions";

function ProprietarioPage() {
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setSessionUserId(data.user?.id ?? null);
      setSessionReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSessionUserId(session?.user?.id ?? null);
      setSessionReady(true);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const { data: rolesData } = useQuery({
    queryKey: ["my-roles", sessionUserId],
    queryFn: () => getMyRoles(),
    enabled: !!sessionUserId,
    staleTime: 30_000,
  });

  if (!sessionReady) {
    return <main className="mx-auto max-w-7xl px-4 py-16 text-center text-muted-foreground">Carregando sessão...</main>;
  }

  const isAdmin = !!rolesData?.roles?.includes("admin");
  if (sessionUserId && isAdmin) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Proprietários</h1>
          <p className="text-sm text-muted-foreground">Visão de administrador — todos os proprietários cadastrados.</p>
        </header>
        <AdminUsersPanel role="owner" />
      </main>
    );
  }

  return <Dashboard role="owner" />;
}

export const Route = createFileRoute("/proprietario")({
  component: ProprietarioPage,
});
