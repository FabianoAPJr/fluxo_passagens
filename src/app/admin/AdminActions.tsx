"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, X } from "lucide-react";

type Props =
  | { type: "request"; requestId: string; userId?: never; currentRole?: never }
  | { type: "user"; userId: string; currentRole: string; requestId?: never };

export default function AdminActions(props: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRequestAction(action: "APPROVED" | "REJECTED") {
    setLoading(true);
    await fetch("/api/requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: props.requestId, status: action }),
    });
    setLoading(false);
    router.refresh();
  }

  async function handleRoleChange(role: string) {
    setLoading(true);
    await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: props.userId, role }),
    });
    setLoading(false);
    router.refresh();
  }

  if (props.type === "request") {
    return (
      <div className="flex gap-2">
        <button
          onClick={() => handleRequestAction("APPROVED")}
          disabled={loading}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors disabled:opacity-50"
        >
          <Check className="h-3 w-3" /> Aprovar
        </button>
        <button
          onClick={() => handleRequestAction("REJECTED")}
          disabled={loading}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors disabled:opacity-50"
        >
          <X className="h-3 w-3" /> Rejeitar
        </button>
      </div>
    );
  }

  return (
    <select
      value={props.currentRole}
      onChange={(e) => handleRoleChange(e.target.value)}
      disabled={loading}
      className="text-xs border border-border rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary"
    >
      <option value="USER">USER</option>
      <option value="ADMIN">ADMIN</option>
      <option value="MASTER">MASTER</option>
    </select>
  );
}
