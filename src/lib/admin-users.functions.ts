import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AdminUserRow = {
  id: string;
  email: string;
  full_name: string;
  role: "tenant" | "owner" | "admin" | "none";
  doc_status: "none" | "pending" | "approved" | "rejected";
  created_at: string;
};

// Lists users by role. Requires the caller to be an admin.
// Combines auth.users (email/created_at) with user_roles and tenant_passport.
export const listUsersByRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ role: z.enum(["tenant", "owner", "admin"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Authorize: caller must be admin
    const { data: isAdmin, error: roleErr } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (roleErr) throw new Error(roleErr.message);
    if (!isAdmin) throw new Error("Forbidden: admin role required");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Get user_ids with the requested role
    const { data: roleRows, error: rolesErr } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, created_at")
      .eq("role", data.role);
    if (rolesErr) throw new Error(rolesErr.message);

    const ids = (roleRows ?? []).map((r) => r.user_id);
    if (ids.length === 0) return [] as AdminUserRow[];

    // Passport (name + doc status)
    const { data: passports } = await supabaseAdmin
      .from("tenant_passport")
      .select("user_id, full_name, doc_status")
      .in("user_id", ids);
    const passportMap = new Map(
      (passports ?? []).map((p) => [p.user_id, p]),
    );

    // Auth users (email, created_at, metadata name)
    // listUsers is paginated; for now fetch first 1000 which covers MVP scale.
    const { data: authList, error: authErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (authErr) throw new Error(authErr.message);
    const authMap = new Map(authList.users.map((u) => [u.id, u]));

    const rows: AdminUserRow[] = ids.map((uid) => {
      const auth = authMap.get(uid);
      const passport = passportMap.get(uid);
      const metaName =
        (auth?.user_metadata as { full_name?: string; name?: string } | undefined)?.full_name ||
        (auth?.user_metadata as { name?: string } | undefined)?.name ||
        "";
      return {
        id: uid,
        email: auth?.email ?? "—",
        full_name: passport?.full_name || metaName || "Sem nome",
        role: data.role,
        doc_status: (passport?.doc_status as AdminUserRow["doc_status"]) ?? "none",
        created_at: auth?.created_at ?? "",
      };
    });

    // Newest first
    rows.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
    return rows;
  });
