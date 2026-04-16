import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/constants";
import ProfileForm from "./profile-form";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      personalEmail: true,
      manager: { select: { name: true, email: true } },
    },
  });

  if (!user) return null;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Meu perfil</h1>
        <p className="text-sm text-gray-500 mt-1">Suas informações e preferências.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informações da conta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Nome</span>
            <span className="font-medium">{user.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">E-mail corporativo</span>
            <span className="font-medium">{user.email}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Perfil</span>
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", ROLE_COLORS[user.role])}>
              {ROLE_LABELS[user.role]}
            </span>
          </div>
          {user.manager && (
            <div className="flex justify-between">
              <span className="text-gray-500">Gestor</span>
              <span className="font-medium">{user.manager.name}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">E-mail pessoal para notificações</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Cadastre um e-mail pessoal opcional. Você receberá as notificações no seu e-mail corporativo e também neste endereço.
          </p>
          <ProfileForm currentPersonalEmail={user.personalEmail ?? ""} />
        </CardContent>
      </Card>
    </div>
  );
}
