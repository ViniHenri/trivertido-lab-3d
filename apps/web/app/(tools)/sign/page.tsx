"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { FontLoader, type Font } from "three-stdlib";
import ToolShell from "@/components/ui/ToolShell";
import RangeSlider from "@/components/ui/RangeSlider";
import ExportPanel from "@/components/viewer/ExportPanel";
import {
  generateSignGeometry,
  defaultSignParams,
  type SignParams,
  type SignShape,
} from "@/lib/geometry/sign";

const Model3DViewer = dynamic(
  () => import("@/components/viewer/Model3DViewer"),
  { ssr: false }
);

const FONTS = [
  { id: "droid_sans_regular", label: "Droid Sans" },
  { id: "droid_sans_bold", label: "Droid Sans Bold" },
  { id: "gentilis_regular", label: "Gentilis (serifada)" },
];

const SHAPES: Array<{ id: SignShape; label: string }> = [
  { id: "rect", label: "Retângulo" },
  { id: "oval", label: "Oval" },
  { id: "shield", label: "Escudo" },
];

export default function SignPage() {
  const [params, setParams] = useState<SignParams>(defaultSignParams);
  const [fontId, setFontId] = useState(FONTS[0].id);
  const [font, setFont] = useState<Font | null>(null);

  useEffect(() => {
    let cancelled = false;
    new FontLoader().load(`/fonts/${fontId}.typeface.json`, (f) => {
      if (!cancelled) setFont(f);
    });
    return () => {
      cancelled = true;
    };
  }, [fontId]);

  // Debounce: CSG do texto rebaixado é pesado pra rodar a cada tecla
  const [debouncedParams, setDebouncedParams] = useState(params);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedParams(params), 250);
    return () => clearTimeout(t);
  }, [params]);

  const geometry = useMemo(() => {
    if (!font) return null;
    try {
      return generateSignGeometry(debouncedParams, font);
    } catch {
      return null;
    }
  }, [debouncedParams, font]);

  const set = <K extends keyof SignParams>(key: K, value: SignParams[K]) =>
    setParams((p) => ({ ...p, [key]: value }));

  return (
    <ToolShell
      title="Sign & Plate Maker"
      description="Placas e letreiros personalizados com texto em relevo ou gravado. 100% no navegador."
    >
      <div className="grid lg:grid-cols-[1fr_340px] gap-6">
        <Model3DViewer geometry={geometry} />

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 p-4 rounded-xl bg-white/[0.04] border border-white/10">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-white/80">Texto</span>
              <input
                value={params.text}
                onChange={(e) => set("text", e.target.value)}
                maxLength={40}
                className="px-3 py-2 rounded-lg bg-white/[0.06] border border-white/15"
                placeholder="Seu texto aqui"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-white/80">Fonte</span>
                <select
                  value={fontId}
                  onChange={(e) => setFontId(e.target.value)}
                  className="px-2 py-2 rounded-lg bg-white/[0.06] border border-white/15"
                >
                  {FONTS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-white/80">Forma</span>
                <select
                  value={params.shape}
                  onChange={(e) => set("shape", e.target.value as SignShape)}
                  className="px-2 py-2 rounded-lg bg-white/[0.06] border border-white/15"
                >
                  {SHAPES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {(
              [
                ["widthMM", "Largura (mm)", 60, 250, 5],
                ["heightMM", "Altura (mm)", 30, 150, 5],
                ["baseThickness", "Espessura da base (mm)", 2, 10, 0.5],
                ["textSize", "Tamanho do texto (mm)", 6, 40, 1],
                ["reliefDepth", "Profundidade do relevo (mm)", 0.6, 4, 0.2],
              ] as Array<[keyof SignParams, string, number, number, number]>
            ).map(([key, label, min, max, step]) => (
              <RangeSlider
                key={key}
                label={label}
                min={min}
                max={max}
                step={step}
                value={params[key] as number}
                onChange={(value) => set(key, value as never)}
              />
            ))}

            <div className="flex gap-2">
              <button
                onClick={() => set("recessed", false)}
                className={`flex-1 px-3 py-2 rounded-lg text-sm border ${
                  !params.recessed
                    ? "bg-clay/15 border-clay text-clay"
                    : "bg-white/[0.06] border-white/15 text-white/55"
                }`}
              >
                Texto elevado
              </button>
              <button
                onClick={() => set("recessed", true)}
                className={`flex-1 px-3 py-2 rounded-lg text-sm border ${
                  params.recessed
                    ? "bg-clay/15 border-clay text-clay"
                    : "bg-white/[0.06] border-white/15 text-white/55"
                }`}
              >
                Texto gravado
              </button>
            </div>

            <label className="flex items-center justify-between text-sm text-white/80">
              Furos de fixação
              <input
                type="checkbox"
                checked={params.holes}
                onChange={(e) => set("holes", e.target.checked)}
                className="accent-clay w-4 h-4"
              />
            </label>
            {params.holes && (
              <RangeSlider
                label="Diâmetro dos furos (mm)"
                min={2}
                max={8}
                step={0.5}
                value={params.holeDiameter}
                onChange={(value) => set("holeDiameter", value)}
              />
            )}
          </div>

          <ExportPanel
            geometry={geometry}
            tool="sign"
            params={params as unknown as Record<string, unknown>}
            fileName="placa-trivertido"
          />
        </div>
      </div>
    </ToolShell>
  );
}
