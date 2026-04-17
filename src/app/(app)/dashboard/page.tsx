import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plane, Clock, CheckCircle, XCircle, ListChecks } from "lucide-react";
import Link from "next/link";
import StatusBadge from "@/components/status-badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { RequestStatus } from "@prisma/client";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const { id: userId, role } = session.user;

  const whereClause =
    role === "MASTER"
      ? {}
      : role === "GESTOR"
      ? { OR: [{ managerId: userId }, { manager2Id: userId }, { requesterId: userId }] }
      : role === "FINANCEIRO"
      ? { status: { in: ["PENDING_QUOTATION", "PENDING_TRAVELER", "APPROVED", "REJECTED_BY_TRAVELER"] as RequestStatus[] } }
      : { requesterId: userId };

  const requests = await prisma.travelRequest.findMany({
    where: whereClause,
    include: {
      requester: { select: { name: true } },
      manager: { select: { name: true } },
      quotation: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 5,
  });

  const counts = await prisma.travelRequest.groupBy({
    by: ["status"],
    where: whereClause,
    _count: true,
  });

  const countMap = counts.reduce((acc, c) => {
    acc[c.status] = c._count;
    return acc;
  }, {} as Record<string, number>);

  const stats = [
    {
      label: "Pendentes",
      value: (countMap["PENDING_MANAGER"] ?? 0) + (countMap["PENDING_QUOTATION"] ?? 0) + (countMap["PENDING_TRAVELER"] ?? 0),
      icon: <Clock className="text-yellow-500" size={22} />,
      bg: "bg-yellow-50",
    },
    {
      label: "Aprovadas",
      value: countMap["APPROVED"] ?? 0,
      icon: <CheckCircle className="text-green-500" size={22} />,
      bg: "bg-green-50",
    },
    {
      label: "Negadas / Recusadas",
      value: (countMap["REJECTED_BY_MANAGER"] ?? 0) + (countMap["REJECTED_BY_TRAVELER"] ?? 0),
      icon: <XCircle className="text-red-500" size={22} />,
      bg: "bg-red-50",
    },
    {
      label: "Total",
      value: Object.values(countMap).reduce((a, b) => a + b, 0),
      icon: <ListChecks className="text-blue-500" size={22} />,
      bg: "bg-blue-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">
          Olá, {session.user.name?.split(" ")[0]}!
        </h1>
        <p className="text-gray-500 text-sm mt-1">Veja o resumo das solicitações de viagem.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className={`${stat.bg} border-0 shadow-sm`}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="shrink-0">{stat.icon}</div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Plane size={16} />
              Últimas solicitações
            </CardTitle>
            <Link href="/requests" className="text-sm text-[#004d33] hover:underline font-medium">
              Ver todas
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Nenhuma solicitação encontrada.</p>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => (
                <Link
                  key={req.id}
                  href={`/requests/${req.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">{req.destination}</p>
                    <p className="text-xs text-gray-400">
                      {req.requester.name} ·{" "}
                      {format(new Date(req.departureDate), "dd MMM yyyy", { locale: ptBR })} →{" "}
                      {format(new Date(req.returnDate), "dd MMM yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <StatusBadge status={req.status} />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
