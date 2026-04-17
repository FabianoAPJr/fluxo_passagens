"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import type { Role } from "@prisma/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  role: Role;
  managerId: string | null;
  manager: { name: string | null } | null;
  createdAt: Date;
}

interface EditState {
  role: Role;
  managerId: string | null;
}

export default function UsersTable({
  users,
  managers,
}: {
  users: User[];
  managers: { id: string; name: string | null }[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Record<string, EditState>>({});
  const [saving, setSaving] = useState<string | null>(null);

  function startEdit(user: User) {
    setEditing((prev) => ({
      ...prev,
      [user.id]: { role: user.role, managerId: user.managerId },
    }));
  }

  function cancelEdit(userId: string) {
    setEditing((prev) => {
      const n = { ...prev };
      delete n[userId];
      return n;
    });
  }

  async function saveEdit(userId: string) {
    const state = editing[userId];
    if (!state) return;

    setSaving(userId);
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...state }),
      });

      if (!res.ok) {
        toast.error("Erro ao salvar alteração.");
        return;
      }

      toast.success("Usuário atualizado.");
      cancelEdit(userId);
      router.refresh();
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="text-left px-4 py-3 font-medium text-gray-600">Nome</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">E-mail</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Perfil</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Gestor</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Desde</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Ações</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const isEditing = !!editing[user.id];
            const state = editing[user.id];

            return (
              <tr key={user.id} className="border-b hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-800">{user.name}</td>
                <td className="px-4 py-3 text-gray-500">{user.email}</td>
                <td className="px-4 py-3">
                  {isEditing ? (
                    <Select
                      value={state.role}
                      onValueChange={(v) =>
                        setEditing((prev) => ({
                          ...prev,
                          [user.id]: { ...prev[user.id], role: v as Role },
                        }))
                      }
                    >
                      <SelectTrigger className="w-36 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(["MASTER", "GESTOR", "FINANCEIRO", "COLABORADOR"] as Role[]).map((r) => (
                          <SelectItem key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", ROLE_COLORS[user.role])}>
                      {ROLE_LABELS[user.role]}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {isEditing ? (
                    <Select
                      value={state.managerId ?? "none"}
                      onValueChange={(v) =>
                        setEditing((prev) => ({
                          ...prev,
                          [user.id]: {
                            ...prev[user.id],
                            managerId: v === "none" ? null : v,
                          },
                        }))
                      }
                    >
                      <SelectTrigger className="w-44 h-8">
                        <SelectValue placeholder="Sem gestor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem gestor</SelectItem>
                        {managers
                          .filter((m) => m.id !== user.id)
                          .map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    user.manager?.name ?? "—"
                  )}
                </td>
                <td className="px-4 py-3 text-gray-400">
                  {format(new Date(user.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                </td>
                <td className="px-4 py-3">
                  {isEditing ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => saveEdit(user.id)}
                        disabled={saving === user.id}
                        className="h-7 bg-[#004d33] hover:bg-[#49624e]"
                      >
                        {saving === user.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Save size={12} />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => cancelEdit(user.id)}
                        className="h-7"
                      >
                        ✕
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startEdit(user)}
                      className="h-7 text-xs"
                    >
                      Editar
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
