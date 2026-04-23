import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scrapeDecolar } from "@/lib/flight-scraper";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role } = session.user;
  if (role !== "FINANCEIRO" && role !== "MASTER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const request = await prisma.travelRequest.findUnique({ where: { id } });
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (request.status !== "PENDING_QUOTATION") {
    return NextResponse.json(
      { sucesso: false, fallbackDeepLink: true, motivo: "Cotação automática só disponível em solicitações aguardando cotação." },
      { status: 200 },
    );
  }
  if (!request.origin) {
    return NextResponse.json(
      { sucesso: false, fallbackDeepLink: true, motivo: "Solicitação sem aeroporto de origem." },
      { status: 200 },
    );
  }

  const result = await scrapeDecolar({
    origem: request.origin,
    destino: request.destination,
    dataIda: toISODate(request.departureDate),
    dataVolta: toISODate(request.returnDate),
    adultos: 1,
  });

  if (result.sucesso) {
    const top3 = [...result.ofertas].sort((a, b) => a.preco - b.preco).slice(0, 3);
    return NextResponse.json({
      sucesso: true,
      ofertas: top3,
      duracaoMs: result.duracaoMs,
    });
  }
  return NextResponse.json({
    sucesso: false,
    fallbackDeepLink: true,
    motivo: result.erro ?? "Busca automática indisponível no momento.",
    duracaoMs: result.duracaoMs,
  });
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
