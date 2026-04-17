import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { sendEmail, emailNewRequest, emailManagerApproved, emailManagerRejected, emailQuotationReady, emailTravelerApproved, emailTravelerRejected } from "@/lib/email";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const actionSchema = z.object({
  action: z.enum([
    "approve_manager",
    "reject_manager",
    "approve_manager_2",
    "reject_manager_2",
    "submit_quotation",
    "approve_traveler",
    "reject_traveler",
    "cancel",
  ]),
  rejectionReason: z.string().optional(),
  quotation: z.object({
    outboundFlight: z.string().min(1),
    returnFlight: z.string().optional(),
    airline: z.string().min(1),
    totalPrice: z.number().positive(),
    currency: z.string().default("BRL"),
    observations: z.string().optional(),
  }).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const request = await prisma.travelRequest.findUnique({
    where: { id },
    include: {
      requester: { select: { id: true, name: true, email: true, personalEmail: true } },
      manager: { select: { id: true, name: true, email: true } },
      manager2: { select: { id: true, name: true, email: true } },
      quotation: { include: { financial: { select: { id: true, name: true, email: true } } } },
    },
  });

  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Access control
  const { id: userId, role } = session.user;
  const canView =
    role === "MASTER" ||
    request.requesterId === userId ||
    request.managerId === userId ||
    request.manager2Id === userId ||
    role === "FINANCEIRO";
  if (!canView) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json(request);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const request = await prisma.travelRequest.findUnique({
    where: { id },
    include: {
      requester: true,
      manager: true,
      manager2: true,
      quotation: true,
    },
  });
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { action, rejectionReason, quotation } = parsed.data;
  const { id: userId, role } = session.user;
  const baseUrl = process.env.NEXTAUTH_URL!;
  const requestUrl = `${baseUrl}/requests/${id}`;
  const fmt = (d: Date) => format(d, "dd/MM/yyyy", { locale: ptBR });

  const emailData = {
    requesterName: request.requester.name ?? "Colaborador",
    destination: request.destination,
    departureDate: fmt(request.departureDate),
    returnDate: fmt(request.returnDate),
    reason: request.reason,
    requestUrl,
  };

  const notifyUser = async (user: { email: string | null; personalEmail?: string | null }, subject: string, html: string) => {
    try {
      const to = [user.email!];
      if (user.personalEmail) to.push(user.personalEmail);
      await sendEmail({ to, subject, html });
    } catch (e) {
      console.error("Email error:", e);
    }
  };

  let updated;

  if (action === "approve_manager") {
    if (role !== "GESTOR" && role !== "MASTER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (request.managerId !== userId && role !== "MASTER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (request.status !== "PENDING_MANAGER") return NextResponse.json({ error: "Status inválido" }, { status: 400 });

    const hasManager2 = !!request.manager2Id;
    const nextStatus = hasManager2 ? "PENDING_MANAGER_2" : "PENDING_QUOTATION";

    updated = await prisma.travelRequest.update({
      where: { id: id },
      data: { status: nextStatus },
    });

    if (hasManager2) {
      // Notify 2nd manager
      const manager2 = await prisma.user.findUnique({ where: { id: request.manager2Id! } });
      if (manager2) {
        await notifyUser(manager2, `[SOMUS-Travel] 2ª aprovação pendente – ${emailData.requesterName} – ${request.destination}`, emailNewRequest({ ...emailData }));
      }
    } else {
      // Notify financial team
      const financials = await prisma.user.findMany({ where: { role: { in: ["FINANCEIRO", "MASTER"] } } });
      for (const f of financials) {
        await notifyUser(f, `[SOMUS-Travel] Cotação necessária – ${emailData.requesterName} – ${request.destination}`, emailManagerApproved({ ...emailData }));
      }
    }
  }

  else if (action === "reject_manager") {
    if (role !== "GESTOR" && role !== "MASTER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (request.managerId !== userId && role !== "MASTER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (request.status !== "PENDING_MANAGER") return NextResponse.json({ error: "Status inválido" }, { status: 400 });
    if (!rejectionReason) return NextResponse.json({ error: "Motivo obrigatório" }, { status: 400 });

    updated = await prisma.travelRequest.update({
      where: { id: id },
      data: { status: "REJECTED_BY_MANAGER", rejectionReason },
    });

    await notifyUser(request.requester, `[SOMUS-Travel] Viagem negada – ${emailData.requesterName} – ${request.destination}`, emailManagerRejected({ ...emailData, rejectionReason }));
  }

  else if (action === "approve_manager_2") {
    if (role !== "GESTOR" && role !== "MASTER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (request.manager2Id !== userId && role !== "MASTER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (request.status !== "PENDING_MANAGER_2") return NextResponse.json({ error: "Status inválido" }, { status: 400 });

    updated = await prisma.travelRequest.update({
      where: { id: id },
      data: { status: "PENDING_QUOTATION" },
    });

    // Notify financial team
    const financials = await prisma.user.findMany({ where: { role: { in: ["FINANCEIRO", "MASTER"] } } });
    for (const f of financials) {
      await notifyUser(f, `[SOMUS-Travel] Cotação necessária – ${emailData.requesterName} – ${request.destination}`, emailManagerApproved({ ...emailData }));
    }
  }

  else if (action === "reject_manager_2") {
    if (role !== "GESTOR" && role !== "MASTER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (request.manager2Id !== userId && role !== "MASTER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (request.status !== "PENDING_MANAGER_2") return NextResponse.json({ error: "Status inválido" }, { status: 400 });
    if (!rejectionReason) return NextResponse.json({ error: "Motivo obrigatório" }, { status: 400 });

    updated = await prisma.travelRequest.update({
      where: { id: id },
      data: { status: "REJECTED_BY_MANAGER_2", rejectionReason },
    });

    await notifyUser(request.requester, `[SOMUS-Travel] Viagem negada pelo 2º gestor – ${emailData.requesterName} – ${request.destination}`, emailManagerRejected({ ...emailData, rejectionReason }));
  }

  else if (action === "submit_quotation") {
    if (role !== "FINANCEIRO" && role !== "MASTER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (request.status !== "PENDING_QUOTATION") return NextResponse.json({ error: "Status inválido" }, { status: 400 });
    if (!quotation) return NextResponse.json({ error: "Cotação obrigatória" }, { status: 400 });

    await prisma.quotation.upsert({
      where: { requestId: id },
      create: { requestId: id, financialId: userId, ...quotation },
      update: { financialId: userId, ...quotation },
    });

    updated = await prisma.travelRequest.update({
      where: { id: id },
      data: { status: "PENDING_TRAVELER" },
    });

    const price = new Intl.NumberFormat("pt-BR", { style: "currency", currency: quotation.currency }).format(quotation.totalPrice);
    await notifyUser(request.requester, `[SOMUS-Travel] Cotação disponível – ${request.destination}`, emailQuotationReady({ ...emailData, airline: quotation.airline, totalPrice: price }));
  }

  else if (action === "approve_traveler") {
    if (request.requesterId !== userId && role !== "MASTER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (request.status !== "PENDING_TRAVELER") return NextResponse.json({ error: "Status inválido" }, { status: 400 });

    updated = await prisma.travelRequest.update({
      where: { id: id },
      data: { status: "APPROVED" },
      include: { quotation: true },
    });

    const airline = (updated as any).quotation?.airline ?? "N/A";
    await notifyUser(request.manager, `[SOMUS-Travel] Viagem confirmada – ${emailData.requesterName} – ${request.destination}`, emailTravelerApproved({ ...emailData, airline }));
  }

  else if (action === "reject_traveler") {
    if (request.requesterId !== userId && role !== "MASTER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (request.status !== "PENDING_TRAVELER") return NextResponse.json({ error: "Status inválido" }, { status: 400 });
    if (!rejectionReason) return NextResponse.json({ error: "Motivo obrigatório" }, { status: 400 });

    updated = await prisma.travelRequest.update({
      where: { id: id },
      data: { status: "REJECTED_BY_TRAVELER", rejectionReason },
    });

    const financials = await prisma.user.findMany({ where: { role: { in: ["FINANCEIRO", "MASTER"] } } });
    for (const f of financials) {
      await notifyUser(f, `[SOMUS-Travel] Cotação recusada – ${emailData.requesterName} – ${request.destination}`, emailTravelerRejected({ ...emailData, rejectionReason }));
    }
  }

  else if (action === "cancel") {
    if (request.requesterId !== userId && role !== "MASTER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!["PENDING_MANAGER", "PENDING_MANAGER_2", "PENDING_QUOTATION"].includes(request.status)) {
      return NextResponse.json({ error: "Não é possível cancelar neste status" }, { status: 400 });
    }

    updated = await prisma.travelRequest.update({
      where: { id: id },
      data: { status: "CANCELLED" },
    });
  }

  return NextResponse.json(updated);
}
