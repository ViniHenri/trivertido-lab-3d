import { NextResponse } from "next/server";
import {
  getSupabaseAdminClient,
  LAB_GENERATIONS_TABLE,
  LAB_MODELS_BUCKET,
} from "@/lib/supabase/client";
import { sendPrintOrderToN8n } from "@/lib/n8n/webhook";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import type { GenerationTool, LabGeneration } from "@/lib/supabase/types";

export const runtime = "nodejs";

interface OrderBody {
  generationId: string;
  customerName: string;
  customerPhone: string;
  filamentColor?: string;
  notes?: string;
}

const TOOL_LABELS: Record<GenerationTool, string> = {
  "image-to-3d": "Image to 3D",
  lithophane: "Litofania",
  vase: "Vaso",
  keychain: "Chaveiro",
  sign: "Placa",
  "laser-box": "Caixa laser",
  "desk-organizer": "Organizador",
};

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
      .createSignedUrl(generation.file_path, 60 * 60 * 24 * 365);
    modelUrl = signed?.signedUrl ?? null;
  }

  // Uso interno: o pedido vira tarefa direto no Kanban (tabela `tasks`).
  // Sem intermediário — não depende de n8n/WhatsApp pra aparecer no board.
  const taskTitle = `${TOOL_LABELS[generation.tool]} — Lab 3D`;
  const { error: taskError } = await supabase.from("tasks").insert({
    title: taskTitle,
    client: body.customerName,
    status: "cotacao",
    material: body.filamentColor ?? null,
    link: modelUrl,
  });

  if (taskError) {
    // Coluna `link` pode não existir ainda (precisa rodar a migração uma vez).
    // Tenta de novo sem ela pra não travar a criação da tarefa.
    console.error("Falha ao criar tarefa com link, tentando sem:", taskError);
    const { error: fallbackError } = await supabase.from("tasks").insert({
      title: taskTitle,
      client: body.customerName,
      status: "cotacao",
      material: body.filamentColor ?? null,
    });
    if (fallbackError) console.error("Falha ao criar tarefa:", fallbackError);
  }

  // n8n/WhatsApp é opcional agora — só dispara se estiver configurado.
  if (process.env.N8N_WEBHOOK_URL) {
    try {
      await sendPrintOrderToN8n({ generation, modelUrl });
    } catch (err) {
      console.error("Falha no webhook n8n (não bloqueante):", err);
    }
  }

  return NextResponse.json({ ok: true, generationId: generation.id });
}
