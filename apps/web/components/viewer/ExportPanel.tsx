"use client";

import { useCallback, useEffect, useState } from "react";
import * as THREE from "three";
import { STLExporter } from "three-stdlib";
import type { GenerationTool } from "@/lib/supabase/types";
import type { FilamentColor } from "@/app/api/stock/colors/route";

/** Arquivo exportável gerado no client (STL, SVG, DXF...) */
export interface ExportFile {
  format: "stl" | "svg" | "dxf";
  label: string;
  make: () => Blob | null;
}

export interface ExportPanelProps {
  /** Atalho: geometria 3D → botão "Baixar STL" automático */
  geometry?: THREE.BufferGeometry | null;
  /** Alternativa: lista custom de arquivos (ex.: SVG/DXF do laser box) */
  files?: ExportFile[];
  tool: GenerationTool;
  /** Parâmetros atuais da ferramenta, gravados junto do pedido */
  params?: Record<string, unknown>;
  fileName?: string;
  /** Callback opcional quando a cor de filamento muda (pra pintar o preview) */
  onColorChange?: (hex: string) => void;
}

function geometryToSTLBlob(geometry: THREE.BufferGeometry): Blob {
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
  const stl = new STLExporter().parse(mesh, { binary: true });
  return new Blob([stl as unknown as BlobPart], {
    type: "application/octet-stream",
  });
}

/**
 * Painel padrão de exportação: baixar arquivos localmente (grátis, sem rede)
 * ou enviar pedido de impressão pra Trivertido (Supabase + n8n), com escolha
 * de cor de filamento puxada do estoque real.
 */
export default function ExportPanel({
  geometry,
  files,
  tool,
  params = {},
  fileName = "modelo-trivertido",
  onColorChange,
}: ExportPanelProps) {
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [colors, setColors] = useState<FilamentColor[]>([]);
  const [colorId, setColorId] = useState<number | null>(null);

  const exportFiles: ExportFile[] =
    files ??
    (geometry !== undefined
      ? [
          {
            format: "stl",
            label: "Baixar STL",
            make: () => (geometry ? geometryToSTLBlob(geometry) : null),
          },
        ]
      : []);

  const hasContent = files ? files.length > 0 : !!geometry;

  // Carrega as cores do estoque quando o formulário de pedido abre
  useEffect(() => {
    if (!showOrderForm || colors.length > 0) return;
    fetch("/api/stock/colors")
      .then((r) => r.json())
      .then((d) => setColors(d.colors ?? []))
      .catch(() => setColors([]));
  }, [showOrderForm, colors.length]);

  const download = useCallback(
    (file: ExportFile) => {
      const blob = file.make();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName}.${file.format}`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [fileName]
  );

  const sendOrder = useCallback(async () => {
    const primary = exportFiles[0];
    if (!primary || !customerName || !customerPhone) return;
    const blob = primary.make();
    if (!blob) return;

    setSending(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", blob, `${fileName}.${primary.format}`);
      formData.append("tool", tool);
      formData.append("format", primary.format);
      formData.append("params", JSON.stringify(params));

      const exportRes = await fetch("/api/export", {
        method: "POST",
        body: formData,
      });
      const exportData = await exportRes.json();
      if (!exportRes.ok) throw new Error(exportData.error);

      const chosen = colors.find((c) => c.id === colorId);
      const orderRes = await fetch("/api/webhook/n8n", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generationId: exportData.generationId,
          customerName,
          customerPhone,
          filamentColor: chosen
            ? `${chosen.cor_nome} (${chosen.tipo})`
            : undefined,
        }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error);

      setMessage("Pedido enviado! Entraremos em contato pelo WhatsApp.");
      setShowOrderForm(false);
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Falha ao enviar o pedido."
      );
    } finally {
      setSending(false);
    }
  }, [
    exportFiles,
    tool,
    params,
    fileName,
    customerName,
    customerPhone,
    colors,
    colorId,
  ]);

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl bg-white/[0.04] border border-white/10">
      <div className="flex flex-wrap gap-3">
        {exportFiles.map((f) => (
          <button
            key={f.format}
            onClick={() => download(f)}
            disabled={!hasContent}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 disabled:opacity-40 text-sm font-medium"
          >
            {f.label}
          </button>
        ))}
        <button
          onClick={() => setShowOrderForm((v) => !v)}
          disabled={!hasContent}
          className="px-4 py-2 rounded-lg bg-clay hover:bg-clay-soft disabled:opacity-40 text-sm font-medium"
        >
          Pedir impressão
        </button>
      </div>

      {showOrderForm && (
        <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
          <input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Seu nome"
            className="px-3 py-2 rounded-lg bg-white/[0.06] border border-white/15 text-sm"
          />
          <input
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="WhatsApp (com DDD)"
            className="px-3 py-2 rounded-lg bg-white/[0.06] border border-white/15 text-sm"
          />

          {colors.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-sm text-white/80">Cor do filamento</span>
              <div className="flex flex-wrap gap-2">
                {colors.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setColorId(c.id);
                      onColorChange?.(c.cor);
                    }}
                    title={`${c.cor_nome} (${c.tipo})`}
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${
                      colorId === c.id
                        ? "border-clay/70 scale-110"
                        : "border-white/20"
                    }`}
                    style={{ backgroundColor: c.cor }}
                  />
                ))}
              </div>
              {colorId && (
                <span className="text-xs text-white/40">
                  {colors.find((c) => c.id === colorId)?.cor_nome} (
                  {colors.find((c) => c.id === colorId)?.tipo})
                </span>
              )}
            </div>
          )}

          <button
            onClick={sendOrder}
            disabled={sending || !customerName || !customerPhone}
            className="px-4 py-2 rounded-lg bg-clay hover:bg-clay-soft disabled:opacity-40 text-sm font-medium"
          >
            {sending ? "Enviando..." : "Confirmar pedido"}
          </button>
        </div>
      )}

      {message && <p className="text-sm text-white/80">{message}</p>}
    </div>
  );
}
