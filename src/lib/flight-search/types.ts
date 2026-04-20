export type TripType = "ONE_WAY" | "ROUND_TRIP";

export type CabinClass = "ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST";

export type DateFlexibility = 0 | 1 | 3 | 7;

export type MaxStops = 0 | 1 | 2;

export type SortBy = "PRICE" | "DURATION" | "STOPS" | "VALUE";

export type DepartureTimeFilter = "ANY" | "MORNING" | "AFTERNOON" | "EVENING" | "NIGHT";

export interface FlightSearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  tripType: TripType;
  passengers: number;
  cabinClass: CabinClass;
  maxPrice?: number;
  dateFlexibility: DateFlexibility;
  allowNearbyAirports: boolean;
  maxStops: MaxStops;
  maxLayoverMinutes?: number;
  preferredAirlines?: string[];
  avoidAirlines?: string[];
  includeBaggage: boolean;
}

export interface FlightSegment {
  airline: string;
  airlineName?: string;
  flightNumber: string;
  originCode: string;
  destinationCode: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
}

export interface FlightLayover {
  airportCode: string;
  durationMinutes: number;
}

export type FlightBadge = "CHEAPEST" | "FASTEST" | "BEST_VALUE";

export interface FlightItinerary {
  id: string;
  segments: FlightSegment[];
  layovers: FlightLayover[];
  totalDurationMinutes: number;
  stopsCount: number;
  mainAirline: string;
  mainAirlineName?: string;
  baggageIncluded: boolean;
  totalPrice: number;
  currency: string;
  sourceUrl?: string;
  provider: string;
  badges: FlightBadge[];
}

export interface FlightPromotion {
  title: string;
  description: string;
  source: string;
  sourceUrl: string;
  validUntil?: string;
}

export interface FlightSearchResult {
  providerName: string;
  isDemo: boolean;
  itineraries: FlightItinerary[];
  promotions: FlightPromotion[];
  warnings: string[];
}

export interface FlightSearchProvider {
  readonly name: string;
  readonly isDemo: boolean;
  search(params: FlightSearchParams): Promise<Omit<FlightSearchResult, "providerName" | "isDemo">>;
}
