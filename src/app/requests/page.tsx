import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function RequestsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");

  const isAdmin = session.user.role === "ADMIN" || session.user.role === "MASTER";

  const requests = await prisma.travelRequest.findMany({
    where: isAdmin ? {} : { userId: session.user.id },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  const statusLabel: Record<string, { label: string; className: string }> = {
    PENDING: { label: "Pendente", className: "bg-yellow-100 text-yellow-800" },
    APPROVED: { label: "Aprovada", className: "bg-green-100 text-green-800" },
    REJECTED: { label: "Rejeitada", className: "bg-red-100 text-red-800" },
    CANCELLED: { label: "Cancelada", className: "bg-gray-100 text-gray-600" },
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">
          {isAdmin ? "Todas as Solicitações" : "Minhas Solicitações"}
        </h1>
        <Link
          href="/requests/new"
          className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white font-medium py-2.5 px-5 rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nova Solicitação
        </Link>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {isAdmin && <th className="text-left px-6 py-3 font-medium text-muted">Solicitante</th>}
              <th className="text-left px-6 py-3 font-medium text-muted">Origem</th>
              <th className="text-left px-6 py-3 font-medium text-muted">Destino</th>
              <th className="text-left px-6 py-3 font-medium text-muted">Ida</th>
              <th className="text-left px-6 py-3 font-medium text-muted">Volta</th>
              <th className="text-left px-6 py-3 font-medium text-muted">Passageiros</th>
              <th className="text-left px-6 py-3 font-medium text-muted">Status</th>
              <th className="text-left px-6 py-3 font-medium text-muted">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {requests.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 8 : 7} className="px-6 py-12 text-center text-muted">
                  Nenhuma solicitação encontrada.
                </td>
              </tr>
            ) : (
              requests.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50">
                  {isAdmin && <td className="px-6 py-4">{req.user.name || req.user.email}</td>}
                  <td className="px-6 py-4">{req.origin}</td>
                  <td className="px-6 py-4">{req.destination}</td>
                  <td className="px-6 py-4">{new Date(req.departureDate).toLocaleDateString("pt-BR")}</td>
                  <td className="px-6 py-4">
                    {req.returnDate ? new Date(req.returnDate).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td className="px-6 py-4 text-center">{req.passengers}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusLabel[req.status].className}`}>
                      {statusLabel[req.status].label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted">
                    {new Date(req.createdAt).toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
