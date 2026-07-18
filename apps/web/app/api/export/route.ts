import { NextResponse } from "next/server";
import {
  getSupabaseAdminClient,
  LAB_GENERATIONS_TABLE,
  LAB_MODELS_BUCKET,
} from "@/lib/supabase/client";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import type { GenerationTool } from "@/lib/supabase/types";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_FORMATS = ["stl", "glb", "3mf", "svg", "dxf"] as const;
const TOOLS: GenerationTool[] = [
  "image-to-3d",
  "lithophane",
  "vase",
  "keychain",
  "sign",
  "laser-box",
  "desk-organizer",
];

/**
 * Recebe um arquivo gerado no client (STL/SVG/etc.), salva no Supabase
 * Storage e registra em lab_generations. Usado quando o cliente confirma
 * um pedido — export local puro não passa por aqui.
 */
export async function POST(req: Request) {
  if (!checkRateLimit(getClientIp(req))) {
    return NextResponse.json(
      { error: "Muitas requisições. Aguarde um minuto." },
      { status: 429 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const tool = formData.get("tool") as GenerationTool | null;
  const format = formData.get("format") as string | null;
  const paramsRaw = formData.get("params");

  if (!(file instanceof File) || !tool || !format) {
    return NextResponse.json(
      { error: "Campos file, tool e format são obrigatórios." },
      { status: 400 }
    );
  }
  if (!TOOLS.includes(tool)) {
    return NextResponse.json({ error: "Ferramenta inválida." }, { status: 400 });
  }
  if (!(ALLOWED_FORMATS as readonly string[]).includes(format)) {
    return NextResponse.json({ error: "Formato inválido." }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "Arquivo muito grande. Máximo de 50MB." },
      { status: 400 }
    );
  }

  let params: Record<string, unknown> = {};
  if (typeof paramsRaw === "string") {
    try {
      params = JSON.parse(paramsRaw);
    } catch {
      // params inválidos não impedem o upload
    }
  }

  const supabase = getSupabaseAdminClient();
  const filePath = `${tool}/${crypto.randomUUID()}.${format}`;

  const { error: uploadError } = await supabase.storage
    .from(LAB_MODELS_BUCKET)
    .upload(filePath, await file.arrayBuffer(), {
      contentType: file.type || "application/octet-stream",
    });

  if (uploadError) {
    console.error(uploadError);
    return NextResponse.json(
      { error: "Falha ao salvar o arquivo." },
      { status: 500 }
    );
  }

  const { data, error } = await supabase
    .from(LAB_GENERATIONS_TABLE)
    .insert({
      tool,
      status: "completed",
      params,
      file_path: filePath,
      file_format: format,
    })
    .select("id")
    .single();

  if (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Arquivo salvo, mas o registro falhou." },
      { status: 500 }
    );
  }

  return NextResponse.json({ generationId: data.id, filePath });
}
