import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export interface KeychainParams {
  /** Largura final da peça em mm (altura sai da proporção do contorno) */
  widthMM: number;
  /** Espessura da extrusão em mm */
  thickness: number;
  /** Adiciona argola pra corrente */
  ring: boolean;
  /** Diâmetro externo da argola em mm */
  ringOuterMM: number;
  /** Diâmetro do furo da argola em mm */
  ringInnerMM: number;
}

export const defaultKeychainParams: KeychainParams = {
  widthMM: 45,
  thickness: 4,
  ring: true,
  ringOuterMM: 10,
  ringInnerMM: 4,
};

/**
 * Gera o chaveiro: contorno vetorizado → THREE.Shape → extrusão, com argola
 * (anel com furo) mesclada no ponto mais alto da silhueta. O contorno chega
 * em pixels (Y de tela, cresce pra baixo) e sai em mm centrado na origem.
 * Função pura — a vetorização (canvas) fica em lib/image/trace.ts.
 */
export function generateKeychainGeometry(
  contour: THREE.Vector2[],
  params: KeychainParams
): THREE.BufferGeometry | null {
  if (contour.length < 3) return null;
  const { widthMM, thickness, ring, ringOuterMM, ringInnerMM } = params;

  // bounding box do contorno em pixels
  const box = new THREE.Box2();
  for (const p of contour) box.expandByPoint(p);
  const size = new THREE.Vector2();
  box.getSize(size);
  if (size.x < 1 || size.y < 1) return null;

  const scale = widthMM / size.x;
  const cx = (box.min.x + box.max.x) / 2;
  const cy = (box.min.y + box.max.y) / 2;

  // pixel → mm, invertendo Y (tela cresce pra baixo, mundo cresce pra cima)
  const pts = contour.map(
    (p) => new THREE.Vector2((p.x - cx) * scale, -(p.y - cy) * scale)
  );

  const shape = new THREE.Shape(pts);
  const bodyGeo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: false,
  });

  if (!ring) return bodyGeo;

  // Argola: anel no topo da silhueta, sobrepondo 25% pra soldar na peça
  const topY = Math.max(...pts.map((p) => p.y));
  const topXs = pts.filter((p) => p.y > topY - 2).map((p) => p.x);
  const ringX = topXs.reduce((a, b) => a + b, 0) / topXs.length;
  const ringR = ringOuterMM / 2;
  const ringY = topY + ringR * 0.75;

  const ringShape = new THREE.Shape();
  ringShape.absarc(ringX, ringY, ringR, 0, Math.PI * 2, false);
  const holePath = new THREE.Path();
  holePath.absarc(ringX, ringY, ringInnerMM / 2, 0, Math.PI * 2, true);
  ringShape.holes.push(holePath);

  const ringGeo = new THREE.ExtrudeGeometry(ringShape, {
    depth: thickness,
    bevelEnabled: false,
    curveSegments: 32,
  });

  return (
    mergeGeometries([bodyGeo.toNonIndexed(), ringGeo.toNonIndexed()], false) ??
    bodyGeo
  );
}
