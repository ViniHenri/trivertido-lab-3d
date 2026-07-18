import { NextResponse } from "next/server";
import {
  getSupabaseAdminClient,
  LAB_GENERATIONS_TABLE,
  LAB_MODELS_BUCKET,
} from "@/lib/supabase/client";
import { sendPrintOrderToN8n } from "@/lib/n8n/webhook";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import type { LabGeneration } from "@/lib/supabase/types";

export const runtime = "nodejs";

interface OrderBody {
  generationId: string;
  customerName: string;
  customerPhone: string;
  filamentColor?: string;
  notes?: string;
}

export async function POST(req: Request) {
  if (!checkRateLimit(getClientIp(req))) {
    return NextResponse.json(
      { error: "Muitas requisições. Aguarde um minuto." },
      { status: 429 }
    );
  }

  const body = (await req.json().catch(() => null)) as OrderBody | null;
  if (!body?.generationId || !body.customerName || !body.customerPhone) {
    return NextResponse.json(
      { error: "generationId, customerName e customerPhone são obrigatórios." },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdminClient();

  const { data: generation, error } = await supabase
    .from(LAB_GENERATIONS_TABLE)
    .update({
      status: "ordered",
      customer_name: body.customerName,
      customer_phone: body.customerPhone,
      filament_color: body.filamentColor ?? null,
      notes: body.notes ?? null,
    })
    .eq("id", body.generationId)
    .select()
    .single<LabGeneration>();

  if (error || !generation) {
    return NextResponse.json(
      { error: "Geração não encontrada." },
      { status: 404 }
    );
  }

  let modelUrl: string | null = null;
  if (generation.file_path) {
    const { data: signed } = await supabase.storage
      .from(LAB_MODELS_BUCKET)
      .createSignedUrl(generation.file_path, 60 * 60 * 24 * 7);
    modelUrl = signed?.signedUrl ?? null;
  }

  try {
    await sendPrintOrderToN8n({ generation, modelUrl });
  } catch (err) {
    console.error("Falha no webhook n8n:", err);
    return NextResponse.json(
      { error: "Pedido registrado, mas a notificação falhou." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, generationId: generation.id });
}
