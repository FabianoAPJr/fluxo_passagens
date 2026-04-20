"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AirportSelect } from "@/components/airport-select";
import {
  Loader2,
  Search,
  Plane,
  Clock,
  Luggage,
  ArrowRight,
  Info,
  AlertTriangle,
  ExternalLink,
  Tag,
  Zap,
  Trophy,
} from "lucide-react";
import type {
  CabinClass,
  DateFlexibility,
  DepartureTimeFilter,
  FlightBadge,
  FlightItinerary,
  FlightSearchResult,
  MaxStops,
  SortBy,
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

function hourOf(iso: string): number {
  return new Date(iso).getHours();
}

function matchesTimeFilter(hour: number, filter: DepartureTimeFilter): boolean {
  switch (filter) {
    case "ANY":
      return true;
    case "MORNING":
      return hour >= 6 && hour < 12;
    case "AFTERNOON":
      return hour >= 12 && hour < 18;
    case "EVENING":
      return hour >= 18 && hour < 22;
    case "NIGHT":
      return hour < 6 || hour >= 22;
  }
}

function badgeLabel(b: FlightBadge): { text: string; icon: React.ReactNode; className: string } {
  switch (b) {
    case "CHEAPEST":
      return {
        text: "Mais barato",
        icon: <Tag size={12} />,
        className: "bg-green-100 text-green-800",
      };
    case "FASTEST":
      return {
        text: "Mais rápido",
        icon: <Zap size={12} />,
        className: "bg-blue-100 text-blue-800",
      };
    case "BEST_VALUE":
      return {
        text: "Melhor custo-benefício",
        icon: <Trophy size={12} />,
        className: "bg-amber-100 text-amber-800",
      };
  }
}

export default function FlightSearchClient() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FlightSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [sortBy, setSortBy] = useState<SortBy>("PRICE");
  const [filterAirlines, setFilterAirlines] = useState<Set<string>>(new Set());
  const [filterStops, setFilterStops] = useState<"ALL" | "0" | "1" | "2">("ALL");
  const [filterPriceMin, setFilterPriceMin] = useState("");
  const [filterPriceMax, setFilterPriceMax] = useState("");
  const [filterDepTime, setFilterDepTime] = useState<DepartureTimeFilter>("ANY");
  const [filterMaxDuration, setFilterMaxDuration] = useState("");
  const [filterBaggageOnly, setFilterBaggageOnly] = useState(false);

  const update = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((s) => ({ ...s, [key]: val }));

  const availableAirlines = useMemo(() => {
    if (!result) return [];
    const map = new Map<string, string>();
    for (const it of result.itineraries) {
      map.set(it.mainAirline, it.mainAirlineName ?? it.mainAirline);
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [result]);

  const filteredAndSorted = useMemo(() => {
    if (!result) return [];
    let items = result.itineraries.slice();

    if (filterAirlines.size > 0) {
      items = items.filter((it) => filterAirlines.has(it.mainAirline));
    }
    if (filterStops !== "ALL") {
      items = items.filter((it) => it.stopsCount === parseInt(filterStops));
    }
    const priceMin = parseFloat(filterPriceMin);
    const priceMax = parseFloat(filterPriceMax);
    if (!Number.isNaN(priceMin)) items = items.filter((it) => it.totalPrice >= priceMin);
    if (!Number.isNaN(priceMax)) items = items.filter((it) => it.totalPrice <= priceMax);
    if (filterDepTime !== "ANY") {
      items = items.filter((it) =>
        matchesTimeFilter(hourOf(it.segments[0].departureTime), filterDepTime),
      );
    }
    const maxDur = parseInt(filterMaxDuration);
    if (!Number.isNaN(maxDur)) {
      items = items.filter((it) => it.totalDurationMinutes <= maxDur * 60);
    }
    if (filterBaggageOnly) {
      items = items.filter((it) => it.baggageIncluded);
    }

    items.sort((a, b) => {
      switch (sortBy) {
        case "PRICE":
          return a.totalPrice - b.totalPrice;
        case "DURATION":
          return a.totalDurationMinutes - b.totalDurationMinutes;
        case "STOPS":
          return a.stopsCount - b.stopsCount || a.totalPrice - b.totalPrice;
        case "VALUE":
          return (
            a.totalPrice / 1000 + a.totalDurationMinutes / 60 -
            (b.totalPrice / 1000 + b.totalDurationMinutes / 60)
          );
      }
    });

    return items;
  }, [
    result,
    sortBy,
    filterAirlines,
    filterStops,
    filterPriceMin,
    filterPriceMax,
    filterDepTime,
    filterMaxDuration,
    filterBaggageOnly,
  ]);

  function toggleAirline(code: string) {
    setFilterAirlines((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

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
    setFilterAirlines(new Set());
    setFilterStops("ALL");
    setFilterPriceMin("");
    setFilterPriceMax("");
    setFilterDepTime("ANY");
    setFilterMaxDuration("");
    setFilterBaggageOnly(false);

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
    } catch (e) {
      setError("Erro de rede. Verifique sua conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const googleFlightsUrl = useMemo(() => {
    if (!form.origin || !form.destination || !form.departureDate) return null;
    const parts = [
      `Flights from ${form.origin} to ${form.destination} on ${form.departureDate}`,
    ];
    if (form.tripType === "ROUND_TRIP" && form.returnDate) {
      parts.push(`returning ${form.returnDate}`);
    }
    return `https://www.google.com/travel/flights?q=${encodeURIComponent(parts.join(" "))}`;
  }, [form.origin, form.destination, form.departureDate, form.returnDate, form.tripType]);

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
            <p className="text-sm">Buscando melhores opções…</p>
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
        <>
          {result.isDemo && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 flex items-start gap-3 text-amber-900">
              <Info size={20} className="mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-semibold">Modo demonstração</p>
                <p className="mt-1">
                  Estes resultados são <strong>fictícios</strong> e não refletem preços ou
                  disponibilidade reais. Para ativar a busca real, configure{" "}
                  <code className="bg-amber-100 px-1 rounded">AMADEUS_CLIENT_ID</code> e{" "}
                  <code className="bg-amber-100 px-1 rounded">AMADEUS_CLIENT_SECRET</code> nas
                  variáveis de ambiente do Vercel.
                </p>
              </div>
            </div>
          )}

          {result.warnings.length > 0 && !result.isDemo && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
              {result.warnings.map((w, i) => (
                <p key={i}>{w}</p>
              ))}
            </div>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Promoções verificadas</CardTitle>
            </CardHeader>
            <CardContent>
              {result.promotions.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Nenhuma promoção verificada encontrada para esta rota no momento. Esta área será
                  populada quando houver fontes oficiais de ofertas integradas.
                </p>
              ) : (
                <ul className="space-y-2">
                  {result.promotions.map((p, i) => (
                    <li key={i} className="text-sm">
                      <a href={p.sourceUrl} target="_blank" rel="noreferrer" className="font-medium text-[#004d33] hover:underline">
                        {p.title}
                      </a>
                      <p className="text-gray-600">{p.description}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Fonte: {p.source}{p.validUntil ? ` · válido até ${p.validUntil}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {result.itineraries.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center space-y-3 text-gray-600">
                <Plane size={32} className="mx-auto text-gray-400" />
                <p className="font-medium">Nenhum voo encontrado</p>
                <p className="text-sm text-gray-500 max-w-md mx-auto">
                  Experimente alterar as datas, permitir aeroportos próximos ou aumentar o limite de preço/escalas.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-[260px_1fr] gap-6">
              <aside className="space-y-5">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-700">Ordenar por</p>
                  <select
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortBy)}
                  >
                    <option value="PRICE">Menor preço</option>
                    <option value="DURATION">Menor duração</option>
                    <option value="STOPS">Menor número de escalas</option>
                    <option value="VALUE">Melhor custo-benefício</option>
                  </select>
                </div>

                <Separator />

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-700">Companhia</p>
                  {availableAirlines.length === 0 ? (
                    <p className="text-xs text-gray-400">—</p>
                  ) : (
                    availableAirlines.map(([code, name]) => (
                      <label key={code} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filterAirlines.has(code)}
                          onChange={() => toggleAirline(code)}
                        />
                        <span>{name}</span>
                      </label>
                    ))
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-700">Escalas</p>
                  {(["ALL", "0", "1", "2"] as const).map((v) => (
                    <label key={v} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="stops-filter"
                        checked={filterStops === v}
                        onChange={() => setFilterStops(v)}
                      />
                      {v === "ALL" ? "Todas" : v === "0" ? "Direto" : v === "1" ? "1 escala" : "2 escalas"}
                    </label>
                  ))}
                </div>

                <Separator />

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-700">Faixa de preço</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      placeholder="Mín"
                      value={filterPriceMin}
                      onChange={(e) => setFilterPriceMin(e.target.value)}
                    />
                    <Input
                      type="number"
                      placeholder="Máx"
                      value={filterPriceMax}
                      onChange={(e) => setFilterPriceMax(e.target.value)}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-700">Horário de saída</p>
                  <select
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    value={filterDepTime}
                    onChange={(e) => setFilterDepTime(e.target.value as DepartureTimeFilter)}
                  >
                    <option value="ANY">Qualquer horário</option>
                    <option value="MORNING">Manhã (06h–12h)</option>
                    <option value="AFTERNOON">Tarde (12h–18h)</option>
                    <option value="EVENING">Noite (18h–22h)</option>
                    <option value="NIGHT">Madrugada (22h–06h)</option>
                  </select>
                </div>

                <Separator />

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-700">Duração máx. (horas)</p>
                  <Input
                    type="number"
                    placeholder="Ex: 12"
                    value={filterMaxDuration}
                    onChange={(e) => setFilterMaxDuration(e.target.value)}
                  />
                </div>

                <Separator />

                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterBaggageOnly}
                    onChange={(e) => setFilterBaggageOnly(e.target.checked)}
                  />
                  Somente com bagagem
                </label>
              </aside>

              <div className="space-y-3">
                <p className="text-sm text-gray-500">
                  {filteredAndSorted.length} de {result.itineraries.length} voo(s)
                  {googleFlightsUrl && (
                    <>
                      {" · "}
                      <a
                        href={googleFlightsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[#004d33] hover:underline"
                      >
                        Comparar no Google Flights <ExternalLink size={12} />
                      </a>
                    </>
                  )}
                </p>
                {filteredAndSorted.map((it) => (
                  <ItineraryCard key={it.id} itinerary={it} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ItineraryCard({ itinerary }: { itinerary: FlightItinerary }) {
  const first = itinerary.segments[0];
  const last = itinerary.segments[itinerary.segments.length - 1];
  const originAirport = findAirport(first.originCode);
  const destAirport = findAirport(last.destinationCode);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm">
                {itinerary.mainAirlineName ?? itinerary.mainAirline}
              </p>
              {itinerary.badges.map((b) => {
                const info = badgeLabel(b);
                return (
                  <span
                    key={b}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${info.className}`}
                  >
                    {info.icon}
                    {info.text}
                  </span>
                );
              })}
            </div>

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
                className="text-xs text-[#004d33] hover:underline inline-flex items-center gap-1 mt-2"
              >
                Ver fonte <ExternalLink size={10} />
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
