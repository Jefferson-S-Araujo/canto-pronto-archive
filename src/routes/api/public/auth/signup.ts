import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const signupSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  userType: z.enum(["tenant", "owner"], {
    errorMap: () => ({ message: "Tipo de usuário inválido" }),
  }),
});

export const Route = createFileRoute("/api/public/auth/signup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const { name, email, password, userType } = signupSchema.parse(body);

          const { supabaseAdmin } = await import(
            "@/integrations/supabase/client.server"
          );

          // Check if user already exists
          const { data: existingUsers, error: listErr } =
            await supabaseAdmin.auth.admin.listUsers({
              page: 1,
              perPage: 500,
            });

          if (listErr) {
            throw new Error("Erro ao verificar usuários: " + listErr.message);
          }

          const userExists = existingUsers.users.some(
            (u) => u.email?.toLowerCase() === email.toLowerCase()
          );

          if (userExists) {
            return new Response(
              JSON.stringify({
                ok: false,
                message: "Este e-mail já está cadastrado",
              }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              }
            );
          }

          // Create auth user
          const { data: authUser, error: createErr } =
            await supabaseAdmin.auth.admin.createUser({
              email,
              password,
              email_confirm: true,
              user_metadata: { name },
            });

          if (createErr) {
            throw new Error("Erro ao criar usuário: " + createErr.message);
          }

          const userId = authUser.user?.id;
          if (!userId) {
            throw new Error("Falha ao obter ID do usuário criado");
          }

          // Assign role based on userType
          const roleToAssign = userType === "owner" ? "owner" : "tenant";
          const { error: roleErr } = await supabaseAdmin
            .from("user_roles")
            .insert({ user_id: userId, role: roleToAssign });

          if (roleErr) {
            throw new Error("Erro ao atribuir role: " + roleErr.message);
          }

          return Response.json({
            ok: true,
            message: "Conta criada com sucesso!",
            userId,
            email,
            userType,
          });
        } catch (error) {
          const message =
            error instanceof z.ZodError
              ? error.errors.map((e) => e.message).join(", ")
              : error instanceof Error
                ? error.message
                : "Erro desconhecido ao criar conta";

          return new Response(
            JSON.stringify({
              ok: false,
              message,
            }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
      },
    },
  },
});
