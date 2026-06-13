import { createFileRoute } from "@tanstack/react-router";
import { seedDemoAdmin } from "@/lib/auth.functions";

// Idempotent endpoint to provision the demo admin account.
// Public on purpose (no PII returned) — call once after deploy or from the login page.
export const Route = createFileRoute("/api/public/seed-demo-admin")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const res = await seedDemoAdmin({ data: {} });
          return Response.json(res);
        } catch (e) {
          const message = e instanceof Error ? e.message : "Unknown error";
          return new Response(JSON.stringify({ ok: false, error: message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
      GET: async () => {
        try {
          const res = await seedDemoAdmin({ data: {} });
          return Response.json(res);
        } catch (e) {
          const message = e instanceof Error ? e.message : "Unknown error";
          return new Response(JSON.stringify({ ok: false, error: message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
