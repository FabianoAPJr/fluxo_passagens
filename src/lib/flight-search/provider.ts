import type { FlightSearchProvider } from "./types";
import { DecolarScraperProvider } from "./providers/decolar-scraper";
import { DemoProvider } from "./providers/demo";

export function getFlightSearchProvider(): FlightSearchProvider {
  if (process.env.FLIGHT_SEARCH_PROVIDER === "demo") {
    return new DemoProvider();
  }
  return new DecolarScraperProvider();
}
