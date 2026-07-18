import type { LabGeneration } from "../supabase/types";

export interface PrintOrderPayload {
  generation: Pick<
    LabGeneration,
    | "id"
    | "tool"
    | "file_path"
    | "file_format"
    | "customer_name"
    | "customer_phone"
    | "filament_color"
    | "notes"
  >;
  /** URL pública/assinada do modelo no Supabase Storage */
  modelUrl: string | null;
}

/**
 * Dispara o webhook do n8n que cria a tarefa no Kanban (tabela tasks)
 * e notifica via WhatsApp (Evolution API). Server-side only.
 */
export async function sendPrintOrderToN8n(
  payload: PrintOrderPayload
): Promise<void> {
  const url = process.env.N8N_WEBHOOK_URL;
  if (!url) throw new Error("N8N_WEBHOOK_URL não configurada");

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source: "trivertido-lab", ...payload }),
  });

  if (!res.ok) {
    throw new Error(`n8n webhook falhou: ${res.status} ${await res.text()}`);
  }
}
