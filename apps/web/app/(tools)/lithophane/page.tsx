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
              className="w-full h-[420px] rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900/50 hover:border-orange-500/50 transition-colors flex flex-col items-center justify-center gap-2"
            >
              <span className="text-lg text-zinc-300">
                Clique pra escolher uma foto
              </span>
              <span className="text-sm text-zinc-500">
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
            <div className="flex items-center gap-3 text-sm text-zinc-400">
              <span>📷 {fileName}</span>
              <button
                onClick={() => inputRef.current?.click()}
                className="text-orange-400 hover:underline"
              >
                trocar foto
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800">
            <label className="flex flex-col gap-1 text-sm">
              <span className="flex justify-between text-zinc-300">
                Largura (mm)
                <span className="text-zinc-500">{params.widthMM}</span>
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
                className="accent-orange-500"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="flex justify-between text-zinc-300">
                Espessura mínima (mm)
                <span className="text-zinc-500">{params.minThickness}</span>
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
                className="accent-orange-500"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="flex justify-between text-zinc-300">
                Espessura máxima (mm)
                <span className="text-zinc-500">{params.maxThickness}</span>
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
                className="accent-orange-500"
              />
            </label>
            <label className="flex items-center justify-between text-sm text-zinc-300">
              Moldura
              <input
                type="checkbox"
                checked={params.frame}
                onChange={(e) =>
                  setParams((p) => ({ ...p, frame: e.target.checked }))
                }
                className="accent-orange-500 w-4 h-4"
              />
            </label>
            {params.frame && (
              <label className="flex flex-col gap-1 text-sm">
                <span className="flex justify-between text-zinc-300">
                  Largura da moldura (mm)
                  <span className="text-zinc-500">{params.frameWidthMM}</span>
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
                  className="accent-orange-500"
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

          <p className="text-xs text-zinc-500 px-1">
            Dica de impressão: filamento branco, 100% de preenchimento, peça em
            pé (de lado) pra melhor definição.
          </p>
        </div>
      </div>
    </ToolShell>
  );
}
