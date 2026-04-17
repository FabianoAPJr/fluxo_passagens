import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import StatusBadge from "@/components/status-badge";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PlusCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Prisma, RequestStatus } from "@prisma/client";
import RequestsFilters from "./requests-filters";

interface SearchParams {
  status?: string;
  q?: string;
  from?: string;
  to?: string;
}

const ALL_STATUSES: RequestStatus[] = [
  "PENDING_MANAGER",
  "REJECTED_BY_MANAGER",
  "PENDING_MANAGER_2",
  "REJECTED_BY_MANAGER_2",
  "PENDING_QUOTATION",
  "PENDING_TRAVELER",
  "APPROVED",
  "REJECTED_BY_TRAVELER",
  "CANCELLED",
];

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const params = await searchParams;
  const { id: userId, role } = session.user;

  const filters: Prisma.TravelRequestWhereInput[] = [];

  // Role-based filter
  if (role === "GESTOR") {
    filters.push({
      OR: [
        { managerId: userId },
        { manager2Id: userId },
        { requesterId: userId },
      ],
    });
  } else if (role === "FINANCEIRO") {
    filters.push({
      status: {
        in: [
          "PENDING_QUOTATION",
          "PENDING_TRAVELER",
          "APPROVED",
          "REJECTED_BY_TRAVELER",
        ] as RequestStatus[],
      },
    });
  } else if (role !== "MASTER") {
    filters.push({ requesterId: userId });
  }

  // User filters from query string
  if (params.status && ALL_STATUSES.includes(params.status as RequestStatus)) {
    filters.push({ status: params.status as RequestStatus });
  }

  if (params.q && params.q.trim()) {
    const q = params.q.trim();
    filters.push({
      OR: [
        { destination: { contains: q, mode: "insensitive" } },
        { origin: { contains: q, mode: "insensitive" } },
        { requester: { name: { contains: q, mode: "insensitive" } } },
      ],
    });
  }

  if (params.from) {
    const d = new Date(params.from);
    if (!Number.isNaN(d.getTime()))
      filters.push({ departureDate: { gte: d } });
  }

  if (params.to) {
    const d = new Date(params.to);
    if (!Number.isNaN(d.getTime())) {
      d.setHours(23, 59, 59, 999);
      filters.push({ departureDate: { lte: d } });
    }
  }

  const whereClause: Prisma.TravelRequestWhereInput =
    filters.length > 0 ? { AND: filters } : {};

  const requests = await prisma.travelRequest.findMany({
    where: whereClause,
    include: {
      requester: { select: { name: true } },
      manager: { select: { name: true } },
      manager2: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const hasFilters = !!(params.q || params.status || params.from || params.to);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Solicitações</h1>
          <p className="text-sm text-gray-500 mt-1">
            {requests.length} solicitação(ões) encontrada(s)
            {hasFilters ? " · filtros aplicados" : ""}
          </p>
        </div>
        {["COLABORADOR", "GESTOR", "MASTER"].includes(role) && (
          <Link
            href="/requests/new"
            className={cn(
              buttonVariants(),
              "bg-[#004d33] hover:bg-[#49624e] text-white",
            )}
          >
            <PlusCircle size={16} className="mr-2" />
            Nova solicitação
          </Link>
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          <RequestsFilters
            initialStatus={params.status}
            initialQ={params.q}
            initialFrom={params.from}
            initialTo={params.to}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {requests.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-sm">
                {hasFilters
                  ? "Nenhuma solicitação encontrada com os filtros atuais."
                  : "Nenhuma solicitação encontrada."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Trajeto</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Solicitante</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Gestor</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">2º gestor</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Ida</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Volta</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Atualizado</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => (
                    <tr key={req.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/requests/${req.id}`} className="font-medium text-[#004d33] hover:underline">
                          {req.origin ? `${req.origin} → ${req.destination}` : req.destination}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{req.requester.name}</td>
                      <td className="px-4 py-3 text-gray-600">{req.manager.name}</td>
                      <td className="px-4 py-3 text-gray-600">{req.manager2?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{format(new Date(req.departureDate), "dd/MM/yyyy", { locale: ptBR })}</td>
                      <td className="px-4 py-3 text-gray-600">{format(new Date(req.returnDate), "dd/MM/yyyy", { locale: ptBR })}</td>
                      <td className="px-4 py-3"><StatusBadge status={req.status} /></td>
                      <td className="px-4 py-3 text-gray-400">{format(new Date(req.updatedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
