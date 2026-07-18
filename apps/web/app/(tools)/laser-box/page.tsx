"use client";

import { useEffect, useMemo, useState } from "react";
import ToolShell from "@/components/ui/ToolShell";
import ExportPanel, { type ExportFile } from "@/components/viewer/ExportPanel";
import {
  generateLaserBoxPanels,
  panelsToSVG,
  panelsToDXF,
  defaultLaserBoxParams,
  type LaserBoxParams,
} from "@/lib/geometry/laserBox";

const SLIDERS: Array<{
  key: keyof LaserBoxParams;
  label: string;
  min: number;
  max: number;
  step: number;
}> = [
  { key: "widthMM", label: "Largura (mm)", min: 40, max: 400, step: 5 },
  { key: "depthMM", label: "Profundidade (mm)", min: 40, max: 400, step: 5 },
  { key: "heightMM", label: "Altura (mm)", min: 30, max: 300, step: 5 },
  {
    key: "materialThickness",
    label: "Espessura do material (mm)",
    min: 2,
    max: 10,
    step: 0.5,
  },
  { key: "fingerWidth", label: "Largura do dente (mm)", min: 5, max: 30, step: 1 },
];

export default function LaserBoxPage() {
  const [params, setParams] = useState<LaserBoxParams>(defaultLaserBoxParams);

  const [debouncedParams, setDebouncedParams] = useState(params);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedParams(params), 150);
    return () => clearTimeout(t);
  }, [params]);

  const { svg, files } = useMemo(() => {
    const panels = generateLaserBoxPanels(debouncedParams);
    const svgStr = panelsToSVG(panels);
    const exportFiles: ExportFile[] = [
      {
        format: "svg",
        label: "Baixar SVG",
        make: () => new Blob([svgStr], { type: "image/svg+xml" }),
      },
      {
        format: "dxf",
        label: "Baixar DXF",
        make: () =>
          new Blob([panelsToDXF(panels)], { type: "application/dxf" }),
      },
    ];
    return { svg: svgStr, files: exportFiles };
  }, [debouncedParams]);

  return (
    <ToolShell
      title="Laser Box Maker"
      description="Caixas com encaixe finger joint — os painéis saem prontos pra corte a laser em SVG ou DXF."
    >
      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div
          className="w-full min-h-[420px] rounded-xl overflow-auto bg-white border border-zinc-800 p-4 [&_svg]:max-w-full [&_svg]:h-auto"
          dangerouslySetInnerHTML={{ __html: svg }}
        />

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800">
            {SLIDERS.map(({ key, label, min, max, step }) => (
              <label key={key} className="flex flex-col gap-1 text-sm">
                <span className="flex justify-between text-zinc-300">
                  {label}
                  <span className="text-zinc-500">
                    {params[key] as number}
                  </span>
                </span>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={params[key] as number}
                  onChange={(e) =>
                    setParams((p) => ({
                      ...p,
                      [key]: Number(e.target.value),
                    }))
                  }
                  className="accent-orange-500"
                />
              </label>
            ))}
            <label className="flex items-center justify-between text-sm text-zinc-300">
              Caixa fechada (com tampa)
              <input
                type="checkbox"
                checked={params.closedTop}
                onChange={(e) =>
                  setParams((p) => ({ ...p, closedTop: e.target.checked }))
                }
                className="accent-orange-500 w-4 h-4"
              />
            </label>
          </div>

          <ExportPanel
            files={files}
            tool="laser-box"
            params={params as unknown as Record<string, unknown>}
            fileName="caixa-laser-trivertido"
          />

          <p className="text-xs text-zinc-500 px-1">
            As medidas são externas. A espessura do material define a
            profundidade dos encaixes — confira a espessura real da chapa antes
            de cortar.
          </p>
        </div>
      </div>
    </ToolShell>
  );
}
