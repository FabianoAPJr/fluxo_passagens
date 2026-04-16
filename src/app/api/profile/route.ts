import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  personalEmail: z.string().email("E-mail inválido").nullable().or(z.literal("")),
});

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const personalEmail = parsed.data.personalEmail || null;

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { personalEmail },
    select: { id: true, personalEmail: true },
  });

  return NextResponse.json(user);
}
