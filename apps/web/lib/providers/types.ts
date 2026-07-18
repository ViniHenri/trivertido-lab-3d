export type ProviderJobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed";

export interface ImageTo3DJob {
  jobId: string;
  status: ProviderJobStatus;
}

export interface ImageTo3DJobResult extends ImageTo3DJob {
  /** 0–100 quando o provedor reporta progresso */
  progress?: number;
  /** URLs de download por formato, presentes quando status === "completed" */
  outputs?: Partial<Record<"glb" | "stl" | "obj" | "fbx", string>>;
  error?: string;
}

import type { ImageTo3DEngine } from "./engines";

export interface ImageTo3DOptions {
  /** Motor de geração — ver lib/providers/engines.ts pros detalhes de cada um */
  engine?: ImageTo3DEngine;
}

/**
 * Interface comum para provedores de Image-to-3D.
 * Permite trocar 3D AI Studio por Meshy/Tripo direto sem tocar no resto do app.
 */
export interface ImageTo3DProvider {
  name: string;
  generate(
    image: { buffer: ArrayBuffer; mimeType: string },
    options?: ImageTo3DOptions
  ): Promise<ImageTo3DJob>;
  getStatus(jobId: string): Promise<ImageTo3DJobResult>;
}

export class InsufficientCreditsError extends Error {
  constructor() {
    super("insufficient_credits");
    this.name = "InsufficientCreditsError";
  }
}
