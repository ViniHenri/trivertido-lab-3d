import { NextResponse } from "next/server";
import { activeProvider } from "@/lib/providers/3daistudio";
import {
  getSupabaseAdminClient,
  LAB_GENERATIONS_TABLE,
  LAB_MODELS_BUCKET,
} from "@/lib/supabase/client";

export const runtime = "nodejs";
export const maxDuration = 60; // download+upload do GLB pode passar dos 10s default

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  try {
    const result = await activeProvider.getStatus(jobId);

    // Job pronto: persiste o modelo no Storage (uma vez só) e devolve
    // uma URL assinada nossa — o link do provedor expira.
    if (result.status === "completed" && result.outputs) {
      const supabase = getSupabaseAdminClient();
      const { data: row } = await supabase
        .from(LAB_GENERATIONS_TABLE)
        .select("id, file_path")
        .eq("provider_job_id", jobId)
        .maybeSingle();

      let filePath = row?.file_path as string | null;

      if (row && !filePath) {
        const sourceUrl = result.outputs.glb ?? result.outputs.stl;
        const format = result.outputs.glb ? "glb" : "stl";
        if (sourceUrl) {
          const modelRes = await fetch(sourceUrl);
          if (modelRes.ok) {
            filePath = `image-to-3d/${row.id}.${format}`;
            const { error: upErr } = await supabase.storage
              .from(LAB_MODELS_BUCKET)
              .upload(filePath, await modelRes.arrayBuffer(), {
                contentType: "application/octet-stream",
                upsert: true,
              });
            if (upErr) {
              console.error(upErr);
              filePath = null;
            } else {
              await supabase
                .from(LAB_GENERATIONS_TABLE)
                .update({ status: "completed", file_path: filePath, file_format: format })
                .eq("id", row.id);
            }
          }
        }
      }

      let modelUrl: string | null = null;
      if (filePath) {
        const { data: signed } = await supabase.storage
          .from(LAB_MODELS_BUCKET)
          .createSignedUrl(filePath, 60 * 60);
        modelUrl = signed?.signedUrl ?? null;
      }

      return NextResponse.json({
        ...result,
        generationId: row?.id ?? null,
        modelUrl: modelUrl ?? result.outputs.glb ?? result.outputs.stl ?? null,
      });
    }

    if (result.status === "failed") {
      const supabase = getSupabaseAdminClient();
      await supabase
        .from(LAB_GENERATIONS_TABLE)
        .update({ status: "failed" })
        .eq("provider_job_id", jobId);
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Falha ao consultar o status do job." },
      { status: 500 }
    );
  }
}
