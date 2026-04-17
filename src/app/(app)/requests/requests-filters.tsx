"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X, Filter } from "lucide-react";
import { STATUS_LABELS } from "@/lib/constants";
import type { RequestStatus } from "@prisma/client";

interface Props {
  initialStatus?: string;
  initialQ?: string;
  initialFrom?: string;
  initialTo?: string;
}

export default function RequestsFilters({
  initialStatus,
  initialQ,
  initialFrom,
  initialTo,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [q, setQ] = useState(initialQ ?? "");
  const [status, setStatus] = useState(initialStatus ?? "ALL");
  const [from, setFrom] = useState(initialFrom ?? "");
  const [to, setTo] = useState(initialTo ?? "");

  function apply() {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (status && status !== "ALL") params.set("status", status);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `/requests?${qs}` : "/requests");
    });
  }

  function clear() {
    setQ("");
    setStatus("ALL");
    setFrom("");
    setTo("");
    startTransition(() => {
      router.push("/requests");
    });
  }

  const hasFilters =
    !!q || (status && status !== "ALL") || !!from || !!to;

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-[220px] space-y-1">
        <label className="text-xs text-gray-600 font-medium">Buscar</label>
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <Input
            placeholder="Solicitante, origem ou destino..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") apply();
            }}
            className="pl-9"
          />
        </div>
      </div>

      <div className="w-[220px] space-y-1">
        <label className="text-xs text-gray-600 font-medium">Status</label>
        <Select value={status} onValueChange={(v) => setStatus(v ?? "ALL")}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os status</SelectItem>
            {(Object.entries(STATUS_LABELS) as [RequestStatus, string][]).map(
              ([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="w-[150px] space-y-1">
        <label className="text-xs text-gray-600 font-medium">Ida a partir de</label>
        <Input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
      </div>

      <div className="w-[150px] space-y-1">
        <label className="text-xs text-gray-600 font-medium">Ida até</label>
        <Input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </div>

      <Button
        onClick={apply}
        disabled={isPending}
        className="bg-[#004d33] hover:bg-[#49624e]"
      >
        <Filter size={14} className="mr-1" />
        Aplicar
      </Button>

      {hasFilters && (
        <Button variant="outline" onClick={clear} disabled={isPending}>
          <X size={14} className="mr-1" />
          Limpar
        </Button>
      )}
    </div>
  );
}
