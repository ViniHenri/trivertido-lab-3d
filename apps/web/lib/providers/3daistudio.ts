import {
  type ImageTo3DJob,
  type ImageTo3DJobResult,
  type ImageTo3DOptions,
  type ImageTo3DProvider,
  type ProviderJobStatus,
  InsufficientCreditsError,
} from "./types";

/**
 * Cliente da API do 3D AI Studio — 3 motores de geração, um provider só.
 * Docs: https://www.3daistudio.com/Platform/API/Documentation
 *
 * Todos os motores seguem o mesmo fluxo assíncrono: POST no endpoint do
 * motor → { task_id } → GET /v1/generation-request/<task_id>/status/ até
 * FINISHED → results[].asset é a URL do GLB (expira — por isso o status
 * route copia pro Supabase Storage assim que fica pronto).
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
      return "processing";
  }
}

/** Endpoint + corpo do POST variam por motor; o resto do fluxo é idêntico. */
function buildRequest(
  engine: ImageTo3DOptions["engine"],
  dataUri: string
): { path: string; body: Record<string, unknown> } {
  switch (engine) {
    case "trellis":
      return {
        path: "/3d-models/trellis2/generate/",
        body: { image: dataUri, textures: true, resolution: "1024" },
      };
    case "hunyuan":
      return {
        path: "/3d-models/tencent/generate/pro/",
        body: { model: "3.1", image: dataUri, enable_pbr: true },
      };
    case "tripo":
    default:
      return {
        path: "/3d-models/tripo/image-to-3d/",
        body: {
          image: dataUri,
          texture: true,
          pbr: true,
          enable_image_autofix: true,
        },
      };
  }
}

export const threeDAIStudioProvider: ImageTo3DProvider = {
  name: "3daistudio",

  async generate(image, options?: ImageTo3DOptions): Promise<ImageTo3DJob> {
    const base64 = Buffer.from(image.buffer).toString("base64");
    const dataUri = `data:${image.mimeType};base64,${base64}`;
    const { path, body } = buildRequest(options?.engine, dataUri);

    const res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
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
