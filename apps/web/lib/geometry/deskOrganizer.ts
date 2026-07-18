import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export interface DeskOrganizerParams {
  /** Largura externa em mm (eixo X) */
  widthMM: number;
  /** Profundidade externa em mm (eixo Y) */
  depthMM: number;
  /** Altura externa em mm (eixo Z) */
  heightMM: number;
  /** Espessura de paredes e fundo em mm */
  wallThickness: number;
  /** Colunas de compartimentos (divisões no eixo X) */
  cols: number;
  /** Linhas de compartimentos (divisões no eixo Y) */
  rows: number;
}

export const defaultDeskOrganizerParams: DeskOrganizerParams = {
  widthMM: 150,
  depthMM: 100,
  heightMM: 60,
  wallThickness: 2.4,
  cols: 3,
  rows: 2,
};

/**
 * Gera o organizador: fundo + 4 paredes externas + divisórias internas em
 * grade uniforme (cols × rows compartimentos). Caixas sobrepostas mescladas —
 * o slicer une os sólidos na hora de fatiar. Centrado na origem, fundo em Z=0.
 * Função pura, sem rede.
 */
export function generateDeskOrganizerGeometry(
  params: DeskOrganizerParams
): THREE.BufferGeometry {
  const { widthMM: w, depthMM: d, heightMM: h, wallThickness: t, cols, rows } =
    params;

  const parts: THREE.BufferGeometry[] = [];
  const box = (
    sx: number,
    sy: number,
    sz: number,
    x: number,
    y: number,
    z: number
  ) => {
    const g = new THREE.BoxGeometry(sx, sy, sz);
    g.translate(x, y, z + sz / 2); // z recebido = base da caixa
    parts.push(g);
  };

  // fundo
  box(w, d, t, 0, 0, 0);
  // paredes externas (frente/trás ao longo de X, laterais ao longo de Y)
  box(w, t, h - t, 0, -(d - t) / 2, t);
  box(w, t, h - t, 0, (d - t) / 2, t);
  box(t, d - 2 * t, h - t, -(w - t) / 2, 0, t);
  box(t, d - 2 * t, h - t, (w - t) / 2, 0, t);

  // divisórias internas (um pouco mais baixas que as paredes, estética + economia)
  const innerH = (h - t) * 0.85;
  const innerW = w - 2 * t;
  const innerD = d - 2 * t;
  for (let c = 1; c < cols; c++) {
    const x = -innerW / 2 + (innerW / cols) * c;
    box(t, innerD, innerH, x, 0, t);
  }
  for (let r = 1; r < rows; r++) {
    const y = -innerD / 2 + (innerD / rows) * r;
    box(innerW, t, innerH, 0, y, t);
  }

  const merged = mergeGeometries(parts, false);
  return merged ?? parts[0];
}
