import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Users, Home } from "lucide-react";
import { listUsersByRole, type AdminUserRow } from "@/lib/admin-users.functions";

export function AdminUsersPanel({ role }: { role: "tenant" | "owner" }) {
  const listUsers = useServerFn(listUsersByRole);
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["admin", "users", role],
    queryFn: () => listUsers({ data: { role } }),
  });

  const label = role === "tenant" ? "Inquilino" : "Proprietário";
  const labelPlural = role === "tenant" ? "Inquilinos" : "Proprietários";
  const Icon = role === "tenant" ? Users : Home;
  const rows: AdminUserRow[] = data ?? [];

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">{labelPlural} cadastrados ({rows.length})</h3>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-secondary disabled:opacity-60"
        >
          {isFetching ? "Atualizando..." : "Atualizar"}
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando do banco...
        </div>
      ) : error ? (
        <div className="p-6 text-sm text-destructive">
          Erro ao carregar usuários: {error instanceof Error ? error.message : "desconhecido"}
        </div>
      ) : rows.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground">
          Nenhum {label.toLowerCase()} cadastrado ainda.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Nome</th>
                <th className="px-4 py-2 text-left">E-mail</th>
                <th className="px-4 py-2 text-left">Tipo</th>
                <th className="px-4 py-2 text-left">Documentos</th>
                <th className="px-4 py-2 text-left">Cadastrado em</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="border-t align-top">
                  <td className="px-4 py-3 font-medium">{u.full_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      role === "owner" ? "bg-primary/15 text-primary" : "bg-secondary text-foreground"
                    }`}>{label}</span>
                  </td>
                  <td className="px-4 py-3">
                    <DocBadge status={u.doc_status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString("pt-BR") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DocBadge({ status }: { status: AdminUserRow["doc_status"] }) {
  const map = {
    approved: { label: "Verificado", cls: "bg-success/15 text-success" },
    pending: { label: "Pendente", cls: "bg-warning/15 text-warning" },
    rejected: { label: "Rejeitado", cls: "bg-destructive/15 text-destructive" },
    none: { label: "Não enviado", cls: "bg-muted text-muted-foreground" },
  } as const;
  const m = map[status] ?? map.none;
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${m.cls}`}>{m.label}</span>;
}
