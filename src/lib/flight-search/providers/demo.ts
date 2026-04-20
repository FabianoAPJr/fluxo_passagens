import type {
  FlightItinerary,
  FlightSearchParams,
  FlightSearchProvider,
  FlightSegment,
} from "../types";
import { findAirport } from "../../airports";

const DEMO_AIRLINES: Array<{ code: string; name: string; baggage: boolean }> = [
  { code: "LA", name: "LATAM Airlines", baggage: true },
  { code: "AD", name: "Azul", baggage: false },
  { code: "G3", name: "Gol", baggage: false },
  { code: "AA", name: "American Airlines", baggage: true },
  { code: "DL", name: "Delta", baggage: true },
  { code: "AF", name: "Air France", baggage: true },
  { code: "LH", name: "Lufthansa", baggage: true },
  { code: "IB", name: "Iberia", baggage: true },
];

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededRandom(seed: number): () => number {
  let s = seed || 1;
  return () => {
    s = Math.imul(s ^ (s >>> 15), 2246822507);
    s = Math.imul(s ^ (s >>> 13), 3266489909);
    s ^= s >>> 16;
    return (s >>> 0) / 0xffffffff;
  };
}

function addMinutes(iso: string, minutes: number): string {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

function buildItinerary(params: {
  idSuffix: string;
  origin: string;
  destination: string;
  departureDate: string;
  stops: 0 | 1 | 2;
  airlineCode: string;
  airlineName: string;
  baggageIncluded: boolean;
  basePrice: number;
  baseDepartureHour: number;
  durationMinutes: number;
}): FlightItinerary {
  const {
    idSuffix,
    origin,
    destination,
    departureDate,
    stops,
    airlineCode,
    airlineName,
    baggageIncluded,
    basePrice,
    baseDepartureHour,
    durationMinutes,
  } = params;

  const segments: FlightSegment[] = [];
  const layovers: { airportCode: string; durationMinutes: number }[] = [];
  const connectionCodes = ["GRU", "BSB", "LIS", "MAD", "CDG", "MIA", "PTY"].filter(
    (c) => c !== origin && c !== destination,
  );

  const departureISO = `${departureDate}T${String(baseDepartureHour).padStart(2, "0")}:00:00.000Z`;

  if (stops === 0) {
    segments.push({
      airline: airlineCode,
      airlineName,
      flightNumber: `${airlineCode}${1000 + Math.floor(hashString(idSuffix) % 9000)}`,
      originCode: origin,
      destinationCode: destination,
      departureTime: departureISO,
      arrivalTime: addMinutes(departureISO, durationMinutes),
      durationMinutes,
    });
  } else {
    const layoverDuration = 90 + (hashString(idSuffix) % 180);
    const firstLeg = Math.floor(durationMinutes * 0.45);
    const secondLeg = durationMinutes - firstLeg;
    const hop1 = connectionCodes[hashString(idSuffix) % connectionCodes.length];

    segments.push({
      airline: airlineCode,
      airlineName,
      flightNumber: `${airlineCode}${1000 + Math.floor(hashString(idSuffix + "a") % 9000)}`,
      originCode: origin,
      destinationCode: hop1,
      departureTime: departureISO,
      arrivalTime: addMinutes(departureISO, firstLeg),
      durationMinutes: firstLeg,
    });
    layovers.push({ airportCode: hop1, durationMinutes: layoverDuration });

    const secondStart = addMinutes(departureISO, firstLeg + layoverDuration);

    if (stops === 1) {
      segments.push({
        airline: airlineCode,
        airlineName,
        flightNumber: `${airlineCode}${1000 + Math.floor(hashString(idSuffix + "b") % 9000)}`,
        originCode: hop1,
        destinationCode: destination,
        departureTime: secondStart,
        arrivalTime: addMinutes(secondStart, secondLeg),
        durationMinutes: secondLeg,
      });
    } else {
      const hop2 = connectionCodes[(hashString(idSuffix) + 3) % connectionCodes.length];
      const midLeg = Math.floor(secondLeg * 0.5);
      const lastLeg = secondLeg - midLeg;
      const midLayover = 75 + (hashString(idSuffix + "c") % 120);
      segments.push({
        airline: airlineCode,
        airlineName,
        flightNumber: `${airlineCode}${1000 + Math.floor(hashString(idSuffix + "b") % 9000)}`,
        originCode: hop1,
        destinationCode: hop2,
        departureTime: secondStart,
        arrivalTime: addMinutes(secondStart, midLeg),
        durationMinutes: midLeg,
      });
      layovers.push({ airportCode: hop2, durationMinutes: midLayover });
      const lastStart = addMinutes(secondStart, midLeg + midLayover);
      segments.push({
        airline: airlineCode,
        airlineName,
        flightNumber: `${airlineCode}${1000 + Math.floor(hashString(idSuffix + "c") % 9000)}`,
        originCode: hop2,
        destinationCode: destination,
        departureTime: lastStart,
        arrivalTime: addMinutes(lastStart, lastLeg),
        durationMinutes: lastLeg,
      });
    }
  }

  const totalWithLayovers =
    durationMinutes + layovers.reduce((s, l) => s + l.durationMinutes, 0);

  return {
    id: `demo-${idSuffix}`,
    segments,
    layovers,
    totalDurationMinutes: totalWithLayovers,
    stopsCount: stops,
    mainAirline: airlineCode,
    mainAirlineName: airlineName,
    baggageIncluded,
    totalPrice: basePrice,
    currency: "BRL",
    provider: "demo",
    badges: [],
  };
}

export class DemoProvider implements FlightSearchProvider {
  readonly name = "demo";
  readonly isDemo = true;

  async search(params: FlightSearchParams) {
    const rand = seededRandom(hashString(`${params.origin}-${params.destination}-${params.departureDate}`));

    const originAirport = findAirport(params.origin);
    const destAirport = findAirport(params.destination);
    const isInternational =
      originAirport && destAirport && originAirport.country !== destAirport.country;

    const baseDuration = isInternational ? 600 : 120;
    const basePriceFloor = isInternational ? 2800 : 320;
    const basePriceCeiling = isInternational ? 7500 : 1600;

    const airlines = isInternational
      ? DEMO_AIRLINES.slice(3)
      : DEMO_AIRLINES.slice(0, 4);

    const itineraries: FlightItinerary[] = [];

    const configs: Array<{ stops: 0 | 1 | 2; hourOffset: number; priceMod: number; durMod: number }> = [
      { stops: 0, hourOffset: 6, priceMod: 1.15, durMod: 1.0 },
      { stops: 0, hourOffset: 14, priceMod: 1.25, durMod: 1.0 },
      { stops: 1, hourOffset: 8, priceMod: 0.85, durMod: 1.35 },
      { stops: 1, hourOffset: 17, priceMod: 0.95, durMod: 1.3 },
      { stops: 1, hourOffset: 22, priceMod: 0.78, durMod: 1.45 },
      { stops: 2, hourOffset: 5, priceMod: 0.68, durMod: 1.75 },
    ];

    const maxStops = params.maxStops ?? 2;
    const filteredConfigs = configs.filter((c) => c.stops <= maxStops);

    for (let i = 0; i < filteredConfigs.length; i++) {
      const cfg = filteredConfigs[i];
      const airline = airlines[Math.floor(rand() * airlines.length)];
      const priceBase = basePriceFloor + rand() * (basePriceCeiling - basePriceFloor);
      const price = Math.round(priceBase * cfg.priceMod * params.passengers * (1 + (rand() - 0.5) * 0.1));
      const duration = Math.round(baseDuration * cfg.durMod * (0.95 + rand() * 0.1));

      let baggageIncluded = airline.baggage;
      if (params.includeBaggage && !baggageIncluded) continue;
      if (params.cabinClass === "BUSINESS" || params.cabinClass === "FIRST") {
        baggageIncluded = true;
      }

      const cabinMultiplier =
        params.cabinClass === "BUSINESS"
          ? 3.5
          : params.cabinClass === "FIRST"
            ? 5
            : params.cabinClass === "PREMIUM_ECONOMY"
              ? 1.8
              : 1;

      itineraries.push(
        buildItinerary({
          idSuffix: `${i}-${airline.code}`,
          origin: params.origin,
          destination: params.destination,
          departureDate: params.departureDate,
          stops: cfg.stops,
          airlineCode: airline.code,
          airlineName: airline.name,
          baggageIncluded,
          basePrice: Math.round(price * cabinMultiplier),
          baseDepartureHour: cfg.hourOffset,
          durationMinutes: duration,
        }),
      );
    }

    const warnings = [
      "Dados fictícios gerados em modo demonstração. Não refletem preços ou disponibilidade reais.",
    ];

    return {
      itineraries,
      promotions: [],
      warnings,
    };
  }
}
