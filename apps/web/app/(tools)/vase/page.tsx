"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import ToolShell from "@/components/ui/ToolShell";
import RangeSlider from "@/components/ui/RangeSlider";
import ExportPanel from "@/components/viewer/ExportPanel";
import {
  generateVaseGeometry,
  defaultVaseParams,
  type VaseParams,
} from "@/lib/geometry/vase";

const Model3DViewer = dynamic(
  () => import("@/components/viewer/Model3DViewer"),
  { ssr: false }
);

interface SliderConfig {
  key: keyof VaseParams;
  label: string;
  min: number;
  max: number;
  step: number;
}

const SLIDERS: SliderConfig[] = [
  { key: "height", label: "Altura (mm)", min: 40, max: 300, step: 5 },
  { key: "baseRadius", label: "Raio da base (mm)", min: 10, max: 100, step: 1 },
  { key: "topRadius", label: "Raio do topo (mm)", min: 10, max: 100, step: 1 },
  { key: "waves", label: "Ondulações", min: 0, max: 12, step: 1 },
  { key: "waveAmplitude", label: "Amplitude (mm)", min: 0, max: 20, step: 1 },
  { key: "twist", label: "Twist (graus)", min: 0, max: 360, step: 15 },
];

export default function VasePage() {
  const [params, setParams] = useState<VaseParams>(defaultVaseParams);
  const [color, setColor] = useState("#c96a3b");

  const geometry = useMemo(() => generateVaseGeometry(params), [params]);

  return (
    <ToolShell
      title="Vase Maker"
      description="Crie vasos personalizados ajustando o perfil em tempo real. 100% no navegador, sem custo."
    >
      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <Model3DViewer geometry={geometry} color={color} />
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 p-4 rounded-xl bg-white/[0.04] border border-white/10">
            {SLIDERS.map(({ key, label, min, max, step }) => (
              <RangeSlider
                key={key}
                label={label}
                min={min}
                max={max}
                step={step}
                value={params[key] as number}
                onChange={(value) =>
                  setParams((p) => ({ ...p, [key]: value }))
                }
              />
            ))}
          </div>
          <ExportPanel
            geometry={geometry}
            tool="vase"
            params={params as unknown as Record<string, unknown>}
            fileName="vaso-trivertido"
            onColorChange={setColor}
          />
        </div>
      </div>
    </ToolShell>
  );
}
