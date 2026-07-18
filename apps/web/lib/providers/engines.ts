export type ImageTo3DEngine = "trellis" | "tripo" | "hunyuan";

export interface EngineInfo {
  id: ImageTo3DEngine;
  label: string;
  tagline: string;
  time: string;
  credits: string;
}

/**
 * Motores de geração disponíveis na API do 3D AI Studio, com características
 * reais (tempo/custo em créditos) — cada um tem um trade-off genuíno de
 * velocidade x detalhe x preço.
 *
 * TRELLIS.2 existe na API mas está falhando 100% das tentativas nos nossos
 * testes (job sempre termina "FAILED" sem motivo, com payload idêntico ao
 * documentado) — removido da lista até confirmar que voltou a funcionar.
 * O código do provider (3daistudio.ts) já sabe montar a requisição pra ele;
 * é só adicionar de volta aqui quando testar novamente.
 */
export const IMAGE_TO_3D_ENGINES: EngineInfo[] = [
  {
    id: "tripo",
    label: "Tripo",
    tagline: "Bom equilíbrio — malha organizada, ideal pra impressão.",
    time: "~100s",
    credits: "~40 créditos",
  },
  {
    id: "hunyuan",
    label: "Hunyuan 3D Pro",
    tagline: "Mais detalhado e controlável — até 1,5M polígonos.",
    time: "3–6min",
    credits: "60–100 créditos",
  },
];
