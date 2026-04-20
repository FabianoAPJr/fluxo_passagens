import type {
  CabinClass,
  FlightItinerary,
  FlightSearchParams,
  FlightSearchProvider,
  FlightSegment,
} from "../types";

const AMADEUS_HOSTS = {
  test: "https://test.api.amadeus.com",
  production: "https://api.amadeus.com",
};

const CABIN_MAP: Record<CabinClass, string> = {
  ECONOMY: "ECONOMY",
  PREMIUM_ECONOMY: "PREMIUM_ECONOMY",
  BUSINESS: "BUSINESS",
  FIRST: "FIRST",
};

interface AmadeusConfig {
  clientId: string;
  clientSecret: string;
  host: string;
}

interface TokenCache {
  token: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;

async function getAccessToken(config: AmadeusConfig): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.token;
  }

  const res = await fetch(`${config.host}/v1/security/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Amadeus auth falhou: ${res.status} ${body}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return tokenCache.token;
}

interface AmadeusFlightOffer {
  id: string;
  itineraries: Array<{
    duration: string;
    segments: Array<{
      departure: { iataCode: string; at: string };
      arrival: { iataCode: string; at: string };
      carrierCode: string;
      number: string;
      duration: string;
      numberOfStops?: number;
    }>;
  }>;
  price: { total: string; currency: string };
  pricingOptions?: { includedCheckedBagsOnly?: boolean };
  validatingAirlineCodes?: string[];
}

interface AmadeusSearchResponse {
  data: AmadeusFlightOffer[];
  dictionaries?: {
    carriers?: Record<string, string>;
  };
  warnings?: Array<{ title?: string; detail?: string }>;
}

function parseISO8601Duration(s: string): number {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?$/.exec(s);
  if (!m) return 0;
  const hours = parseInt(m[1] ?? "0", 10);
  const minutes = parseInt(m[2] ?? "0", 10);
  return hours * 60 + minutes;
}

function mapOfferToItinerary(
  offer: AmadeusFlightOffer,
  carriers: Record<string, string>,
): FlightItinerary | null {
  const outbound = offer.itineraries[0];
  if (!outbound) return null;

  const segments: FlightSegment[] = outbound.segments.map((s) => ({
    airline: s.carrierCode,
    airlineName: carriers[s.carrierCode],
    flightNumber: `${s.carrierCode}${s.number}`,
    originCode: s.departure.iataCode,
    destinationCode: s.arrival.iataCode,
    departureTime: s.departure.at,
    arrivalTime: s.arrival.at,
    durationMinutes: parseISO8601Duration(s.duration),
  }));

  const layovers: Array<{ airportCode: string; durationMinutes: number }> = [];
  for (let i = 0; i < segments.length - 1; i++) {
    const arrive = new Date(segments[i].arrivalTime).getTime();
    const depart = new Date(segments[i + 1].departureTime).getTime();
    layovers.push({
      airportCode: segments[i].destinationCode,
      durationMinutes: Math.max(0, Math.round((depart - arrive) / 60000)),
    });
  }

  const mainAirline = offer.validatingAirlineCodes?.[0] ?? segments[0].airline;

  return {
    id: `amadeus-${offer.id}`,
    segments,
    layovers,
    totalDurationMinutes: parseISO8601Duration(outbound.duration),
    stopsCount: Math.max(0, segments.length - 1),
    mainAirline,
    mainAirlineName: carriers[mainAirline],
    baggageIncluded: offer.pricingOptions?.includedCheckedBagsOnly === true,
    totalPrice: parseFloat(offer.price.total),
    currency: offer.price.currency,
    provider: "amadeus",
    badges: [],
  };
}

export class AmadeusProvider implements FlightSearchProvider {
  readonly name = "amadeus";
  readonly isDemo = false;
  private config: AmadeusConfig;

  constructor(config: AmadeusConfig) {
    this.config = config;
  }

  async search(params: FlightSearchParams) {
    const token = await getAccessToken(this.config);

    const query = new URLSearchParams({
      originLocationCode: params.origin,
      destinationLocationCode: params.destination,
      departureDate: params.departureDate,
      adults: String(params.passengers),
      travelClass: CABIN_MAP[params.cabinClass],
      currencyCode: "BRL",
      max: "20",
      nonStop: params.maxStops === 0 ? "true" : "false",
    });

    if (params.tripType === "ROUND_TRIP" && params.returnDate) {
      query.set("returnDate", params.returnDate);
    }
    if (params.maxPrice) {
      query.set("maxPrice", String(Math.floor(params.maxPrice)));
    }
    if (params.preferredAirlines?.length) {
      query.set("includedAirlineCodes", params.preferredAirlines.join(","));
    }
    if (params.avoidAirlines?.length) {
      query.set("excludedAirlineCodes", params.avoidAirlines.join(","));
    }

    const res = await fetch(
      `${this.config.host}/v2/shopping/flight-offers?${query.toString()}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Amadeus busca falhou: ${res.status} ${body}`);
    }

    const data = (await res.json()) as AmadeusSearchResponse;
    const carriers = data.dictionaries?.carriers ?? {};

    const itineraries = data.data
      .map((offer) => mapOfferToItinerary(offer, carriers))
      .filter((x): x is FlightItinerary => x !== null)
      .filter((it) => it.stopsCount <= params.maxStops)
      .filter((it) => {
        if (!params.maxLayoverMinutes) return true;
        return it.layovers.every((l) => l.durationMinutes <= params.maxLayoverMinutes!);
      })
      .filter((it) => !params.includeBaggage || it.baggageIncluded);

    const warnings = (data.warnings ?? [])
      .map((w) => [w.title, w.detail].filter(Boolean).join(" — "))
      .filter((s) => s.length > 0);

    return {
      itineraries,
      promotions: [],
      warnings,
    };
  }
}

export function createAmadeusProvider(): AmadeusProvider | null {
  const clientId = process.env.AMADEUS_CLIENT_ID;
  const clientSecret = process.env.AMADEUS_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  const env = process.env.AMADEUS_ENV === "production" ? "production" : "test";
  return new AmadeusProvider({
    clientId,
    clientSecret,
    host: AMADEUS_HOSTS[env],
  });
}
