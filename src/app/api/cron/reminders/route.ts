import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, emailReminder } from "@/lib/email";
import type { RequestStatus, User } from "@prisma/client";

const DAYS_STUCK_THRESHOLD = 3;
const DAYS_BETWEEN_REMINDERS = 3;

const ACTION_LABELS: Partial<Record<RequestStatus, string>> = {
  PENDING_MANAGER: "aprovação do 1º gestor",
  PENDING_MANAGER_2: "aprovação do 2º gestor",
  PENDING_QUOTATION: "cotação do Financeiro",
  PENDING_TRAVELER: "decisão do solicitante",
};

const SUBJECT_LABELS: Partial<Record<RequestStatus, string>> = {
  PENDING_MANAGER: "Aprovação pendente",
  PENDING_MANAGER_2: "2ª aprovação pendente",
  PENDING_QUOTATION: "Cotação pendente",
  PENDING_TRAVELER: "Decisão pendente",
};

function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
}

function recipientsFor(
  status: RequestStatus,
  req: {
    manager: User | null;
    manager2: User | null;
    requester: User | null;
  },
  financials: User[],
): User[] {
  switch (status) {
    case "PENDING_MANAGER":
      return req.manager ? [req.manager] : [];
    case "PENDING_MANAGER_2":
      return req.manager2 ? [req.manager2] : [];
    case "PENDING_QUOTATION":
      return financials;
    case "PENDING_TRAVELER":
      return req.requester ? [req.requester] : [];
    default:
      return [];
  }
}

function emailsOf(users: User[]): string[] {
  const out: string[] = [];
  for (const u of users) {
    if (u.email) out.push(u.email);
    if (u.personalEmail) out.push(u.personalEmail);
  }
  return out;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stuckCutoff = new Date(Date.now() - DAYS_STUCK_THRESHOLD * 24 * 60 * 60 * 1000);
  const reminderCutoff = new Date(Date.now() - DAYS_BETWEEN_REMINDERS * 24 * 60 * 60 * 1000);

  const stuck = await prisma.travelRequest.findMany({
    where: {
      status: {
        in: [
          "PENDING_MANAGER",
          "PENDING_MANAGER_2",
          "PENDING_QUOTATION",
          "PENDING_TRAVELER",
        ] as RequestStatus[],
      },
      updatedAt: { lt: stuckCutoff },
      OR: [
        { lastReminderAt: null },
        { lastReminderAt: { lt: reminderCutoff } },
      ],
    },
    include: {
      requester: true,
      manager: true,
      manager2: true,
    },
  });

  if (stuck.length === 0) {
    return NextResponse.json({ checked: 0, sent: 0 });
  }

  // Buscar financeiros uma vez (para PENDING_QUOTATION)
  const needFinancials = stuck.some((r) => r.status === "PENDING_QUOTATION");
  const financials = needFinancials
    ? await prisma.user.findMany({
        where: { role: { in: ["FINANCEIRO", "MASTER"] } },
      })
    : [];

  const baseUrl = process.env.NEXTAUTH_URL!;
  let sent = 0;
  const errors: string[] = [];

  for (const request of stuck) {
    try {
      const recipients = recipientsFor(request.status, request, financials);
      const emails = emailsOf(recipients);
      if (emails.length === 0) continue;

      const daysStuck = daysSince(request.updatedAt);
      const action = ACTION_LABELS[request.status] ?? "ação";
      const subjectLabel = SUBJECT_LABELS[request.status] ?? "Ação pendente";

      await sendEmail({
        to: emails,
        subject: `[SOMUS-Travel] Lembrete: ${subjectLabel} – ${request.requester.name} – ${request.destination}`,
        html: emailReminder({
          requesterName: request.requester.name ?? "Colaborador",
          origin: request.origin ?? "—",
          destination: request.destination,
          departureDate: request.departureDate,
          departureTimeFrom: request.departureTimeFrom,
          departureTimeTo: request.departureTimeTo,
          returnDate: request.returnDate,
          returnTimeFrom: request.returnTimeFrom,
          returnTimeTo: request.returnTimeTo,
          reason: request.reason,
          requestUrl: `${baseUrl}/requests/${request.id}`,
          daysStuck,
          actionNeeded: action,
        }),
      });

      await prisma.travelRequest.update({
        where: { id: request.id },
        data: { lastReminderAt: new Date() },
      });

      sent++;
    } catch (e) {
      errors.push(`${request.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return NextResponse.json({ checked: stuck.length, sent, errors });
}
