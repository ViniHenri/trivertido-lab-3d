import { NextResponse } from "next/server";
import { activeProvider } from "@/lib/providers/3daistudio";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  try {
    const result = await activeProvider.getStatus(jobId);
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Falha ao consultar o status do job." },
      { status: 500 }
    );
  }
}
