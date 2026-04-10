import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  if (session.user.role !== "MASTER") {
    return NextResponse.json({ error: "Apenas MASTER pode alterar papéis" }, { status: 403 });
  }

  const body = await req.json();
  const { id, role } = body;

  if (!id || !role || !["USER", "ADMIN", "MASTER"].includes(role)) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { role },
  });

  return NextResponse.json({ id: updated.id, role: updated.role });
}
