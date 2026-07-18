import {
  type ImageTo3DJob,
  type ImageTo3DJobResult,
  type ImageTo3DOptions,
  type ImageTo3DProvider,
  type ProviderJobStatus,
  InsufficientCreditsError,
} from "./types";

/**
 * Cliente da API do 3D AI Studio (Tripo image-to-3D).
 * Docs: https://www.3daistudio.com/Platform/API/Documentation
 *
 * Fluxo: POST /v1/3d-models/tripo/image-to-3d/ (imagem em data URI base64)
 * → { task_id } → GET /v1/generation-request/<task_id>/status/ até FINISHED
 * → results[0].asset é a URL do GLB (expira em 24h — por isso o status route
 * copia o arquivo pro Supabase Storage assim que fica pronto).
 */
const BASE_URL = "https://api.3daistudio.com/v1";

function apiKey(): string {
  const key = process.env.THREEDAI_STUDIO_API_KEY;
  if (!key) throw new Error("THREEDAI_STUDIO_API_KEY não configurada");
  return key;
}

function mapStatus(raw: string): ProviderJobStatus {
  switch (raw.toUpperCase()) {
    case "FINISHED":
    case "COMPLETED":
    case "SUCCEEDED":
      return "completed";
    case "FAILED":
    case "ERROR":
    case "CANCELLED":
      return "failed";
    case "QUEUED":
    case "PENDING":
    case "CREATED":
      return "queued";
    default:
      return "processing"; // PROCESSING, RUNNING, etc.
  }
}

export const threeDAIStudioProvider: ImageTo3DProvider = {
  name: "3daistudio",

  async generate(image, options?: ImageTo3DOptions): Promise<ImageTo3DJob> {
    const base64 = Buffer.from(image.buffer).toString("base64");
    const detailed = options?.quality === "pro";

    const res = await fetch(`${BASE_URL}/3d-models/tripo/image-to-3d/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: `data:${image.mimeType};base64,${base64}`,
        texture: true,
        pbr: true,
        texture_quality: detailed ? "detailed" : "standard",
        geometry_quality: detailed ? "detailed" : "standard",
        enable_image_autofix: true,
      }),
    });

    if (res.status === 402) throw new InsufficientCreditsError();
    if (!res.ok) {
      throw new Error(`3D AI Studio: ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as { task_id: string };
    return { jobId: data.task_id, status: "queued" };
  },

  async getStatus(jobId: string): Promise<ImageTo3DJobResult> {
    const res = await fetch(
      `${BASE_URL}/generation-request/${encodeURIComponent(jobId)}/status/`,
      {
        headers: { Authorization: `Bearer ${apiKey()}` },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      throw new Error(`3D AI Studio: ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as {
      status: string;
      progress?: number;
      failure_reason?: string | null;
      results?: Array<{ asset: string; asset_type: string }>;
    };

    const model = data.results?.find((r) => r.asset_type === "3D_MODEL");

    return {
      jobId,
      status: mapStatus(data.status),
      progress: data.progress,
      outputs: model ? { glb: model.asset } : undefined,
      error: data.failure_reason ?? undefined,
    };
  },
};

/** Provedor ativo — trocar aqui se migrar de fornecedor. */
export const activeProvider: ImageTo3DProvider = threeDAIStudioProvider;
