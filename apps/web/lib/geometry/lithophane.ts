import * as THREE from "three";

/** Mapa de altura normalizado extraído de uma imagem (0 = preto, 1 = branco) */
export interface Heightmap {
  /** Colunas (pixels na horizontal) */
  width: number;
  /** Linhas (pixels na vertical) */
  height: number;
  /** Luminância por pixel, linha a linha, valores em [0, 1] */
  data: Float32Array;
}

export interface LithophaneParams {
  /** Largura física da peça em mm (altura sai da proporção da imagem) */
  widthMM: number;
  /** Espessura mínima em mm — regiões claras (deixam mais luz passar) */
  minThickness: number;
  /** Espessura máxima em mm — regiões escuras (bloqueiam mais luz) */
  maxThickness: number;
  /** Adiciona moldura na espessura máxima ao redor da imagem */
  frame: boolean;
  /** Largura da moldura em mm */
  frameWidthMM: number;
}

export const defaultLithophaneParams: LithophaneParams = {
  widthMM: 100,
  minThickness: 0.8,
  maxThickness: 3,
  frame: true,
  frameWidthMM: 4,
};

/**
 * Gera a malha sólida de uma litofania a partir de um heightmap.
 *
 * Princípio: quanto mais escuro o pixel, mais espessa a parede — a imagem
 * aparece quando a luz atravessa a peça. A frente é o relevo (Z+), o verso
 * é plano (Z=0), e as laterais fecham o sólido (malha estanque pro slicer).
 *
 * Eixos: X = largura, Y = altura, Z = espessura. Função pura, sem rede.
 */
export function generateLithophaneGeometry(
  heightmap: Heightmap,
  params: LithophaneParams
): THREE.BufferGeometry {
  const { widthMM, minThickness, maxThickness, frame, frameWidthMM } = params;

  let { width: cols, height: rows, data } = heightmap;

  // Moldura: acolchoa o heightmap com pixels de luminância 0 (espessura máxima)
  if (frame && frameWidthMM > 0) {
    const pxPerMM = cols / widthMM;
    const pad = Math.max(1, Math.round(frameWidthMM * pxPerMM));
    const newCols = cols + pad * 2;
    const newRows = rows + pad * 2;
    const padded = new Float32Array(newCols * newRows); // já zerada = moldura
    for (let y = 0; y < rows; y++) {
      padded.set(
        data.subarray(y * cols, y * cols + cols),
        (y + pad) * newCols + pad
      );
    }
    data = padded;
    cols = newCols;
    rows = newRows;
  }

  const heightMM = (widthMM * rows) / cols;
  const stepX = widthMM / (cols - 1);
  const stepY = heightMM / (rows - 1);
  const thicknessRange = maxThickness - minThickness;

  // Vértices: grade da frente (relevo) + grade do verso (plana)
  const vertsPerGrid = cols * rows;
  const positions = new Float32Array(vertsPerGrid * 2 * 3);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      const lum = data[i];
      // invertido: escuro (lum 0) = espessura máxima
      const z = minThickness + (1 - lum) * thicknessRange;
      const px = x * stepX;
      // Y invertido pra imagem não ficar de cabeça pra baixo
      const py = (rows - 1 - y) * stepY;

      positions[i * 3] = px;
      positions[i * 3 + 1] = py;
      positions[i * 3 + 2] = z;

      const j = vertsPerGrid + i;
      positions[j * 3] = px;
      positions[j * 3 + 1] = py;
      positions[j * 3 + 2] = 0;
    }
  }

  // Índices: 2 triângulos por célula em cada grade + costura das bordas
  const cellCount = (cols - 1) * (rows - 1);
  const edgeCells = 2 * (cols - 1) + 2 * (rows - 1);
  const indices = new Uint32Array(cellCount * 2 * 6 + edgeCells * 6);
  let o = 0;

  for (let y = 0; y < rows - 1; y++) {
    for (let x = 0; x < cols - 1; x++) {
      const a = y * cols + x;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      // frente (normal pra Z+)
      indices[o++] = a; indices[o++] = c; indices[o++] = b;
      indices[o++] = b; indices[o++] = c; indices[o++] = d;
      // verso (normal pra Z-, ordem invertida)
      const A = vertsPerGrid + a, B = vertsPerGrid + b;
      const C = vertsPerGrid + c, D = vertsPerGrid + d;
      indices[o++] = A; indices[o++] = B; indices[o++] = C;
      indices[o++] = B; indices[o++] = D; indices[o++] = C;
    }
  }

  // Paredes laterais: liga a borda da frente à borda do verso
  const wall = (f1: number, f2: number) => {
    const b1 = vertsPerGrid + f1;
    const b2 = vertsPerGrid + f2;
    indices[o++] = f1; indices[o++] = b1; indices[o++] = f2;
    indices[o++] = f2; indices[o++] = b1; indices[o++] = b2;
  };
  for (let x = 0; x < cols - 1; x++) {
    wall(x + 1, x); // topo (y=0 na grade, py máximo)
    wall((rows - 1) * cols + x, (rows - 1) * cols + x + 1); // base
  }
  for (let y = 0; y < rows - 1; y++) {
    wall(y * cols, (y + 1) * cols); // esquerda
    wall((y + 1) * cols + cols - 1, y * cols + cols - 1); // direita
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();
  return geometry;
}
