import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden: admin role required");
}

const DEMO_SEED = [
  {
    title: "Apartamento Demo · Pituba",
    address: "Av. Manoel Dias da Silva, 1234 — Pituba",
    neighborhood: "Pituba",
    description: "Imóvel de demonstração para testes do painel administrativo.",
    price: 2400,
    deposit: 2400,
    area: 75,
    bedrooms: 2,
    bathrooms: 1,
    image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
    images: ["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800"],
    amenities: ["Garagem", "Elevador"],
  },
  {
    title: "Casa Demo · Brotas",
    address: "Rua Caetano Moura, 567 — Brotas",
    neighborhood: "Brotas",
    description: "Imóvel de demonstração para testes do painel administrativo.",
    price: 1800,
    deposit: 1800,
    area: 110,
    bedrooms: 3,
    bathrooms: 2,
    image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800",
    images: ["https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800"],
    amenities: ["Quintal", "Garagem"],
  },
  {
    title: "Studio Demo · Ondina",
    address: "Av. Oceânica, 890 — Ondina",
    neighborhood: "Ondina",
    description: "Imóvel de demonstração para testes do painel administrativo.",
    price: 3100,
    deposit: 3100,
    area: 45,
    bedrooms: 1,
    bathrooms: 1,
    image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
    images: ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800"],
    amenities: ["Mobiliado", "Vista para o mar"],
  },
];

export const seedDemoProperties = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    const { data: existing } = await supabase
      .from("properties")
      .select("id")
      .eq("is_demo", true)
      .eq("owner_id", userId);
    if (existing && existing.length > 0) {
      return { ok: true, inserted: 0, total: existing.length };
    }

    const rows = DEMO_SEED.map((p) => ({
      ...p,
      owner_id: userId,
      certification: "parede_seca" as const,
      score: 95,
      status: "active" as const,
      is_demo: true,
    }));

    const { data, error } = await supabase.from("properties").insert(rows).select("id");
    if (error) throw new Error(error.message);
    return { ok: true, inserted: data?.length ?? 0, total: data?.length ?? 0 };
  });

export const listDemoProperties = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .eq("is_demo", true)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const updateDemoProperty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        patch: z.object({
          title: z.string().min(1).optional(),
          neighborhood: z.string().min(1).optional(),
          address: z.string().min(1).optional(),
          description: z.string().optional(),
          price: z.number().positive().optional(),
          deposit: z.number().nonnegative().optional(),
          bedrooms: z.number().int().nonnegative().optional(),
          bathrooms: z.number().int().nonnegative().optional(),
          area: z.number().int().positive().optional(),
        }),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { error } = await supabase
      .from("properties")
      .update(data.patch)
      .eq("id", data.id)
      .eq("is_demo", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteDemoProperty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { error } = await supabase
      .from("properties")
      .delete()
      .eq("id", data.id)
      .eq("is_demo", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const simulateDemoContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ property_id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    const { data: prop, error: propErr } = await supabase
      .from("properties")
      .select("*")
      .eq("id", data.property_id)
      .eq("is_demo", true)
      .maybeSingle();
    if (propErr) throw new Error(propErr.message);
    if (!prop) throw new Error("Imóvel demo não encontrado.");

    const proposalRow = {
      property_id: prop.id,
      tenant_id: userId,
      owner_id: userId,
      status: "signed" as const,
      monthly_price: Number(prop.price),
      deposit: Number(prop.deposit),
      extra_deposit: 0,
      escrow_amount: Number(prop.deposit),
      property_snapshot: {
        title: prop.title,
        neighborhood: prop.neighborhood,
        address: prop.address,
        image: prop.image,
      },
      signature_name: "Demonstração",
      checked_in: false,
      is_demo: true,
    };

    const { data: prop2, error: pErr } = await supabase
      .from("proposals")
      .insert(proposalRow)
      .select("id")
      .single();
    if (pErr) throw new Error(pErr.message);

    const contractRow = {
      proposal_id: prop2.id,
      pdf_path: `demo/contracts/${prop2.id}.pdf`,
      pdf_hash: `demo-${prop2.id}`,
      signed_by_tenant: true,
      signed_by_owner: true,
      signed_by_tenant_at: new Date().toISOString(),
      signed_by_owner_at: new Date().toISOString(),
      is_demo: true,
    };
    const { data: contract, error: cErr } = await supabase
      .from("contracts")
      .insert(contractRow)
      .select("id")
      .single();
    if (cErr) throw new Error(cErr.message);

    return { ok: true, proposal_id: prop2.id, contract_id: contract.id };
  });

export const listDemoContracts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { data, error } = await supabase
      .from("contracts")
      .select("*, proposals!inner(property_snapshot, monthly_price, signature_name)")
      .eq("is_demo", true)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });
