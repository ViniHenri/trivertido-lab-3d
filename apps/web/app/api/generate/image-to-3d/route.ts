import { NextResponse } from "next/server";
import { activeProvider } from "@/lib/providers/3daistudio";
import { InsufficientCreditsError } from "@/lib/providers/types";
import {
  getSupabaseAdminClient,
  LAB_GENERATIONS_TABLE,
} from "@/lib/supabase/client";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(req: Request) {
  if (!checkRateLimit(getClientIp(req))) {
    return NextResponse.json(
      { error: "Muitas requisições. Aguarde um minuto e tente de novo." },
      { status: 429 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("image");
  const quality = formData.get("quality") === "pro" ? "pro" : "rapid";

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Envie uma imagem no campo 'image'." },
      { status: 400 }
    );
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Formato inválido. Use JPG, PNG ou WebP." },
      { status: 400 }
    );
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "Imagem muito grande. Máximo de 10MB." },
      { status: 400 }
    );
  }

  try {
    const job = await activeProvider.generate(
      { buffer: await file.arrayBuffer(), mimeType: file.type },
      { quality }
    );

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from(LAB_GENERATIONS_TABLE)
      .insert({
        tool: "image-to-3d",
        status: "processing",
        params: { quality, fileName: file.name },
        provider_job_id: job.jobId,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Erro ao registrar geração:", error);
    }

    return NextResponse.json({
      jobId: job.jobId,
      generationId: data?.id ?? null,
    });
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return NextResponse.json(
        {
          error:
            "Créditos de geração esgotados no momento. Tente novamente mais tarde.",
        },
        { status: 402 }
      );
    }
    console.error(err);
    return NextResponse.json(
      { error: "Falha ao iniciar a geração 3D." },
      { status: 500 }
    );
  }
}
