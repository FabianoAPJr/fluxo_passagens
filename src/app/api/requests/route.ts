import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { origin, destination, departureDate, returnDate, passengers, reason } = body;

  if (!origin || !destination || !departureDate || !reason) {
    return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 });
  }

  const request = await prisma.travelRequest.create({
    data: {
      userId: session.user.id,
      origin,
      destination,
      departureDate: new Date(departureDate),
      returnDate: returnDate ? new Date(returnDate) : null,
      passengers: passengers || 1,
      reason,
    },
  });

  return NextResponse.json(request, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN" && session.user.role !== "MASTER") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await req.json();
  const { id, status, notes } = body;

  if (!id || !status) {
    return NextResponse.json({ error: "ID e status são obrigatórios" }, { status: 400 });
  }

  const updated = await prisma.travelRequest.update({
    where: { id },
    data: {
      status,
      approvedById: session.user.id,
      notes: notes || null,
    },
  });

  return NextResponse.json(updated);
}
