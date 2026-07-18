import * as THREE from "three";
import { TextGeometry, type Font } from "three-stdlib";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type SignShape = "rect" | "oval" | "shield";

export interface SignParams {
  /** Texto da placa (pode ter acentos — fontes incluem pt-BR) */
  text: string;
  /** Forma da base */
  shape: SignShape;
  /** Largura da base em mm */
  widthMM: number;
  /** Altura da base em mm */
  heightMM: number;
  /** Espessura da base em mm */
  baseThickness: number;
  /** Tamanho da fonte em mm (altura aproximada das maiúsculas) */
  textSize: number;
  /** Profundidade do relevo do texto em mm */
  reliefDepth: number;
  /** true = texto rebaixado (gravado); false = texto elevado */
  recessed: boolean;
  /** Furos de fixação nos cantos */
  holes: boolean;
  /** Diâmetro dos furos em mm */
  holeDiameter: number;
}

export const defaultSignParams: SignParams = {
  text: "Trivertido",
  shape: "rect",
  widthMM: 120,
  heightMM: 50,
  baseThickness: 4,
  textSize: 14,
  reliefDepth: 2,
  recessed: false,
  holes: false,
  holeDiameter: 4,
};

/** Contorno 2D da base, centrado na origem. */
function buildBaseShape(params: SignParams): THREE.Shape {
  const { shape, widthMM: w, heightMM: h } = params;
  const s = new THREE.Shape();

  if (shape === "oval") {
    s.absellipse(0, 0, w / 2, h / 2, 0, Math.PI * 2, false, 0);
    return s;
  }

  if (shape === "shield") {
    // Escudo: topo reto com cantos suaves, base afunilando em ponta
    const r = Math.min(w, h) * 0.12;
    s.moveTo(-w / 2 + r, h / 2);
    s.lineTo(w / 2 - r, h / 2);
    s.quadraticCurveTo(w / 2, h / 2, w / 2, h / 2 - r);
    s.lineTo(w / 2, 0);
    s.quadraticCurveTo(w / 2, -h * 0.3, 0, -h / 2);
    s.quadraticCurveTo(-w / 2, -h * 0.3, -w / 2, 0);
    s.lineTo(-w / 2, h / 2 - r);
    s.quadraticCurveTo(-w / 2, h / 2, -w / 2 + r, h / 2);
    return s;
  }

  // Retângulo com cantos arredondados
  const r = Math.min(w, h) * 0.1;
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r);
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r);
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  return s;
}

/** Posições dos furos de fixação conforme a forma da base. */
function holePositions(params: SignParams): Array<[number, number]> {
  const { shape, widthMM: w, heightMM: h, holeDiameter } = params;
  const m = holeDiameter; // margem da borda
  if (shape === "oval") {
    return [
      [-w / 2 + m * 2, 0],
      [w / 2 - m * 2, 0],
    ];
  }
  if (shape === "shield") {
    return [
      [-w / 2 + m * 2, h / 2 - m * 2],
      [w / 2 - m * 2, h / 2 - m * 2],
    ];
  }
  return [
    [-w / 2 + m * 1.5, h / 2 - m * 1.5],
    [w / 2 - m * 1.5, h / 2 - m * 1.5],
    [-w / 2 + m * 1.5, -h / 2 + m * 1.5],
    [w / 2 - m * 1.5, -h / 2 + m * 1.5],
  ];
}

/**
 * Shapes 2D do texto, centradas em XY e escaladas pra caber na base.
 * Retorna as formas das letras (com seus buracos internos, ex.: miolo do "o").
 */
function buildTextShapes(params: SignParams, font: Font): THREE.Shape[] {
  const text = params.text.trim();
  if (!text) return [];

  const shapes = font.generateShapes(text, params.textSize);

  // Bounding box das shapes pra centralizar/escalar
  const box = new THREE.Box2();
  const tmp = new THREE.Vector2();
  for (const s of shapes) {
    for (const p of s.getPoints(4)) box.expandByPoint(tmp.set(p.x, p.y));
    for (const h of s.holes)
      for (const p of h.getPoints(4)) box.expandByPoint(tmp.set(p.x, p.y));
  }
  if (box.isEmpty()) return [];

  const cx = (box.min.x + box.max.x) / 2;
  const cy = (box.min.y + box.max.y) / 2;
  const textW = box.max.x - box.min.x;
  const textH = box.max.y - box.min.y;
  // margem de 15% da base; nunca ampliar, só reduzir
  const scale = Math.min(
    1,
    (params.widthMM * 0.85) / textW,
    (params.heightMM * 0.7) / textH
  );

  const transform = (pts: THREE.Vector2[]) =>
    pts.map((p) => new THREE.Vector2((p.x - cx) * scale, (p.y - cy) * scale));

  return shapes.map((s) => {
    const out = new THREE.Shape(transform(s.getPoints(8)));
    out.holes = s.holes.map((h) => new THREE.Path(transform(h.getPoints(8))));
    return out;
  });
}

/**
 * Gera a placa completa. Eixos: X/Y no plano da placa, Z = espessura.
 *
 * Texto elevado: extrusão das letras mesclada sobre a base.
 * Texto gravado: sem CSG — a base vira duas camadas: uma inferior sólida e
 * uma lâmina superior extrudada com as letras vazadas (as letras entram como
 * furos 2D da lâmina; os miolos fechados das letras viram ilhas sólidas).
 * Furos de fixação atravessam tudo como furos 2D das extrusões.
 * Função pura — a fonte é carregada pela página e injetada aqui.
 */
export function generateSignGeometry(
  params: SignParams,
  font: Font
): THREE.BufferGeometry {
  const reliefDepth = Math.min(
    params.reliefDepth,
    params.baseThickness - 0.6 // garante fundo mínimo no texto gravado
  );

  const fixHoles = (shape: THREE.Shape) => {
    if (!params.holes) return shape;
    for (const [hx, hy] of holePositions(params)) {
      const hole = new THREE.Path();
      hole.absarc(hx, hy, params.holeDiameter / 2, 0, Math.PI * 2, true);
      shape.holes.push(hole);
    }
    return shape;
  };

  const extrude = (shapes: THREE.Shape | THREE.Shape[], depth: number) =>
    new THREE.ExtrudeGeometry(shapes, {
      depth,
      bevelEnabled: false,
      curveSegments: 24,
    });

  const textShapes = buildTextShapes(params, font);

  if (!params.recessed) {
    const baseGeo = extrude(fixHoles(buildBaseShape(params)), params.baseThickness);
    if (textShapes.length === 0) return baseGeo;

    const textGeo = new TextGeometry(params.text.trim(), {
      font,
      size: params.textSize,
      height: reliefDepth,
      curveSegments: 6,
      bevelEnabled: false,
    });
    textGeo.computeBoundingBox();
    const bb = textGeo.boundingBox!;
    const cx = (bb.min.x + bb.max.x) / 2;
    const cy = (bb.min.y + bb.max.y) / 2;
    textGeo.translate(-cx, -cy, 0);
    const textW = bb.max.x - bb.min.x;
    const s = Math.min(1, (params.widthMM * 0.85) / textW);
    textGeo.scale(s, s, 1);
    textGeo.translate(0, 0, params.baseThickness);

    return (
      mergeGeometries([baseGeo.toNonIndexed(), textGeo.toNonIndexed()], false) ??
      baseGeo
    );
  }

  // --- Texto gravado (duas camadas, sem CSG) ---
  const bottomDepth = params.baseThickness - reliefDepth;
  const bottomGeo = extrude(fixHoles(buildBaseShape(params)), bottomDepth);

  // Lâmina superior: letras viram furos; miolos das letras viram ilhas
  const topShape = fixHoles(buildBaseShape(params));
  const islands: THREE.Shape[] = [];
  for (const letter of textShapes) {
    const outline = new THREE.Path(letter.getPoints(1));
    topShape.holes.push(outline);
    for (const counter of letter.holes) {
      islands.push(new THREE.Shape(counter.getPoints(1)));
    }
  }

  const topParts = [topShape, ...islands];
  const topGeo = extrude(topParts, reliefDepth);
  topGeo.translate(0, 0, bottomDepth);

  return (
    mergeGeometries([bottomGeo.toNonIndexed(), topGeo.toNonIndexed()], false) ??
    bottomGeo
  );
}
