import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, Clock, CheckCircle, XCircle, Plane } from "lucide-react";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");

  const isAdmin = session.user.role === "ADMIN" || session.user.role === "MASTER";

  const [myRequests, pendingCount, approvedCount, rejectedCount] = await Promise.all([
    prisma.travelRequest.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.travelRequest.count({
      where: isAdmin ? { status: "PENDING" } : { userId: session.user.id, status: "PENDING" },
    }),
    prisma.travelRequest.count({
      where: isAdmin ? { status: "APPROVED" } : { userId: session.user.id, status: "APPROVED" },
    }),
    prisma.travelRequest.count({
      where: isAdmin ? { status: "REJECTED" } : { userId: session.user.id, status: "REJECTED" },
    }),
  ]);

  const statusLabel: Record<string, { label: string; className: string }> = {
    PENDING: { label: "Pendente", className: "bg-yellow-100 text-yellow-800" },
    APPROVED: { label: "Aprovada", className: "bg-green-100 text-green-800" },
    REJECTED: { label: "Rejeitada", className: "bg-red-100 text-red-800" },
    CANCELLED: { label: "Cancelada", className: "bg-gray-100 text-gray-600" },
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted">
            Bem-vindo, {session.user.name}!
          </p>
        </div>
        <Link
          href="/requests/new"
          className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white font-medium py-2.5 px-5 rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nova Solicitação
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-muted">Pendentes</p>
              <p className="text-2xl font-bold">{pendingCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted">Aprovadas</p>
              <p className="text-2xl font-bold">{approvedCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="bg-red-100 p-3 rounded-lg">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted">Rejeitadas</p>
              <p className="text-2xl font-bold">{rejectedCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold">Últimas Solicitações</h2>
        </div>
        {myRequests.length === 0 ? (
          <div className="p-12 text-center">
            <Plane className="h-12 w-12 text-muted mx-auto mb-4" />
            <p className="text-muted">Nenhuma solicitação ainda.</p>
            <Link href="/requests/new" className="text-primary hover:underline text-sm mt-2 inline-block">
              Criar primeira solicitação
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-3 font-medium text-muted">Origem</th>
                  <th className="text-left px-6 py-3 font-medium text-muted">Destino</th>
                  <th className="text-left px-6 py-3 font-medium text-muted">Ida</th>
                  <th className="text-left px-6 py-3 font-medium text-muted">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {myRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">{req.origin}</td>
                    <td className="px-6 py-4">{req.destination}</td>
                    <td className="px-6 py-4">
                      {new Date(req.departureDate).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusLabel[req.status].className}`}>
                        {statusLabel[req.status].label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
