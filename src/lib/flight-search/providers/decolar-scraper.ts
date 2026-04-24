import type {
  FlightItinerary,
  FlightSearchParams,
  FlightSearchProvider,
  FlightSearchResult,
  FlightSegment,
} from "../types";
import { scrapeDecolar, type OfertaVoo } from "@/lib/flight-scraper";

// Fuso-horário fixo do Brasil (-03:00) — sem horário de verão desde 2019.
const BR_OFFSET = "-03:00";

export class DecolarScraperProvider implements FlightSearchProvider {
  readonly name = "Decolar (scraper)";
  readonly isDemo = false;

  async search(
    params: FlightSearchParams,
  ): Promise<Omit<FlightSearchResult, "providerName" | "isDemo">> {
    const warnings = buildUnsupportedFiltersWarnings(params);

    const res = await scrapeDecolar({
      origem: params.origin,
      destino: params.destination,
      dataIda: params.departureDate,
      dataVolta: params.returnDate,
      adultos: params.passengers,
    });

    if (!res.sucesso) {
      return {
        itineraries: [],
        promotions: [],
        warnings: [
          res.erro
            ? `Não foi possível consultar a Decolar agora (${res.erro}). Use os botões dos consolidadores abaixo.`
            : "Não foi possível consultar a Decolar agora. Use os botões dos consolidadores abaixo.",
          ...warnings,
        ],
      };
    }

    const itineraries = res.ofertas
      .map((oferta, idx) => toItinerary(oferta, idx, params))
      .filter((it) => matchesFilters(it, params));

    return {
      itineraries,
      promotions: [],
      warnings,
    };
  }
}

function toItinerary(
  oferta: OfertaVoo,
  index: number,
  params: FlightSearchParams,
): FlightItinerary {
  const segment: FlightSegment = {
    airline: oferta.companhia,
    airlineName: oferta.companhia,
    flightNumber: "—",
    originCode: params.origin,
    destinationCode: params.destination,
    departureTime: composeIso(params.departureDate, oferta.horarioPartida),
    arrivalTime: composeIso(params.departureDate, oferta.horarioChegada),
    durationMinutes: oferta.duracaoMin,
  };

  return {
    id: `decolar-${index}-${oferta.preco}`,
    segments: [segment],
    layovers: [],
    totalDurationMinutes: oferta.duracaoMin,
    stopsCount: oferta.paradas,
    mainAirline: oferta.companhia,
    mainAirlineName: oferta.companhia,
    baggageIncluded: false,
    totalPrice: oferta.preco,
    currency: oferta.moeda,
    sourceUrl: oferta.linkCompra,
    provider: "decolar",
    badges: [],
  };
}

function composeIso(date: string, time: string): string {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) {
    return `${date}T00:00:00${BR_OFFSET}`;
  }
  return `${date}T${time}:00${BR_OFFSET}`;
}

function matchesFilters(it: FlightItinerary, params: FlightSearchParams): boolean {
  if (params.maxPrice !== undefined && it.totalPrice > params.maxPrice) return false;
  if (it.stopsCount > params.maxStops) return false;

  const airlineLower = (it.mainAirlineName ?? it.mainAirline).toLowerCase();
  if (params.avoidAirlines?.length) {
    const hit = params.avoidAirlines.some((a) => airlineLower.includes(a.toLowerCase()));
    if (hit) return false;
  }
  if (params.preferredAirlines?.length) {
    const hit = params.preferredAirlines.some((a) => airlineLower.includes(a.toLowerCase()));
    if (!hit) return false;
  }
  return true;
}

function buildUnsupportedFiltersWarnings(params: FlightSearchParams): string[] {
  const unsupported: string[] = [];
  if (params.cabinClass !== "ECONOMY") unsupported.push("classe de cabine");
  if (params.dateFlexibility !== 0) unsupported.push("flexibilidade de datas");
  if (params.allowNearbyAirports) unsupported.push("aeroportos próximos");
  if (params.maxLayoverMinutes !== undefined) unsupported.push("tempo máximo de escala");
  if (params.includeBaggage) unsupported.push("filtro de bagagem inclusa");

  if (unsupported.length === 0) return [];
  return [
    `Filtros não aplicados pela Decolar: ${unsupported.join(", ")}. Refine diretamente no site ao clicar em "Ver na Decolar".`,
  ];
}
