"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Plane } from "lucide-react";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.replace("/dashboard");
    }
  }, [session, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full mx-4 text-center">
        <div className="flex justify-center mb-6">
          <div className="bg-primary-light p-4 rounded-full">
            <Plane className="h-12 w-12 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Fluxo Passagens
        </h1>
        <p className="text-muted mb-8">
          Gestão de passagens aéreas corporativas
        </p>
        <button
          onClick={() => signIn("azure-ad", { callbackUrl: "/dashboard" })}
          className="w-full flex items-center justify-center gap-3 bg-primary hover:bg-primary-hover text-white font-medium py-3 px-6 rounded-lg transition-colors"
        >
          <svg className="h-5 w-5" viewBox="0 0 21 21" fill="none">
            <path d="M0 0h10v10H0z" fill="#f25022" />
            <path d="M11 0h10v10H11z" fill="#7fba00" />
            <path d="M0 11h10v10H0z" fill="#00a4ef" />
            <path d="M11 11h10v10H11z" fill="#ffb900" />
          </svg>
          Entrar com Microsoft
        </button>
      </div>
    </div>
  );
}
