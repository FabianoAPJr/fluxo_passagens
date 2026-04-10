import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AdminActions from "./AdminActions";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");
  if (session.user.role !== "ADMIN" && session.user.role !== "MASTER") redirect("/dashboard");

  const [pendingRequests, users] = await Promise.all([
    prisma.travelRequest.findMany({
      where: { status: "PENDING" },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    session.user.role === "MASTER"
      ? prisma.user.findMany({
          orderBy: { createdAt: "desc" },
          select: { id: true, name: true, email: true, role: true, createdAt: true },
        })
      : [],
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold mb-8">Painel Administrativo</h1>

      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4">
          Solicitações Pendentes ({pendingRequests.length})
        </h2>
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-muted">Solicitante</th>
                <th className="text-left px-6 py-3 font-medium text-muted">Trecho</th>
                <th className="text-left px-6 py-3 font-medium text-muted">Ida</th>
                <th className="text-left px-6 py-3 font-medium text-muted">Motivo</th>
                <th className="text-left px-6 py-3 font-medium text-muted">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pendingRequests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted">
                    Nenhuma solicitação pendente.
                  </td>
                </tr>
              ) : (
                pendingRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">{req.user.name || req.user.email}</td>
                    <td className="px-6 py-4">{req.origin} → {req.destination}</td>
                    <td className="px-6 py-4">{new Date(req.departureDate).toLocaleDateString("pt-BR")}</td>
                    <td className="px-6 py-4 max-w-xs truncate">{req.reason}</td>
                    <td className="px-6 py-4">
                      <AdminActions requestId={req.id} type="request" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {session.user.role === "MASTER" && (
        <section>
          <h2 className="text-lg font-semibold mb-4">
            Usuários ({users.length})
          </h2>
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-3 font-medium text-muted">Nome</th>
                  <th className="text-left px-6 py-3 font-medium text-muted">Email</th>
                  <th className="text-left px-6 py-3 font-medium text-muted">Papel</th>
                  <th className="text-left px-6 py-3 font-medium text-muted">Desde</th>
                  <th className="text-left px-6 py-3 font-medium text-muted">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">{u.name || "—"}</td>
                    <td className="px-6 py-4">{u.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        u.role === "MASTER" ? "bg-purple-100 text-purple-800" :
                        u.role === "ADMIN" ? "bg-blue-100 text-blue-800" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted">
                      {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-6 py-4">
                      <AdminActions userId={u.id} currentRole={u.role} type="user" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
