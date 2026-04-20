"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Plane, LayoutDashboard, PlusCircle, List, Users, Settings, Search } from "lucide-react";
import type { Role } from "@prisma/client";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles: Role[];
}

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard size={18} />,
    roles: ["MASTER", "GESTOR", "FINANCEIRO", "COLABORADOR"],
  },
  {
    href: "/requests/new",
    label: "Nova solicitação",
    icon: <PlusCircle size={18} />,
    roles: ["COLABORADOR", "GESTOR", "MASTER"],
  },
  {
    href: "/requests",
    label: "Solicitações",
    icon: <List size={18} />,
    roles: ["MASTER", "GESTOR", "FINANCEIRO", "COLABORADOR"],
  },
  {
    href: "/flight-search",
    label: "Buscar passagens",
    icon: <Search size={18} />,
    roles: ["MASTER", "GESTOR", "FINANCEIRO", "COLABORADOR"],
  },
  {
    href: "/users",
    label: "Usuários",
    icon: <Users size={18} />,
    roles: ["MASTER"],
  },
  {
    href: "/profile",
    label: "Meu perfil",
    icon: <Settings size={18} />,
    roles: ["MASTER", "GESTOR", "FINANCEIRO", "COLABORADOR"],
  },
];

export default function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();

  const visibleItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <aside className="w-60 bg-[#004d33] text-white flex flex-col shrink-0">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
        <div className="bg-white/10 p-2 rounded-lg">
          <Plane size={20} />
        </div>
        <div>
          <p className="font-bold text-sm leading-tight">Passagens Aéreas</p>
          <p className="text-xs text-white/50">SOMUS Capital</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {visibleItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-white/20 text-white font-medium"
                  : "text-white/60 hover:bg-white/10 hover:text-white"
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
