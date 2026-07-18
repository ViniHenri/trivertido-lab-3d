import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // nunca prerenderizar no build (precisa do Supabase em runtime)

export interface FilamentColor {
  id: number;
  tipo: string;
  cor: string; // hex
  cor_nome: string;
}

/** Cores de filamento disponíveis no estoque (qty > 0), pro cliente escolher. */
export async function GET() {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("stock")
    .select("id, tipo, cor, cor_nome, qty")
    .eq("category", "fil")
    .order("cor_nome");

  if (error) {
    console.error(error);
    return NextResponse.json({ colors: [] });
  }

  const colors: FilamentColor[] = (data ?? [])
    .filter((r) => Number(r.qty) > 0 && r.cor_nome)
    .map(({ id, tipo, cor, cor_nome }) => ({ id, tipo, cor, cor_nome }));

  return NextResponse.json({ colors });
}
