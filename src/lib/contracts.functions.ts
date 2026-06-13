import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const generateContractPdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { proposalId: string }) => {
    if (!input || typeof input.proposalId !== "string" || input.proposalId.length > 100) {
      throw new Error("proposalId inválido");
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. load proposal — RLS enforces participant
    const { data: pr, error: prErr } = await supabase
      .from("proposals")
      .select("*")
      .eq("id", data.proposalId)
      .maybeSingle();
    if (prErr) throw prErr;
    if (!pr) throw new Error("Proposta não encontrada");
    if (pr.tenant_id !== userId && pr.owner_id !== userId) {
      throw new Error("Sem permissão");
    }

    // 2. generate PDF
    const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595, 842]); // A4
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

    const snap = (pr.property_snapshot ?? {}) as Record<string, unknown>;
    const title = String(snap.title ?? "Imóvel");
    const neighborhood = String(snap.neighborhood ?? "—");
    const monthly = Number(pr.monthly_price);
    const deposit = Number(pr.deposit);
    const extraDeposit = Number(pr.extra_deposit);
    const escrow = Number(pr.escrow_amount);

    let y = 800;
    const draw = (text: string, opts: { size?: number; font?: typeof font; color?: ReturnType<typeof rgb> } = {}) => {
      page.drawText(text, {
        x: 50,
        y,
        size: opts.size ?? 11,
        font: opts.font ?? font,
        color: opts.color ?? rgb(0.1, 0.1, 0.1),
      });
      y -= (opts.size ?? 11) + 6;
    };

    draw("CONTRATO DE LOCAÇÃO RESIDENCIAL POR TEMPORADA", { size: 14, font: bold });
    draw("Canto Pronto — Plataforma de locação verificada", { size: 9, color: rgb(0.4, 0.4, 0.4) });
    y -= 10;

    draw("PARTES", { size: 12, font: bold });
    draw(`Locador (proprietário): ${pr.owner_id}`);
    draw(`Locatário (inquilino): ${pr.tenant_id}`);
    y -= 6;

    draw("IMÓVEL", { size: 12, font: bold });
    draw(`Identificação: ${title}`);
    draw(`Bairro: ${neighborhood}`);
    draw(`ID interno: ${pr.property_id}`);
    y -= 6;

    draw("VALORES", { size: 12, font: bold });
    draw(`Aluguel mensal: R$ ${monthly.toLocaleString("pt-BR")}`);
    draw(`Caução: R$ ${deposit.toLocaleString("pt-BR")}`);
    draw(`Caução adicional (sem passaporte): R$ ${extraDeposit.toLocaleString("pt-BR")}`);
    draw(`Valor em escrow na entrada: R$ ${escrow.toLocaleString("pt-BR")}`);
    y -= 6;

    draw("CLÁUSULAS PRINCIPAIS", { size: 12, font: bold });
    const clauses = [
      "1. O valor de entrada fica retido em conta-escrow da Canto Pronto até confirmação de check-in pelo locatário.",
      "2. A vistoria de entrada com fotos é parte integrante deste contrato e deve ser assinada por ambas as partes.",
      "3. Chamados de manutenção devem ser respondidos pelo locador em até 72h corridas.",
      "4. Em caso de não-resposta, o locatário pode acionar o Protocolo de Reparo Autônomo com desconto no próximo aluguel.",
      "5. Ao encerrar, é obrigatória vistoria de saída. Divergências serão mediadas pela Canto Pronto.",
      "6. Taxa de serviço da plataforma: 5% do valor de entrada, retida no escrow.",
    ];
    clauses.forEach((c) => draw(c, { size: 10 }));
    y -= 10;

    draw(`Gerado em ${new Date().toLocaleString("pt-BR")} — ID Proposta ${pr.id}`, {
      size: 8,
      color: rgb(0.5, 0.5, 0.5),
    });

    const bytes = await pdf.save();

    // 3. compute hash (SHA-256)
    const buf = new Uint8Array(bytes).slice().buffer;
    const digest = await crypto.subtle.digest("SHA-256", buf);
    const hash = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // 4. upload via service role (bypass RLS)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const path = `${pr.id}/contract.pdf`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("contracts")
      .upload(path, bytes, { contentType: "application/pdf", upsert: true });
    if (upErr) throw upErr;

    // 5. upsert contracts row
    const { error: rowErr } = await supabaseAdmin
      .from("contracts")
      .upsert(
        {
          proposal_id: pr.id,
          pdf_path: path,
          pdf_hash: hash,
          generated_at: new Date().toISOString(),
        },
        { onConflict: "proposal_id" },
      );
    if (rowErr) throw rowErr;

    return { path, hash };
  });
