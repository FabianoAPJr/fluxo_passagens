"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Plane, LogOut, LayoutDashboard, FileText, Shield } from "lucide-react";

export default function Navbar() {
  const { data: session } = useSession();

  if (!session) return null;

  const isAdmin = session.user.role === "ADMIN" || session.user.role === "MASTER";

  return (
    <nav className="bg-white border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2 font-bold text-primary text-lg">
              <Plane className="h-6 w-6" />
              Fluxo Passagens
            </Link>
            <div className="hidden sm:flex items-center gap-1">
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-primary-light transition-colors"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
              <Link
                href="/requests"
                className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-primary-light transition-colors"
              >
                <FileText className="h-4 w-4" />
                Solicitações
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-primary-light transition-colors"
                >
                  <Shield className="h-4 w-4" />
                  Admin
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted">
              <span className="font-medium text-foreground">{session.user.name}</span>
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-primary-light text-primary font-medium">
                {session.user.role}
              </span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-danger hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
