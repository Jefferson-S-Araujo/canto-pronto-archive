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
// Uses the user-scoped client (no service role) — errors are swallowed so
// login flows never block when the role row cannot be created.
export const ensureDefaultRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    try {
      const { data: existing } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      if (!existing || existing.length === 0) {
        await supabase.from("user_roles").insert({ user_id: userId, role: "tenant" });
      }
    } catch {
      // best-effort — never fail login because of role bootstrap
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

// Demo admin seeding disabled — requires service role key which is not
// available. Kept as a no-op so existing callers keep compiling.
export const seedDemoAdmin = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({}).optional().parse(input ?? {}))
  .handler(async () => {
    return { ok: false, disabled: true as const, message: "Seeding desabilitado." };
  });
