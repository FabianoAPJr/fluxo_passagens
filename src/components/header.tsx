"use client";

import { signOut } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/constants";
import type { Role } from "@prisma/client";
import { LogOut, User } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface HeaderUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: Role;
}

export default function Header({ user }: { user: HeaderUser }) {
  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-end gap-4">
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-3 outline-none cursor-pointer hover:opacity-80 transition-opacity">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-gray-800 leading-tight">{user.name}</p>
            <p className="text-xs text-gray-400">{user.email}</p>
          </div>
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.image ?? undefined} />
            <AvatarFallback className="bg-[#1e3a5f] text-white text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs font-normal text-gray-500">{user.email}</p>
              <span className={cn("mt-1 inline-block text-xs px-2 py-0.5 rounded-full font-medium", ROLE_COLORS[user.role])}>
                {ROLE_LABELS[user.role]}
              </span>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-pointer" onClick={() => window.location.href = "/profile"}>
            <User size={14} className="mr-2" />
            Meu perfil
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-red-600 cursor-pointer focus:text-red-600"
          >
            <LogOut size={14} className="mr-2" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
