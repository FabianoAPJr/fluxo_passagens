import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import LoginButton from "@/components/login-button";
import { Plane } from "lucide-react";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1e3a5f] to-[#2d5fa6]">
      <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-md text-center">
        <div className="flex justify-center mb-6">
          <div className="bg-[#1e3a5f] text-white p-4 rounded-full">
            <Plane size={36} />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-1">
          Passagens Aéreas
        </h1>
        <p className="text-gray-500 text-sm mb-8">SOMUS Capital</p>

        <p className="text-gray-600 mb-6 text-sm">
          Entre com a sua conta Microsoft corporativa para acessar o sistema.
        </p>

        <LoginButton />

        <p className="mt-6 text-xs text-gray-400">
          Apenas contas <strong>@somuscapital.com.br</strong> são permitidas.
        </p>
      </div>
    </div>
  );
}
