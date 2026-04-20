import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { getFlightSearchProvider } from "@/lib/flight-search/provider";
import type { FlightBadge, FlightItinerary, FlightSearchResult } from "@/lib/flight-search/types";

const iataRegex = /^[A-Z]{3}$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const bodySchema = z
  .object({
    origin: z.string().regex(iataRegex, "Código IATA inválido"),
    destination: z.string().regex(iataRegex, "Código IATA inválido"),
    departureDate: z.string().regex(dateRegex, "Data inválida"),
    returnDate: z.string().regex(dateRegex).optional(),
    tripType: z.enum(["ONE_WAY", "ROUND_TRIP"]),
    passengers: z.number().int().min(1).max(9),
    cabinClass: z.enum(["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"]),
    maxPrice: z.number().positive().optional(),
    dateFlexibility: z.union([z.literal(0), z.literal(1), z.literal(3), z.literal(7)]),
    allowNearbyAirports: z.boolean(),
    maxStops: z.union([z.literal(0), z.literal(1), z.literal(2)]),
    maxLayoverMinutes: z.number().int().positive().optional(),
    preferredAirlines: z.array(z.string()).optional(),
    avoidAirlines: z.array(z.string()).optional(),
    includeBaggage: z.boolean(),
  })
  .refine((d) => d.origin !== d.destination, {
    message: "Origem e destino devem ser diferentes",
    path: ["destination"],
  })
  .refine((d) => d.tripType === "ONE_WAY" || !!d.returnDate, {
    message: "Data de volta obrigatória para ida e volta",
    path: ["returnDate"],
  });

function applyBadges(itineraries: FlightItinerary[]): FlightItinerary[] {
  if (itineraries.length === 0) return itineraries;

  const byPrice = [...itineraries].sort((a, b) => a.totalPrice - b.totalPrice);
  const byDuration = [...itineraries].sort((a, b) => a.totalDurationMinutes - b.totalDurationMinutes);

  const maxPrice = Math.max(...itineraries.map((i) => i.totalPrice));
  const maxDuration = Math.max(...itineraries.map((i) => i.totalDurationMinutes));
  const byValue = [...itineraries].sort((a, b) => {
    const scoreA = a.totalPrice / maxPrice + a.totalDurationMinutes / maxDuration;
    const scoreB = b.totalPrice / maxPrice + b.totalDurationMinutes / maxDuration;
    return scoreA - scoreB;
  });

  const cheapestId = byPrice[0].id;
  const fastestId = byDuration[0].id;
  const bestValueId = byValue[0].id;

  return itineraries.map((it) => {
    const badges: FlightBadge[] = [];
    if (it.id === cheapestId) badges.push("CHEAPEST");
    if (it.id === fastestId) badges.push("FASTEST");
    if (it.id === bestValueId && bestValueId !== cheapestId && bestValueId !== fastestId) {
      badges.push("BEST_VALUE");
    }
    return { ...it, badges };
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const provider = getFlightSearchProvider();

  try {
    const raw = await provider.search(parsed.data);
    const result: FlightSearchResult = {
      providerName: provider.name,
      isDemo: provider.isDemo,
      itineraries: applyBadges(raw.itineraries),
      promotions: raw.promotions,
      warnings: raw.warnings,
    };
    return NextResponse.json(result);
  } catch (e) {
    console.error("Flight search error:", e);
    const message = e instanceof Error ? e.message : "Erro desconhecido";
    return NextResponse.json(
      { error: `Falha na busca: ${message}` },
      { status: 502 },
    );
  }
}
