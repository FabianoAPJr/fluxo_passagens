import type { FlightSearchProvider } from "./types";
import { DemoProvider } from "./providers/demo";
import { createAmadeusProvider } from "./providers/amadeus";

export function getFlightSearchProvider(): FlightSearchProvider {
  const preferred = (process.env.FLIGHT_SEARCH_PROVIDER ?? "").toLowerCase();

  if (preferred === "amadeus" || preferred === "") {
    const amadeus = createAmadeusProvider();
    if (amadeus) return amadeus;
  }

  return new DemoProvider();
}
