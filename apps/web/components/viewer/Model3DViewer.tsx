"use client";

import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  Center,
  ContactShadows,
} from "@react-three/drei";
import * as THREE from "three";

export interface Model3DViewerProps {
  /** Geometria pronta (ferramentas paramétricas geram BufferGeometry) */
  geometry?: THREE.BufferGeometry | null;
  /** Cor base do material (ex.: cor do filamento escolhido) */
  color?: string;
  /** Conteúdo alternativo — ex.: um <primitive> de GLB carregado */
  children?: React.ReactNode;
  className?: string;
}

function GeometryMesh({
  geometry,
  color,
}: {
  geometry: THREE.BufferGeometry;
  color: string;
}) {
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.55,
        metalness: 0.05,
      }),
    [color]
  );
  return <mesh geometry={geometry} material={material} castShadow />;
}

/**
 * Viewer 3D genérico reutilizado por todas as ferramentas do Lab.
 * Aceita uma BufferGeometry (paramétricas) ou children arbitrários (GLB da IA).
 */
export default function Model3DViewer({
  geometry,
  color = "#e8863a",
  children,
  className,
}: Model3DViewerProps) {
  return (
    <div
      className={
        className ??
        "w-full h-[420px] rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800"
      }
    >
      <Canvas shadows camera={{ position: [80, 60, 80], fov: 45 }}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[50, 80, 40]} intensity={1.2} castShadow />
        <Suspense fallback={null}>
          <Center>
            {geometry ? (
              <GeometryMesh geometry={geometry} color={color} />
            ) : (
              children
            )}
          </Center>
          <Environment preset="city" />
          <ContactShadows opacity={0.35} scale={200} blur={2} far={60} />
        </Suspense>
        <OrbitControls makeDefault enableDamping />
      </Canvas>
    </div>
  );
}
