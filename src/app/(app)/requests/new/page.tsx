import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import NewRequestForm from "./new-request-form";

export default async function NewRequestPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  if (!["COLABORADOR", "GESTOR", "MASTER"].includes(session.user.role)) {
    redirect("/dashboard");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      manager: { select: { id: true, name: true, email: true } },
      manager2: { select: { id: true, name: true, email: true } },
    },
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Nova solicitação de viagem</h1>
        <p className="text-sm text-gray-500 mt-1">Preencha os dados da sua viagem para enviar ao gestor.</p>
      </div>
      <NewRequestForm manager={user?.manager ?? null} manager2={user?.manager2 ?? null} />
    </div>
  );
}
