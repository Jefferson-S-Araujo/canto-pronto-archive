import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AppRole = "admin" | "owner" | "tenant";

// Returns the role(s) of the currently authenticated user.
export const getMyRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    const roles = (data ?? []).map((r) => r.role as AppRole);
    return { userId, roles };
  });

// Ensure the current user has at least one role; assign 'tenant' as default.
// Uses service role (admin client) because RLS forbids inserts from end users.
export const ensureDefaultRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing, error: selErr } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (selErr) throw new Error(selErr.message);
    if (!existing || existing.length === 0) {
      const { error: insErr } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: userId, role: "tenant" });
      if (insErr) throw new Error(insErr.message);
    }
    return { ok: true };
  });

// Server-side guard for protected routes. Throws if user is not admin.
export const requireAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Forbidden: admin role required");
    return { ok: true as const, userId };
  });

// Seeds the demo admin (admin@cantopronto.com / admin123). Idempotent.
export const seedDemoAdmin = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({}).optional().parse(input ?? {}))
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = "admin@cantopronto.com";
    const password = "admin123";

    // Check if user already exists
    let userId: string | null = null;
    const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listErr) throw new Error(listErr.message);
    const existing = list.users.find((u) => u.email?.toLowerCase() === email);
    if (existing) {
      userId = existing.id;
    } else {
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name: "Administrador Demo" },
      });
      if (createErr) throw new Error(createErr.message);
      userId = created.user?.id ?? null;
    }
    if (!userId) throw new Error("Falha ao criar admin demo");

    // Ensure admin role
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
    if (roleErr) throw new Error(roleErr.message);

    return { ok: true, userId, email };
  });
