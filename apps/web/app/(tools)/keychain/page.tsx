"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import * as THREE from "three";
import ToolShell from "@/components/ui/ToolShell";
import ExportPanel from "@/components/viewer/ExportPanel";
import { imageToBinaryGrid, traceOutline, simplify } from "@/lib/image/trace";
import {
  generateKeychainGeometry,
  defaultKeychainParams,
  type KeychainParams,
} from "@/lib/geometry/keychain";

const Model3DViewer = dynamic(
  () => import("@/components/viewer/Model3DViewer"),
  { ssr: false }
);

export default function KeychainPage() {
  const [file, setFile] = useState<File | null>(null);
  const [threshold, setThreshold] = useState(0.5);
  const [invert, setInvert] = useState(false);
  const [contour, setContour] = useState<THREE.Vector2[] | null>(null);
  const [params, setParams] = useState<KeychainParams>(defaultKeychainParams);
  const [error, setError] = useState<string | null>(null);
  const [color, setColor] = useState("#e8863a");
  const inputRef = useRef<HTMLInputElement>(null);

  // Revetoriza quando muda arquivo/threshold/invert (com debounce)
  useEffect(() => {
    if (!file) return;
    const t = setTimeout(async () => {
      try {
        const grid = await imageToBinaryGrid(file, threshold, invert);
        const raw = traceOutline(grid);
        if (raw.length < 10) {
          setContour(null);
          setError(
            "Não achei um contorno claro. Ajuste o threshold ou tente outra imagem."
          );
          return;
        }
        setError(null);
        setContour(simplify(raw, 1.2));
      } catch {
        setError("Não consegui processar essa imagem.");
      }
    }, 200);
    return () => clearTimeout(t);
  }, [file, threshold, invert]);

  const geometry = useMemo(() => {
    if (!contour) return null;
    return generateKeychainGeometry(contour, params);
  }, [contour, params]);

  return (
    <ToolShell
      title="Image to Keychain"
      description="Um logo ou desenho vira chaveiro 3D com argola. Funciona melhor com imagens de alto contraste ou PNG com fundo transparente."
    >
      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="flex flex-col gap-4">
          {geometry ? (
            <Model3DViewer geometry={geometry} color={color} />
          ) : (
            <button
              onClick={() => inputRef.current?.click()}
              className="w-full h-[420px] rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900/50 hover:border-orange-500/50 transition-colors flex flex-col items-center justify-center gap-2"
            >
              <span className="text-lg text-zinc-300">
                Clique pra escolher uma imagem
              </span>
              <span className="text-sm text-zinc-500">
                Logos e silhuetas com fundo limpo dão o melhor resultado
              </span>
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setError(null);
            }}
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          {file && (
            <div className="flex items-center gap-3 text-sm text-zinc-400">
              <span>🖼️ {file.name}</span>
              <button
                onClick={() => inputRef.current?.click()}
                className="text-orange-400 hover:underline"
              >
                trocar imagem
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800">
            <label className="flex flex-col gap-1 text-sm">
              <span className="flex justify-between text-zinc-300">
                Detecção de borda (threshold)
                <span className="text-zinc-500">{threshold.toFixed(2)}</span>
              </span>
              <input
                type="range"
                min={0.1}
                max={0.9}
                step={0.05}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="accent-orange-500"
              />
            </label>
            <label className="flex items-center justify-between text-sm text-zinc-300">
              Inverter figura/fundo
              <input
                type="checkbox"
                checked={invert}
                onChange={(e) => setInvert(e.target.checked)}
                className="accent-orange-500 w-4 h-4"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="flex justify-between text-zinc-300">
                Largura (mm)
                <span className="text-zinc-500">{params.widthMM}</span>
              </span>
              <input
                type="range"
                min={20}
                max={80}
                step={1}
                value={params.widthMM}
                onChange={(e) =>
                  setParams((p) => ({ ...p, widthMM: Number(e.target.value) }))
                }
                className="accent-orange-500"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="flex justify-between text-zinc-300">
                Espessura (mm)
                <span className="text-zinc-500">{params.thickness}</span>
              </span>
              <input
                type="range"
                min={2}
                max={8}
                step={0.5}
                value={params.thickness}
                onChange={(e) =>
                  setParams((p) => ({
                    ...p,
                    thickness: Number(e.target.value),
                  }))
                }
                className="accent-orange-500"
              />
            </label>
            <label className="flex items-center justify-between text-sm text-zinc-300">
              Argola pra corrente
              <input
                type="checkbox"
                checked={params.ring}
                onChange={(e) =>
                  setParams((p) => ({ ...p, ring: e.target.checked }))
                }
                className="accent-orange-500 w-4 h-4"
              />
            </label>
          </div>

          <ExportPanel
            geometry={geometry}
            tool="keychain"
            params={
              { ...params, threshold, invert } as unknown as Record<
                string,
                unknown
              >
            }
            fileName="chaveiro-trivertido"
            onColorChange={setColor}
          />
        </div>
      </div>
    </ToolShell>
  );
}
