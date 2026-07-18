"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import ToolShell from "@/components/ui/ToolShell";
import ExportPanel from "@/components/viewer/ExportPanel";
import {
  generateLithophaneGeometry,
  defaultLithophaneParams,
  type Heightmap,
  type LithophaneParams,
} from "@/lib/geometry/lithophane";
import { imageToHeightmap } from "@/lib/image/grayscale";

const Model3DViewer = dynamic(
  () => import("@/components/viewer/Model3DViewer"),
  { ssr: false }
);

export default function LithophanePage() {
  const [heightmap, setHeightmap] = useState<Heightmap | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState<LithophaneParams>(
    defaultLithophaneParams
  );
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce: regenerar a malha a cada mudança de slider é pesado
  const [debouncedParams, setDebouncedParams] = useState(params);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedParams(params), 150);
    return () => clearTimeout(t);
  }, [params]);

  const geometry = useMemo(() => {
    if (!heightmap) return null;
    return generateLithophaneGeometry(heightmap, debouncedParams);
  }, [heightmap, debouncedParams]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Use uma imagem JPG, PNG ou WebP.");
      return;
    }
    try {
      setHeightmap(await imageToHeightmap(file));
      setFileName(file.name);
    } catch {
      setError("Não consegui ler essa imagem. Tente outra.");
    }
  }

  return (
    <ToolShell
      title="Lithophane Maker"
      description="Sua foto vira litofania: o relevo revela a imagem quando a luz atravessa a peça. 100% no navegador."
    >
      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="flex flex-col gap-4">
          {geometry ? (
            <Model3DViewer geometry={geometry} color="#f5f0e8" />
          ) : (
            <button
              onClick={() => inputRef.current?.click()}
              className="w-full h-[420px] rounded-xl border-2 border-dashed border-white/15 bg-white/[0.03] hover:border-clay/50 transition-colors flex flex-col items-center justify-center gap-2"
            >
              <span className="text-lg text-white/80">
                Clique pra escolher uma foto
              </span>
              <span className="text-sm text-white/40">
                JPG, PNG ou WebP — fotos com bom contraste funcionam melhor
              </span>
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          {fileName && (
            <div className="flex items-center gap-3 text-sm text-white/55">
              <span>📷 {fileName}</span>
              <button
                onClick={() => inputRef.current?.click()}
                className="text-clay hover:underline"
              >
                trocar foto
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 p-4 rounded-xl bg-white/[0.04] border border-white/10">
            <label className="flex flex-col gap-1 text-sm">
              <span className="flex justify-between text-white/80">
                Largura (mm)
                <span className="text-white/40">{params.widthMM}</span>
              </span>
              <input
                type="range"
                min={40}
                max={200}
                step={5}
                value={params.widthMM}
                onChange={(e) =>
                  setParams((p) => ({ ...p, widthMM: Number(e.target.value) }))
                }
                className="accent-clay"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="flex justify-between text-white/80">
                Espessura mínima (mm)
                <span className="text-white/40">{params.minThickness}</span>
              </span>
              <input
                type="range"
                min={0.4}
                max={2}
                step={0.1}
                value={params.minThickness}
                onChange={(e) =>
                  setParams((p) => ({
                    ...p,
                    minThickness: Number(e.target.value),
                  }))
                }
                className="accent-clay"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="flex justify-between text-white/80">
                Espessura máxima (mm)
                <span className="text-white/40">{params.maxThickness}</span>
              </span>
              <input
                type="range"
                min={1.5}
                max={6}
                step={0.1}
                value={params.maxThickness}
                onChange={(e) =>
                  setParams((p) => ({
                    ...p,
                    maxThickness: Number(e.target.value),
                  }))
                }
                className="accent-clay"
              />
            </label>
            <label className="flex items-center justify-between text-sm text-white/80">
              Moldura
              <input
                type="checkbox"
                checked={params.frame}
                onChange={(e) =>
                  setParams((p) => ({ ...p, frame: e.target.checked }))
                }
                className="accent-clay w-4 h-4"
              />
            </label>
            {params.frame && (
              <label className="flex flex-col gap-1 text-sm">
                <span className="flex justify-between text-white/80">
                  Largura da moldura (mm)
                  <span className="text-white/40">{params.frameWidthMM}</span>
                </span>
                <input
                  type="range"
                  min={2}
                  max={12}
                  step={1}
                  value={params.frameWidthMM}
                  onChange={(e) =>
                    setParams((p) => ({
                      ...p,
                      frameWidthMM: Number(e.target.value),
                    }))
                  }
                  className="accent-clay"
                />
              </label>
            )}
          </div>

          <ExportPanel
            geometry={geometry}
            tool="lithophane"
            params={params as unknown as Record<string, unknown>}
            fileName="litofania-trivertido"
          />

          <p className="text-xs text-white/40 px-1">
            Dica de impressão: filamento branco, 100% de preenchimento, peça em
            pé (de lado) pra melhor definição.
          </p>
        </div>
      </div>
    </ToolShell>
  );
}
