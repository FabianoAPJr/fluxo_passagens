import { LAUNCHERS, type LaunchParams, type Launcher } from "./launchers";

export interface RequestLaunchInput {
  origin: string | null;
  destination: string;
  departureDate: Date;
  returnDate: Date | null;
}

// TODO: TravelRequest ainda não modela passageiros nem classe da cabine. Enquanto
// uma política de viagem (p. ex. executiva para voos longos) não for incorporada
// ao schema + form de solicitação, os links usam 1 adulto / ECONOMY por default.
const DEFAULT_PASSENGERS = 1;
const DEFAULT_CABIN_CLASS = "ECONOMY" as const;

// Consolidadores expostos na tela de detalhe da solicitação. Os demais providers
// em LAUNCHERS seguem disponíveis na aba "Buscar passagens".
const REQUEST_DETAIL_LAUNCHER_IDS = ["google-flights", "kayak", "skyscanner"] as const;

export function buildLaunchParamsFromRequest(request: RequestLaunchInput): LaunchParams | null {
  if (!request.origin) return null;
  return {
    origin: request.origin,
    destination: request.destination,
    departureDate: toISODate(request.departureDate),
    returnDate: request.returnDate ? toISODate(request.returnDate) : undefined,
    passengers: DEFAULT_PASSENGERS,
    cabinClass: DEFAULT_CABIN_CLASS,
  };
}

export function getRequestDetailLaunchers(): Launcher[] {
  const byId = new Map(LAUNCHERS.map((l) => [l.id, l]));
  return REQUEST_DETAIL_LAUNCHER_IDS.map((id) => byId.get(id)).filter(
    (l): l is Launcher => l !== undefined,
  );
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
