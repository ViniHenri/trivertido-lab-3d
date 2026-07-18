"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import * as THREE from "three";
import { GLTFLoader } from "three-stdlib";
import ToolShell from "@/components/ui/ToolShell";
import { IMAGE_TO_3D_ENGINES, type ImageTo3DEngine } from "@/lib/providers/engines";

const Model3DViewer = dynamic(
  () => import("@/components/viewer/Model3DViewer"),
  { ssr: false }
);

type Stage =
  | { name: "idle" }
  | { name: "uploading" }
  | { name: "processing"; jobId: string; progress?: number }
  | {
      name: "done";
      generationId: string | null;
      modelUrl: string;
      object: THREE.Group | null;
    }
  | { name: "error"; message: string };

const POLL_MS = 5000;

export default function ImageTo3DPage() {
  const [stage, setStage] = useState<Stage>({ name: "idle" });
  const [engine, setEngine] = useState<ImageTo3DEngine>("tripo");
  const [preview, setPreview] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [orderState, setOrderState] = useState<{
    open: boolean;
    name: string;
    phone: string;
    sending: boolean;
    message: string | null;
  }>({ open: false, name: "", phone: "", sending: false, message: null });
  const inputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchBalance = useCallback(() => {
    fetch("/api/generate/balance")
      .then((r) => r.json())
      .then((d) => setBalance(typeof d.balance === "number" ? d.balance : null))
      .catch(() => setBalance(null));
  }, []);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (preview) URL.revokeObjectURL(preview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadModel = useCallback(
    async (modelUrl: string, generationId: string | null) => {
      try {
        const gltf = await new GLTFLoader().loadAsync(modelUrl);
        setStage({ name: "done", generationId, modelUrl, object: gltf.scene });
      } catch {
        // GLB não carregou no viewer, mas o arquivo existe — deixa baixar
        setStage({ name: "done", generationId, modelUrl, object: null });
      }
    },
    []
  );

  const startPolling = useCallback(
    (jobId: string) => {
      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/generate/status/${jobId}`);
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);

          if (data.status === "completed" && data.modelUrl) {
            if (pollRef.current) clearInterval(pollRef.current);
            await loadModel(data.modelUrl, data.generationId ?? null);
            fetchBalance();
          } else if (data.status === "failed") {
            if (pollRef.current) clearInterval(pollRef.current);
            setStage({
              name: "error",
              message: data.error ?? "A geração falhou. Tente outra imagem.",
            });
            fetchBalance();
          } else {
            setStage({
              name: "processing",
              jobId,
              progress: data.progress,
            });
          }
        } catch {
          // erro transitório de rede: mantém o polling
        }
      }, POLL_MS);
    },
    [loadModel, fetchBalance]
  );

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setStage({ name: "error", message: "Use uma imagem JPG, PNG ou WebP." });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setStage({ name: "error", message: "Imagem muito grande (máx. 10MB)." });
      return;
    }

    setPreview(URL.createObjectURL(file));
    setStage({ name: "uploading" });

    const formData = new FormData();
    formData.append("image", file);
    formData.append("engine", engine);

    try {
      const res = await fetch("/api/generate/image-to-3d", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStage({ name: "processing", jobId: data.jobId });
      startPolling(data.jobId);
    } catch (err) {
      setStage({
        name: "error",
        message:
          err instanceof Error ? err.message : "Falha ao enviar a imagem.",
      });
    }
  }

  async function sendOrder() {
    if (stage.name !== "done" || !stage.generationId) return;
    setOrderState((s) => ({ ...s, sending: true, message: null }));
    try {
      const res = await fetch("/api/webhook/n8n", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generationId: stage.generationId,
          customerName: orderState.name,
          customerPhone: orderState.phone,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOrderState((s) => ({
        ...s,
        sending: false,
        open: false,
        message: "Pedido enviado! Entraremos em contato pelo WhatsApp.",
      }));
    } catch (err) {
      setOrderState((s) => ({
        ...s,
        sending: false,
        message: err instanceof Error ? err.message : "Falha ao enviar.",
      }));
    }
  }

  const busy = stage.name === "uploading" || stage.name === "processing";

  return (
    <ToolShell
      title="Image to 3D"
      description="Envie uma foto e a IA gera um modelo 3D completo, pronto pra impressão."
    >
      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="flex flex-col gap-4">
          {stage.name === "done" && stage.object ? (
            <Model3DViewer>
              <primitive object={stage.object} />
            </Model3DViewer>
          ) : (
            <div className="w-full h-[420px] rounded-xl border-2 border-dashed border-white/15 bg-white/[0.03] flex flex-col items-center justify-center gap-3 relative overflow-hidden">
              {preview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview}
                  alt="Imagem enviada"
                  className="absolute inset-0 w-full h-full object-contain opacity-20"
                />
              )}
              <div className="relative z-10 flex flex-col items-center gap-3 text-center px-4">
                {busy ? (
                  <>
                    <div className="w-10 h-10 border-4 border-white/15 border-t-mint rounded-full animate-spin" />
                    <p className="text-white/80">
                      {stage.name === "uploading"
                        ? "Enviando imagem..."
                        : `Gerando modelo 3D... ${
                            stage.name === "processing" &&
                            stage.progress != null
                              ? `${Math.round(stage.progress)}%`
                              : ""
                          }`}
                    </p>
                    <p className="text-sm text-white/40">
                      Isso costuma levar de 1 a 3 minutos. Pode deixar a página
                      aberta.
                    </p>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => inputRef.current?.click()}
                      className="px-5 py-3 rounded-lg bg-mint hover:bg-mint-soft font-medium"
                    >
                      Escolher imagem
                    </button>
                    <p className="text-sm text-white/40">
                      JPG, PNG ou WebP até 10MB. Objetos bem iluminados e com
                      fundo limpo geram os melhores modelos.
                    </p>
                    {stage.name === "error" && (
                      <p className="text-sm text-red-400">{stage.message}</p>
                    )}
                    {stage.name === "done" && !stage.object && (
                      <p className="text-sm text-white/55">
                        Modelo gerado! O preview 3D não carregou, mas o download
                        está disponível ao lado.
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10">
            <span className="font-mono text-[10px] tracking-wide text-white/40 uppercase">
              Saldo 3D AI Studio
            </span>
            {balance === null ? (
              <span className="text-sm text-white/30">—</span>
            ) : (
              <span
                className={`text-sm font-medium tabular-nums ${
                  balance < 1 ? "text-red-400" : "text-white/85"
                }`}
              >
                ${balance.toFixed(2)}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-3 p-4 rounded-xl bg-white/[0.04] border border-white/10">
            <span className="text-sm text-white/80">Motor de geração</span>
            <div className="flex flex-col gap-2">
              {IMAGE_TO_3D_ENGINES.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setEngine(e.id)}
                  disabled={busy}
                  className={`text-left px-3 py-2.5 rounded-lg border transition-colors ${
                    engine === e.id
                      ? "bg-mint/10 border-mint"
                      : "bg-white/[0.03] border-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-sm font-medium ${
                        engine === e.id ? "text-mint" : "text-white/85"
                      }`}
                    >
                      {e.label}
                    </span>
                    <span className="font-mono text-[10px] text-white/40">
                      {e.time}
                    </span>
                  </div>
                  <p className="text-xs text-white/45 mt-0.5">{e.tagline}</p>
                  <p className="font-mono text-[10px] text-white/30 mt-1">
                    {e.credits}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {stage.name === "done" && (
            <div className="flex flex-col gap-3 p-4 rounded-xl bg-white/[0.04] border border-white/10">
              <a
                href={stage.modelUrl}
                download="modelo-trivertido"
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm font-medium text-center"
              >
                Baixar modelo 3D
              </a>
              {stage.generationId && (
                <button
                  onClick={() =>
                    setOrderState((s) => ({ ...s, open: !s.open }))
                  }
                  className="px-4 py-2 rounded-lg bg-mint hover:bg-mint-soft text-sm font-medium"
                >
                  Pedir impressão
                </button>
              )}
              {orderState.open && (
                <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
                  <input
                    value={orderState.name}
                    onChange={(e) =>
                      setOrderState((s) => ({ ...s, name: e.target.value }))
                    }
                    placeholder="Seu nome"
                    className="px-3 py-2 rounded-lg bg-white/[0.06] border border-white/15 text-sm"
                  />
                  <input
                    value={orderState.phone}
                    onChange={(e) =>
                      setOrderState((s) => ({ ...s, phone: e.target.value }))
                    }
                    placeholder="WhatsApp (com DDD)"
                    className="px-3 py-2 rounded-lg bg-white/[0.06] border border-white/15 text-sm"
                  />
                  <button
                    onClick={sendOrder}
                    disabled={
                      orderState.sending || !orderState.name || !orderState.phone
                    }
                    className="px-4 py-2 rounded-lg bg-mint hover:bg-mint-soft disabled:opacity-40 text-sm font-medium"
                  >
                    {orderState.sending ? "Enviando..." : "Confirmar pedido"}
                  </button>
                </div>
              )}
              {orderState.message && (
                <p className="text-sm text-white/80">{orderState.message}</p>
              )}
              <button
                onClick={() => {
                  setStage({ name: "idle" });
                  setPreview(null);
                }}
                className="text-sm text-mint hover:underline"
              >
                Gerar outro modelo
              </button>
            </div>
          )}

          <p className="text-xs text-white/40 px-1">
            Cada geração consome créditos da conta 3D AI Studio. Tripo é o
            ponto de partida recomendado — a malha sai mais organizada pra
            imprimir. Troque pra Hunyuan Pro quando precisar de mais detalhe
            (custa mais e demora mais).
          </p>
        </div>
      </div>
    </ToolShell>
  );
}
