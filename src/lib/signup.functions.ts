import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Assigns a role to the currently authenticated user. Uses the admin client
// because user_roles RLS typically forbids self-insert. Caller identity is
// verified by requireSupabaseAuth before any privileged write.
export const assignMyRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ role: z.enum(["tenant", "owner"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    // Remove any pre-existing default tenant/owner role to avoid duplicates
    await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .in("role", ["tenant", "owner"]);

    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: data.role });

    if (error) throw new Error(error.message);
    return { ok: true as const, role: data.role };
  });
