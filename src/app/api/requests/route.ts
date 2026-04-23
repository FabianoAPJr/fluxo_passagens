import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { sendEmail, emailNewRequest } from "@/lib/email";
import type { RequestStatus } from "@prisma/client";

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const createSchema = z.object({
  origin: z.string().min(2),
  destination: z.string().min(2),
  departureDate: z.string(),
  departureTimeFrom: z.string().regex(timeRegex),
  departureTimeTo: z.string().regex(timeRegex),
  returnDate: z.string(),
  returnTimeFrom: z.string().regex(timeRegex),
  returnTimeTo: z.string().regex(timeRegex),
  reason: z.string().min(10),
  managerId: z.string(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: userId, role } = session.user;
  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status") as RequestStatus | null;

  const whereClause: any =
    role === "MASTER"
      ? {}
      : role === "GESTOR"
      ? { OR: [{ managerId: userId }, { manager2Id: userId }, { requesterId: userId }] }
      : role === "FINANCEIRO"
      ? { status: { in: ["PENDING_QUOTATION", "PENDING_TRAVELER", "APPROVED", "REJECTED_BY_TRAVELER"] as RequestStatus[] } }
      : { requesterId: userId };

  if (statusFilter) whereClause.status = statusFilter;

  const requests = await prisma.travelRequest.findMany({
    where: whereClause,
    include: {
      requester: { select: { id: true, name: true, email: true } },
      manager: { select: { id: true, name: true, email: true } },
      manager2: { select: { id: true, name: true, email: true } },
      quotation: { include: { financial: { select: { name: true } } } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(requests);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["COLABORADOR", "GESTOR", "MASTER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const {
    origin,
    destination,
    departureDate,
    departureTimeFrom,
    departureTimeTo,
    returnDate,
    returnTimeFrom,
    returnTimeTo,
    reason,
    managerId,
  } = parsed.data;

  const manager = await prisma.user.findUnique({ where: { id: managerId } });
  if (!manager || !["GESTOR", "MASTER"].includes(manager.role)) {
    return NextResponse.json({ error: "Gestor inválido" }, { status: 400 });
  }

  const requester = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { manager2Id: true },
  });

  const request = await prisma.travelRequest.create({
    data: {
      requester: { connect: { id: session.user.id } },
      manager: { connect: { id: managerId } },
      ...(requester?.manager2Id
        ? { manager2: { connect: { id: requester.manager2Id } } }
        : {}),
      origin,
      destination,
      departureDate: new Date(departureDate),
      departureTimeFrom,
      departureTimeTo,
      returnDate: new Date(returnDate),
      returnTimeFrom,
      returnTimeTo,
      reason,
      events: {
        create: { actorId: session.user.id, type: "SUBMITTED" },
      },
    },
    include: {
      requester: true,
      manager: true,
      manager2: true,
    },
  });

  // Notify manager
  const requesterName = request.requester.name ?? "Colaborador";
  try {
    const to = [manager.email!];
    if (manager.personalEmail) to.push(manager.personalEmail);
    await sendEmail({
      to,
      subject: `[SOMUS-Travel] Aprovação pendente – ${requesterName} – ${destination}`,
      html: emailNewRequest({
        requesterName,
        origin,
        destination,
        departureDate: new Date(departureDate),
        departureTimeFrom,
        departureTimeTo,
        returnDate: new Date(returnDate),
        returnTimeFrom,
        returnTimeTo,
        reason,
        requestUrl: `${process.env.NEXTAUTH_URL}/requests/${request.id}`,
      }),
    });
  } catch (e) {
    console.error("Email error:", e);
  }

  return NextResponse.json(request, { status: 201 });
}
