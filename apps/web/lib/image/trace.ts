import * as THREE from "three";

/** Grade binária extraída de uma imagem (true = sólido/tinta) */
export interface BinaryGrid {
  width: number;
  height: number;
  data: Uint8Array; // 1 = sólido
}

/**
 * Converte imagem em grade binária (browser only).
 * PNGs com transparência usam o alpha (logo recortado); imagens opacas usam
 * luminância contra o threshold (0–1). `invert` troca figura/fundo.
 */
export async function imageToBinaryGrid(
  file: File,
  threshold: number,
  invert: boolean,
  maxSamples = 180
): Promise<BinaryGrid> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSamples / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(4, Math.round(bitmap.width * scale));
  const height = Math.max(4, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const { data: rgba } = ctx.getImageData(0, 0, width, height);
  const data = new Uint8Array(width * height);

  // Detecta se a imagem tem transparência relevante
  let transparentPixels = 0;
  for (let i = 0; i < width * height; i++) {
    if (rgba[i * 4 + 3] < 128) transparentPixels++;
  }
  const useAlpha = transparentPixels > width * height * 0.05;

  for (let i = 0; i < width * height; i++) {
    let solid: boolean;
    if (useAlpha) {
      solid = rgba[i * 4 + 3] >= 128;
    } else {
      const lum =
        (0.2126 * rgba[i * 4] + 0.7152 * rgba[i * 4 + 1] + 0.0722 * rgba[i * 4 + 2]) /
        255;
      solid = lum < threshold; // escuro = tinta
    }
    if (invert) solid = !solid;
    data[i] = solid ? 1 : 0;
  }

  return { width, height, data };
}

/** Rotula componentes conexos (4-conectividade) e retorna a máscara do maior. */
function largestComponent(grid: BinaryGrid): BinaryGrid {
  const { width: w, height: h, data } = grid;
  const labels = new Int32Array(w * h).fill(-1);
  let best = { label: -1, size: 0 };
  let next = 0;
  const queue: number[] = [];

  for (let start = 0; start < w * h; start++) {
    if (!data[start] || labels[start] !== -1) continue;
    const label = next++;
    let size = 0;
    queue.length = 0;
    queue.push(start);
    labels[start] = label;
    while (queue.length) {
      const i = queue.pop()!;
      size++;
      const x = i % w;
      const y = (i / w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const ni = ny * w + nx;
        if (data[ni] && labels[ni] === -1) {
          labels[ni] = label;
          queue.push(ni);
        }
      }
    }
    if (size > best.size) best = { label, size };
  }

  const out = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) out[i] = labels[i] === best.label ? 1 : 0;
  return { width: w, height: h, data: out };
}

/**
 * Traça o contorno externo do maior componente (Moore neighbor tracing,
 * critério de parada de Jacob). Retorna pontos em coordenadas de pixel.
 */
export function traceOutline(grid: BinaryGrid): THREE.Vector2[] {
  const comp = largestComponent(grid);
  const { width: w, height: h, data } = comp;
  const at = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < w && y < h ? data[y * w + x] : 0;

  // primeiro pixel sólido em ordem de varredura
  let sx = -1;
  let sy = -1;
  outer: for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[y * w + x]) {
        sx = x;
        sy = y;
        break outer;
      }
    }
  }
  if (sx === -1) return [];

  // vizinhança de Moore em sentido horário começando a oeste
  const dirs = [
    [-1, 0], [-1, -1], [0, -1], [1, -1],
    [1, 0], [1, 1], [0, 1], [-1, 1],
  ] as const;

  const contour: THREE.Vector2[] = [];
  let cx = sx;
  let cy = sy;
  let backtrack = 0; // entramos vindo do oeste
  const maxSteps = w * h * 4;

  for (let step = 0; step < maxSteps; step++) {
    contour.push(new THREE.Vector2(cx, cy));
    let found = false;
    for (let k = 0; k < 8; k++) {
      const idx = (backtrack + 1 + k) % 8;
      const nx = cx + dirs[idx][0];
      const ny = cy + dirs[idx][1];
      if (at(nx, ny)) {
        // novo backtrack: direção oposta ao movimento, girada um passo
        backtrack = (idx + 4) % 8;
        cx = nx;
        cy = ny;
        found = true;
        break;
      }
    }
    if (!found) break; // pixel isolado
    if (cx === sx && cy === sy && contour.length > 2) break;
  }

  return contour;
}

/** Simplificação Douglas-Peucker — reduz vértices mantendo a forma. */
export function simplify(
  points: THREE.Vector2[],
  epsilon: number
): THREE.Vector2[] {
  if (points.length < 3) return points;

  const dmax = { dist: 0, index: 0 };
  const first = points[0];
  const last = points[points.length - 1];
  const line = new THREE.Vector2().subVectors(last, first);
  const lineLen = line.length();

  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i];
    const dist =
      lineLen === 0
        ? p.distanceTo(first)
        : Math.abs(
            line.x * (first.y - p.y) - line.y * (first.x - p.x)
          ) / lineLen;
    if (dist > dmax.dist) {
      dmax.dist = dist;
      dmax.index = i;
    }
  }

  if (dmax.dist > epsilon) {
    const left = simplify(points.slice(0, dmax.index + 1), epsilon);
    const right = simplify(points.slice(dmax.index), epsilon);
    return [...left.slice(0, -1), ...right];
  }
  return [first, last];
}
