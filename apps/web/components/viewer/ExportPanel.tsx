"use client";

import { useCallback, useState } from "react";
import * as THREE from "three";
import { STLExporter } from "three-stdlib";
import type { GenerationTool } from "@/lib/supabase/types";

export interface ExportPanelProps {
  geometry: THREE.BufferGeometry | null;
  tool: GenerationTool;
  /** Parâmetros atuais da ferramenta, gravados junto do pedido */
  params?: Record<string, unknown>;
  fileName?: string;
}

function geometryToSTLBlob(geometry: THREE.BufferGeometry): Blob {
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
  const stl = new STLExporter().parse(mesh, { binary: true });
  return new Blob([stl as unknown as BlobPart], {
    type: "application/octet-stream",
  });
}

/**
 * Painel padrão de exportação: baixar STL local (grátis, sem rede)
 * ou enviar pedido de impressão pra Trivertido (salva no Supabase + n8n).
 */
export default function ExportPanel({
  geometry,
  tool,
  params = {},
  fileName = "modelo-trivertido",
}: ExportPanelProps) {
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const downloadSTL = useCallback(() => {
    if (!geometry) return;
    const blob = geometryToSTLBlob(geometry);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName}.stl`;
    a.click();
    URL.revokeObjectURL(url);
  }, [geometry, fileName]);

  const sendOrder = useCallback(async () => {
    if (!geometry || !customerName || !customerPhone) return;
    setSending(true);
    setMessage(null);
    try {
      const blob = geometryToSTLBlob(geometry);
      const formData = new FormData();
      formData.append("file", blob, `${fileName}.stl`);
      formData.append("tool", tool);
      formData.append("format", "stl");
      formData.append("params", JSON.stringify(params));

      const exportRes = await fetch("/api/export", {
        method: "POST",
        body: formData,
      });
      const exportData = await exportRes.json();
      if (!exportRes.ok) throw new Error(exportData.error);

      const orderRes = await fetch("/api/webhook/n8n", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generationId: exportData.generationId,
          customerName,
          customerPhone,
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
  }, [geometry, tool, params, fileName, customerName, customerPhone]);

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl bg-zinc-900 border border-zinc-800">
      <div className="flex flex-wrap gap-3">
        <button
          onClick={downloadSTL}
          disabled={!geometry}
          className="px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 text-sm font-medium"
        >
          Baixar STL
        </button>
        <button
          onClick={() => setShowOrderForm((v) => !v)}
          disabled={!geometry}
          className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-sm font-medium"
        >
          Pedir impressão
        </button>
      </div>

      {showOrderForm && (
        <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800">
          <input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Seu nome"
            className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm"
          />
          <input
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="WhatsApp (com DDD)"
            className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm"
          />
          <button
            onClick={sendOrder}
            disabled={sending || !customerName || !customerPhone}
            className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-sm font-medium"
          >
            {sending ? "Enviando..." : "Confirmar pedido"}
          </button>
        </div>
      )}

      {message && <p className="text-sm text-zinc-300">{message}</p>}
    </div>
  );
}
