import * as THREE from "three";

export interface VaseParams {
  /** Altura total do vaso em mm */
  height: number;
  /** Raio da base em mm */
  baseRadius: number;
  /** Raio do topo em mm */
  topRadius: number;
  /** Quantidade de ondulações verticais no perfil (0 = perfil liso) */
  waves: number;
  /** Amplitude das ondulações em mm */
  waveAmplitude: number;
  /** Rotação total do twist em graus (0 = sem twist) */
  twist: number;
  /** Segmentos radiais (resolução da malha) */
  radialSegments?: number;
  /** Segmentos verticais (resolução do perfil) */
  heightSegments?: number;
}

export const defaultVaseParams: VaseParams = {
  height: 120,
  baseRadius: 35,
  topRadius: 45,
  waves: 3,
  waveAmplitude: 6,
  twist: 0,
  radialSegments: 96,
  heightSegments: 128,
};

/**
 * Gera a malha de um vaso por superfície de revolução (lathe).
 * O perfil interpola linearmente baseRadius→topRadius e soma uma senoide
 * de `waves` ciclos com amplitude `waveAmplitude`. O twist rotaciona cada
 * anel proporcionalmente à altura. Função pura — sem estado, sem rede.
 */
export function generateVaseGeometry(params: VaseParams): THREE.BufferGeometry {
  const {
    height,
    baseRadius,
    topRadius,
    waves,
    waveAmplitude,
    twist,
    radialSegments = 96,
    heightSegments = 128,
  } = params;

  const profile: THREE.Vector2[] = [];
  for (let i = 0; i <= heightSegments; i++) {
    const t = i / heightSegments;
    const y = t * height;
    const baseR = baseRadius + (topRadius - baseRadius) * t;
    const wave =
      waves > 0 ? Math.sin(t * Math.PI * 2 * waves) * waveAmplitude : 0;
    profile.push(new THREE.Vector2(Math.max(baseR + wave, 1), y));
  }

  const geometry = new THREE.LatheGeometry(profile, radialSegments);

  if (twist !== 0) {
    const twistRad = (twist * Math.PI) / 180;
    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const angle = (y / height) * twistRad;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      pos.setXYZ(i, x * cos - z * sin, y, x * sin + z * cos);
    }
    pos.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  return geometry;
}
