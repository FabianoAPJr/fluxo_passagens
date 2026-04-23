"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Search,
  Plane,
  Clock,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import type { OfertaVoo } from "@/lib/flight-scraper";

interface AutoQuotationProps {
  requestId: string;
}

interface ApiSuccess {
  sucesso: true;
  ofertas: OfertaVoo[];
  duracaoMs: number;
}

interface ApiFallback {
  sucesso: false;
  fallbackDeepLink: true;
  motivo: string;
  duracaoMs?: number;
}

type ApiResponse = ApiSuccess | ApiFallback;

export default function AutoQuotation({ requestId }: AutoQuotationProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);

  async function buscar() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/requests/${requestId}/cotar-automatico`, { method: "POST" });
      if (!res.ok) {
        toast.error("Erro ao iniciar busca automática.");
        return;
      }
      const data = (await res.json()) as ApiResponse;
      setResult(data);
      if (data.sucesso) {
        toast.success(`${data.ofertas.length} oferta(s) encontrada(s).`);
      }
    } catch {
      toast.error("Erro de rede na busca automática.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Plane size={16} />
          Cotação automática
        </CardTitle>
        <p className="text-xs text-gray-500 mt-1">
          Busca ofertas no Decolar e exibe as <strong>3 mais baratas</strong>. Pode quebrar a qualquer momento — se falhar, use os links manuais abaixo.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={buscar}
          disabled={loading}
          className="bg-[#004d33] hover:bg-[#49624e]"
        >
          {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Search size={16} className="mr-2" />}
          {loading ? "Buscando cotações, pode levar até 1 minuto…" : "Buscar cotações automáticas (Decolar)"}
        </Button>

        {result && !result.sucesso && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2 text-sm text-amber-900">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <p>Busca automática indisponível no momento. Use os links abaixo para cotar manualmente.</p>
          </div>
        )}

        {result && result.sucesso && (
          <>
            <p className="text-xs text-gray-500">
              Preços aproximados do Decolar. Confirme no site antes de comprar.
            </p>
            <div className="space-y-2">
              {result.ofertas.map((o, i) => (
                <OfertaCard key={i} oferta={o} rank={i + 1} />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function OfertaCard({ oferta, rank }: { oferta: OfertaVoo; rank: number }) {
  return (
    <div className="rounded-lg border border-gray-200 p-3 flex items-center gap-4">
      <div className="flex items-center justify-center size-7 rounded-full bg-[#004d33] text-white text-xs font-bold shrink-0">
        {rank}º
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-3 text-sm">
          <span className="font-semibold">{oferta.companhia}</span>
          <span className="text-gray-400">·</span>
          <span className="text-gray-600">
            {oferta.paradas === 0 ? "Direto" : `${oferta.paradas} parada${oferta.paradas > 1 ? "s" : ""}`}
          </span>
          <span className="text-gray-400">·</span>
          <span className="inline-flex items-center gap-1 text-gray-600">
            <Clock size={12} />
            {formatDuracao(oferta.duracaoMin)}
          </span>
        </div>
        {(oferta.horarioPartida || oferta.horarioChegada) && (
          <p className="text-xs text-gray-500">
            {oferta.horarioPartida && <span className="font-medium text-gray-700">{oferta.horarioPartida}</span>}
            {oferta.horarioPartida && oferta.horarioChegada && " → "}
            {oferta.horarioChegada && <span className="font-medium text-gray-700">{oferta.horarioChegada}</span>}
          </p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 min-w-[120px]">
        <p className="font-bold text-[#004d33]">
          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: oferta.moeda, maximumFractionDigits: 0 }).format(oferta.preco)}
        </p>
        <a
          href={oferta.linkCompra}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[#004d33] hover:underline inline-flex items-center gap-1"
        >
          Ver no site <ExternalLink size={10} />
        </a>
      </div>
    </div>
  );
}

function formatDuracao(min: number): string {
  if (min <= 0) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
