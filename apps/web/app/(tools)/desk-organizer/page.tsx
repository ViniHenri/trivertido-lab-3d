"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import ToolShell from "@/components/ui/ToolShell";
import RangeSlider from "@/components/ui/RangeSlider";
import ExportPanel from "@/components/viewer/ExportPanel";
import {
  generateDeskOrganizerGeometry,
  defaultDeskOrganizerParams,
  type DeskOrganizerParams,
} from "@/lib/geometry/deskOrganizer";

const Model3DViewer = dynamic(
  () => import("@/components/viewer/Model3DViewer"),
  { ssr: false }
);

const SLIDERS: Array<{
  key: keyof DeskOrganizerParams;
  label: string;
  min: number;
  max: number;
  step: number;
}> = [
  { key: "widthMM", label: "Largura (mm)", min: 60, max: 250, step: 5 },
  { key: "depthMM", label: "Profundidade (mm)", min: 60, max: 250, step: 5 },
  { key: "heightMM", label: "Altura (mm)", min: 25, max: 120, step: 5 },
  { key: "cols", label: "Colunas", min: 1, max: 6, step: 1 },
  { key: "rows", label: "Linhas", min: 1, max: 6, step: 1 },
  {
    key: "wallThickness",
    label: "Espessura da parede (mm)",
    min: 1.2,
    max: 4,
    step: 0.4,
  },
];

export default function DeskOrganizerPage() {
  const [params, setParams] = useState<DeskOrganizerParams>(
    defaultDeskOrganizerParams
  );
  const [color, setColor] = useState("#43c78a");

  const geometry = useMemo(
    () => generateDeskOrganizerGeometry(params),
    [params]
  );

  return (
    <ToolShell
      title="Desk Organizer"
      description="Organizador de mesa com grade de compartimentos do seu jeito. 100% no navegador."
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
                value={params[key]}
                onChange={(value) =>
                  setParams((p) => ({ ...p, [key]: value }))
                }
              />
            ))}
            <p className="text-xs text-white/40">
              {params.cols * params.rows} compartimento
              {params.cols * params.rows > 1 ? "s" : ""}
            </p>
          </div>

          <ExportPanel
            geometry={geometry}
            tool="desk-organizer"
            params={params as unknown as Record<string, unknown>}
            fileName="organizador-trivertido"
            onColorChange={setColor}
          />
        </div>
      </div>
    </ToolShell>
  );
}
