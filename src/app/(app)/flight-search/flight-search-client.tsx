"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AirportSelect } from "@/components/airport-select";
import {
  Loader2,
  Search,
  Plane,
  Clock,
  Luggage,
  ArrowRight,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import type {
  CabinClass,
  DateFlexibility,
  FlightItinerary,
  FlightSearchResult,
  MaxStops,
  TripType,
} from "@/lib/flight-search/types";
import { findAirport } from "@/lib/airports";

interface FormState {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  tripType: TripType;
  passengers: number;
  cabinClass: CabinClass;
  maxPrice: string;
  dateFlexibility: DateFlexibility;
  allowNearbyAirports: boolean;
  maxStops: MaxStops;
  maxLayoverMinutes: string;
  preferredAirlines: string;
  avoidAirlines: string;
  includeBaggage: boolean;
}

const INITIAL_FORM: FormState = {
  origin: "",
  destination: "",
  departureDate: "",
  returnDate: "",
  tripType: "ROUND_TRIP",
  passengers: 1,
  cabinClass: "ECONOMY",
  maxPrice: "",
  dateFlexibility: 0,
  allowNearbyAirports: false,
  maxStops: 2,
  maxLayoverMinutes: "",
  preferredAirlines: "",
  avoidAirlines: "",
  includeBaggage: false,
};

function fmtMoney(value: number, currency: string): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function fmtDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export default function FlightSearchClient() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FlightSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((s) => ({ ...s, [key]: val }));

  const top3 = result
    ? [...result.itineraries].sort((a, b) => a.totalPrice - b.totalPrice).slice(0, 3)
    : [];

  function validate(): string | null {
    if (!form.origin || !form.destination) return "Selecione origem e destino.";
    if (form.origin === form.destination) return "Origem e destino devem ser diferentes.";
    if (!form.departureDate) return "Informe a data de ida.";
    if (form.tripType === "ROUND_TRIP" && !form.returnDate) return "Informe a data de volta.";
    if (form.tripType === "ROUND_TRIP" && form.returnDate < form.departureDate)
      return "A volta deve ser igual ou após a ida.";
    if (form.passengers < 1 || form.passengers > 9) return "Passageiros entre 1 e 9.";
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    const payload = {
      origin: form.origin,
      destination: form.destination,
      departureDate: form.departureDate,
      returnDate: form.tripType === "ROUND_TRIP" ? form.returnDate : undefined,
      tripType: form.tripType,
      passengers: form.passengers,
      cabinClass: form.cabinClass,
      maxPrice: form.maxPrice ? parseFloat(form.maxPrice) : undefined,
      dateFlexibility: form.dateFlexibility,
      allowNearbyAirports: form.allowNearbyAirports,
      maxStops: form.maxStops,
      maxLayoverMinutes: form.maxLayoverMinutes ? parseInt(form.maxLayoverMinutes) : undefined,
      preferredAirlines: form.preferredAirlines
        ? form.preferredAirlines.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean)
        : undefined,
      avoidAirlines: form.avoidAirlines
        ? form.avoidAirlines.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean)
        : undefined,
      includeBaggage: form.includeBaggage,
    };

    try {
      const res = await fetch("/api/flight-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Erro desconhecido" }));
        setError(typeof body.error === "string" ? body.error : "Não foi possível buscar voos.");
        return;
      }
      const data = (await res.json()) as FlightSearchResult;
      setResult(data);
    } catch {
      setError("Erro de rede. Verifique sua conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="fs-origin">Origem *</Label>
                <AirportSelect
                  id="fs-origin"
                  value={form.origin}
                  onChange={(v) => update("origin", v)}
                  placeholder="Ex: GRU ou São Paulo"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="fs-destination">Destino *</Label>
                <AirportSelect
                  id="fs-destination"
                  value={form.destination}
                  onChange={(v) => update("destination", v)}
                  placeholder="Ex: MIA ou Miami"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-1">
                <Label>Tipo de viagem</Label>
                <select
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  value={form.tripType}
                  onChange={(e) => update("tripType", e.target.value as TripType)}
                >
                  <option value="ROUND_TRIP">Ida e volta</option>
                  <option value="ONE_WAY">Somente ida</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="fs-dep-date">Data de ida *</Label>
                <Input
                  id="fs-dep-date"
                  type="date"
                  value={form.departureDate}
                  onChange={(e) => update("departureDate", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="fs-ret-date">Data de volta</Label>
                <Input
                  id="fs-ret-date"
                  type="date"
                  value={form.returnDate}
                  disabled={form.tripType === "ONE_WAY"}
                  onChange={(e) => update("returnDate", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Flexibilidade de datas</Label>
                <select
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  value={form.dateFlexibility}
                  onChange={(e) => update("dateFlexibility", parseInt(e.target.value) as DateFlexibility)}
                >
                  <option value={0}>Datas exatas</option>
                  <option value={1}>±1 dia</option>
                  <option value={3}>±3 dias</option>
                  <option value={7}>±7 dias</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-1">
                <Label htmlFor="fs-pax">Passageiros</Label>
                <Input
                  id="fs-pax"
                  type="number"
                  min={1}
                  max={9}
                  value={form.passengers}
                  onChange={(e) => update("passengers", Math.max(1, Math.min(9, parseInt(e.target.value) || 1)))}
                />
              </div>
              <div className="space-y-1">
                <Label>Classe</Label>
                <select
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  value={form.cabinClass}
                  onChange={(e) => update("cabinClass", e.target.value as CabinClass)}
                >
                  <option value="ECONOMY">Econômica</option>
                  <option value="PREMIUM_ECONOMY">Econômica Premium</option>
                  <option value="BUSINESS">Executiva</option>
                  <option value="FIRST">Primeira Classe</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="fs-max-price">Valor máximo (R$)</Label>
                <Input
                  id="fs-max-price"
                  type="number"
                  min={0}
                  placeholder="Opcional"
                  value={form.maxPrice}
                  onChange={(e) => update("maxPrice", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Máximo de escalas</Label>
                <select
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  value={form.maxStops}
                  onChange={(e) => update("maxStops", parseInt(e.target.value) as MaxStops)}
                >
                  <option value={0}>Apenas diretos</option>
                  <option value={1}>Até 1 escala</option>
                  <option value={2}>Até 2 escalas</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-1">
                <Label htmlFor="fs-max-layover">Tempo máx. de escala (min)</Label>
                <Input
                  id="fs-max-layover"
                  type="number"
                  min={0}
                  placeholder="Opcional"
                  value={form.maxLayoverMinutes}
                  onChange={(e) => update("maxLayoverMinutes", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="fs-preferred">Companhias preferidas</Label>
                <Input
                  id="fs-preferred"
                  placeholder="Ex: LA,AD"
                  value={form.preferredAirlines}
                  onChange={(e) => update("preferredAirlines", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="fs-avoid">Companhias a evitar</Label>
                <Input
                  id="fs-avoid"
                  placeholder="Ex: G3"
                  value={form.avoidAirlines}
                  onChange={(e) => update("avoidAirlines", e.target.value)}
                />
              </div>
              <div className="flex flex-col justify-end gap-2 text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.allowNearbyAirports}
                    onChange={(e) => update("allowNearbyAirports", e.target.checked)}
                  />
                  Permitir aeroportos próximos
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.includeBaggage}
                    onChange={(e) => update("includeBaggage", e.target.checked)}
                  />
                  Incluir bagagem no preço
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="bg-[#004d33] hover:bg-[#49624e]"
              >
                {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Search size={16} className="mr-2" />}
                Buscar passagens
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {loading && (
        <Card>
          <CardContent className="p-10 flex flex-col items-center gap-3 text-gray-500">
            <Loader2 className="animate-spin" size={32} />
            <p className="text-sm">Consultando a Decolar em tempo real…</p>
            <p className="text-xs text-gray-400">Isso pode levar 20–30 segundos.</p>
          </CardContent>
        </Card>
      )}

      {error && !loading && (
        <Card className="border-red-200">
          <CardContent className="p-6 flex items-start gap-3 text-red-700">
            <AlertTriangle size={20} className="mt-0.5" />
            <div>
              <p className="text-sm font-medium">Erro na busca</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {result && !loading && (
        <div className="space-y-3">
          {result.warnings.length > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-4 flex items-start gap-3 text-amber-800">
                <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                <ul className="text-sm space-y-1 list-disc list-inside">
                  {result.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {top3.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center space-y-3 text-gray-600">
                <Plane size={32} className="mx-auto text-gray-400" />
                <p className="font-medium">Nenhum voo encontrado</p>
                <p className="text-sm text-gray-500 max-w-md mx-auto">
                  Experimente alterar as datas ou aumentar o limite de preço/escalas.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <h2 className="text-sm font-semibold text-gray-700">3 passagens mais baratas</h2>
              {top3.map((it, i) => (
                <ItineraryCard key={it.id} itinerary={it} rank={i + 1} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ItineraryCard({ itinerary, rank }: { itinerary: FlightItinerary; rank: number }) {
  const first = itinerary.segments[0];
  const last = itinerary.segments[itinerary.segments.length - 1];
  const originAirport = findAirport(first.originCode);
  const destAirport = findAirport(last.destinationCode);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className="flex items-center justify-center size-7 rounded-full bg-[#004d33] text-white text-xs font-bold shrink-0">
            {rank}º
          </div>
          <div className="flex-1 space-y-2">
            <p className="font-semibold text-sm">
              {itinerary.mainAirlineName ?? itinerary.mainAirline}
            </p>

            <div className="flex items-center gap-3 text-sm">
              <div>
                <p className="font-semibold text-base">{fmtTime(first.departureTime)}</p>
                <p className="text-xs text-gray-500">
                  {first.originCode}
                  {originAirport ? ` · ${originAirport.city}` : ""}
                </p>
                <p className="text-xs text-gray-400">{fmtDate(first.departureTime)}</p>
              </div>
              <div className="flex-1 flex flex-col items-center">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock size={12} />
                  {fmtDuration(itinerary.totalDurationMinutes)}
                </div>
                <div className="w-full flex items-center gap-1 my-1">
                  <div className="h-px bg-gray-300 flex-1" />
                  <ArrowRight size={12} className="text-gray-400" />
                  <div className="h-px bg-gray-300 flex-1" />
                </div>
                <p className="text-xs text-gray-500">
                  {itinerary.stopsCount === 0
                    ? "Voo direto"
                    : `${itinerary.stopsCount} escala${itinerary.stopsCount > 1 ? "s" : ""}`}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-base">{fmtTime(last.arrivalTime)}</p>
                <p className="text-xs text-gray-500">
                  {last.destinationCode}
                  {destAirport ? ` · ${destAirport.city}` : ""}
                </p>
                <p className="text-xs text-gray-400">{fmtDate(last.arrivalTime)}</p>
              </div>
            </div>

            {itinerary.layovers.length > 0 && (
              <p className="text-xs text-gray-500">
                Escalas:{" "}
                {itinerary.layovers
                  .map((l) => `${l.airportCode} (${fmtDuration(l.durationMinutes)})`)
                  .join(" · ")}
              </p>
            )}

            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1">
                <Luggage size={12} />
                {itinerary.baggageIncluded ? "Bagagem inclusa" : "Bagagem não inclusa"}
              </span>
              <span>·</span>
              <span>
                {itinerary.segments.map((s) => s.flightNumber).join(" / ")}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end justify-between border-l pl-4 min-w-[140px]">
            <div className="text-right">
              <p className="text-xs text-gray-500">Total estimado</p>
              <p className="font-bold text-lg text-[#004d33]">
                {fmtMoney(itinerary.totalPrice, itinerary.currency)}
              </p>
            </div>
            {itinerary.sourceUrl && (
              <a
                href={itinerary.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-white bg-[#004d33] hover:bg-[#49624e] px-3 py-1.5 rounded inline-flex items-center gap-1 mt-2"
              >
                {itinerary.provider === "decolar" ? "Ver na Decolar" : "Ver oferta"}{" "}
                <ExternalLink size={10} />
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
