import {
  type ImageTo3DJob,
  type ImageTo3DJobResult,
  type ImageTo3DOptions,
  type ImageTo3DProvider,
  type ProviderJobStatus,
  InsufficientCreditsError,
} from "./types";

const BASE_URL = "https://api.3daistudio.com/v1";

function apiKey(): string {
  const key = process.env.THREEDAI_STUDIO_API_KEY;
  if (!key) throw new Error("THREEDAI_STUDIO_API_KEY não configurada");
  return key;
}

function mapStatus(raw: string): ProviderJobStatus {
  switch (raw) {
    case "completed":
    case "succeeded":
      return "completed";
    case "failed":
    case "error":
      return "failed";
    case "queued":
    case "pending":
      return "queued";
    default:
      return "processing";
  }
}

export const threeDAIStudioProvider: ImageTo3DProvider = {
  name: "3daistudio",

  async generate(image, options?: ImageTo3DOptions): Promise<ImageTo3DJob> {
    const form = new FormData();
    form.append(
      "image",
      new Blob([image.buffer], { type: image.mimeType }),
      "input"
    );
    form.append("mode", options?.quality === "pro" ? "pro" : "rapid");

    const res = await fetch(`${BASE_URL}/image-to-3d`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey()}` },
      body: form,
    });

    if (res.status === 402) throw new InsufficientCreditsError();
    if (!res.ok) {
      throw new Error(`3D AI Studio: ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as { id: string; status?: string };
    return { jobId: data.id, status: mapStatus(data.status ?? "queued") };
  },

  async getStatus(jobId: string): Promise<ImageTo3DJobResult> {
    const res = await fetch(`${BASE_URL}/jobs/${encodeURIComponent(jobId)}`, {
      headers: { Authorization: `Bearer ${apiKey()}` },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`3D AI Studio: ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as {
      id: string;
      status: string;
      progress?: number;
      outputs?: Record<string, string>;
      error?: string;
    };

    return {
      jobId: data.id,
      status: mapStatus(data.status),
      progress: data.progress,
      outputs: data.outputs as ImageTo3DJobResult["outputs"],
      error: data.error,
    };
  },
};

/** Provedor ativo — trocar aqui se migrar de fornecedor. */
export const activeProvider: ImageTo3DProvider = threeDAIStudioProvider;
