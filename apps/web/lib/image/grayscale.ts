import type { Heightmap } from "../geometry/lithophane";

/**
 * Converte um arquivo de imagem em heightmap de luminância (browser only).
 * Redimensiona pra no máximo `maxSamples` colunas — resolução suficiente
 * pra impressão sem estourar a malha (cada pixel vira um vértice).
 */
export async function imageToHeightmap(
  file: File,
  maxSamples = 220
): Promise<Heightmap> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSamples / bitmap.width);
  const width = Math.max(2, Math.round(bitmap.width * scale));
  const height = Math.max(2, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D não disponível");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const { data: rgba } = ctx.getImageData(0, 0, width, height);
  const data = new Float32Array(width * height);
  for (let i = 0; i < data.length; i++) {
    const r = rgba[i * 4];
    const g = rgba[i * 4 + 1];
    const b = rgba[i * 4 + 2];
    // luminância perceptual (Rec. 709)
    data[i] = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  }

  return { width, height, data };
}
