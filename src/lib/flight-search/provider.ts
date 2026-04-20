import type { FlightSearchProvider } from "./types";
import { DemoProvider } from "./providers/demo";

export function getFlightSearchProvider(): FlightSearchProvider {
  return new DemoProvider();
}
