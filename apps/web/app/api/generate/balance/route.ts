import { NextResponse } from "next/server";
import { getCreditBalance } from "@/lib/providers/3daistudio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Saldo da conta 3D AI Studio — pra avisar antes de gerar sem crédito. */
export async function GET() {
  try {
    const balance = await getCreditBalance();
    return NextResponse.json({ balance });
  } catch (err) {
    console.error("Falha ao consultar saldo 3D AI Studio:", err);
    return NextResponse.json({ balance: null });
  }
}
