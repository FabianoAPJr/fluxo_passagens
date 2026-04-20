import type { CabinClass } from "./types";

export interface LaunchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers: number;
  cabinClass: CabinClass;
}

export interface Launcher {
  id: string;
  name: string;
  description: string;
  buildUrl(params: LaunchParams): string;
}

function toYYMMDD(date: string): string {
  return date.replace(/-/g, "").slice(2);
}

export const LAUNCHERS: Launcher[] = [
  {
    id: "google-flights",
    name: "Google Flights",
    description: "Consolidador do Google com preços de várias aéreas e agências",
    buildUrl(p) {
      const parts = [`Flights from ${p.origin} to ${p.destination} on ${p.departureDate}`];
      if (p.returnDate) parts.push(`returning ${p.returnDate}`);
      if (p.passengers > 1) parts.push(`for ${p.passengers} adults`);
      return `https://www.google.com/travel/flights?q=${encodeURIComponent(parts.join(" "))}`;
    },
  },
  {
    id: "skyscanner",
    name: "Skyscanner",
    description: "Agregador global focado em encontrar o menor preço",
    buildUrl(p) {
      const cabin =
        p.cabinClass === "PREMIUM_ECONOMY"
          ? "premiumeconomy"
          : p.cabinClass.toLowerCase();
      const dep = toYYMMDD(p.departureDate);
      const base = `https://www.skyscanner.com.br/transporte/voos/${p.origin.toLowerCase()}/${p.destination.toLowerCase()}`;
      const path = p.returnDate ? `${base}/${dep}/${toYYMMDD(p.returnDate)}` : `${base}/${dep}`;
      return `${path}/?adults=${p.passengers}&cabinclass=${cabin}`;
    },
  },
  {
    id: "kayak",
    name: "Kayak",
    description: "Consolidador popular com filtros avançados",
    buildUrl(p) {
      const cabin =
        p.cabinClass === "PREMIUM_ECONOMY"
          ? "premium"
          : p.cabinClass === "BUSINESS"
            ? "business"
            : p.cabinClass === "FIRST"
              ? "first"
              : "economy";
      const base = `https://www.kayak.com.br/flights/${p.origin}-${p.destination}/${p.departureDate}`;
      const path = p.returnDate ? `${base}/${p.returnDate}` : base;
      return `${path}/${p.passengers}adults?sort=price_a&fs=cabin=${cabin}`;
    },
  },
  {
    id: "kiwi",
    name: "Kiwi.com",
    description: "Inclui companhias low-cost (Ryanair, easyJet, etc.)",
    buildUrl(p) {
      const base = `https://www.kiwi.com/en/search/results/${p.origin}/${p.destination}/${p.departureDate}`;
      const path = p.returnDate ? `${base}/${p.returnDate}` : base;
      return `${path}?adults=${p.passengers}&sortBy=PRICE`;
    },
  },
  {
    id: "decolar",
    name: "Decolar",
    description: "Principal agência de viagens online brasileira",
    buildUrl(p) {
      const params = new URLSearchParams({
        from: p.origin,
        to: p.destination,
        departure: p.departureDate,
        adults: String(p.passengers),
      });
      if (p.returnDate) params.set("return", p.returnDate);
      return `https://www.decolar.com/passagens-aereas/?${params.toString()}`;
    },
  },
];
