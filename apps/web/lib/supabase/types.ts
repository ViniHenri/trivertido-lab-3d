export type GenerationTool =
  | "image-to-3d"
  | "lithophane"
  | "vase"
  | "keychain"
  | "sign"
  | "laser-box"
  | "desk-organizer";

export type GenerationStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "ordered";

export interface LabGeneration {
  id: string;
  created_at: string;
  tool: GenerationTool;
  status: GenerationStatus;
  /** Parâmetros usados na geração (dimensões, texto, cor, etc.) */
  params: Record<string, unknown>;
  /** Caminho do arquivo no Supabase Storage (bucket lab-models) */
  file_path: string | null;
  file_format: "stl" | "glb" | "3mf" | "svg" | "dxf" | null;
  /** Job id do provedor de IA, quando a ferramenta usa geração externa */
  provider_job_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  /** Cor de filamento escolhida (referência à tabela stock) */
  filament_color: string | null;
  notes: string | null;
}

export type LabGenerationInsert = Omit<LabGeneration, "id" | "created_at"> &
  Partial<Pick<LabGeneration, "id" | "created_at">>;
