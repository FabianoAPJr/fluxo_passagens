import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/constants";
import UsersTable from "./users-table";

export default async function UsersPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "MASTER") redirect("/dashboard");

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      managerId: true,
      manager: { select: { name: true } },
      createdAt: true,
    },
    orderBy: { name: "asc" },
  });

  const managers = users.filter((u) => ["GESTOR", "MASTER"].includes(u.role));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Usuários</h1>
        <p className="text-sm text-gray-500 mt-1">{users.length} usuário(s) cadastrado(s)</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(["MASTER", "GESTOR", "FINANCEIRO", "COLABORADOR"] as const).map((role) => {
          const count = users.filter((u) => u.role === role).length;
          return (
            <Card key={role} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", ROLE_COLORS[role])}>
                  {ROLE_LABELS[role]}
                </span>
                <p className="text-2xl font-bold text-gray-800 mt-2">{count}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Todos os usuários</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <UsersTable users={users} managers={managers} />
        </CardContent>
      </Card>
    </div>
  );
}
