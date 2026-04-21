// Smoke-test manual dos launchers de consolidadores usados pela tela
// de detalhe da solicitação. Não é um teste automatizado — apenas imprime
// as URLs geradas para inspeção humana.
//
// Uso: npx tsx scripts/verify-launchers.ts
//
// Abra cada URL no navegador e confira se o consolidador reconheceu a rota,
// as datas e os passageiros. Se algum link levar a página vazia ou homepage,
// o formato em src/lib/flight-search/launchers.ts precisa ser ajustado.

import {
  buildLaunchParamsFromRequest,
  getRequestDetailLaunchers,
} from "../src/lib/flight-search/request-launch";

interface Case {
  label: string;
  origin: string | null;
  destination: string;
  departureDate: string;
  returnDate: string | null;
}

const CASES: Case[] = [
  {
    label: "SDU → GRU, ida e volta (1 mês à frente)",
    origin: "SDU",
    destination: "GRU",
    departureDate: "2026-05-21",
    returnDate: "2026-05-25",
  },
  {
    label: "GIG → BSB, ida e volta curta",
    origin: "GIG",
    destination: "BSB",
    departureDate: "2026-06-10",
    returnDate: "2026-06-12",
  },
  {
    label: "GRU → MIA, internacional",
    origin: "GRU",
    destination: "MIA",
    departureDate: "2026-07-15",
    returnDate: "2026-07-28",
  },
  {
    label: "Origem null — deve produzir 0 URLs",
    origin: null,
    destination: "GRU",
    departureDate: "2026-05-21",
    returnDate: "2026-05-25",
  },
];

const launchers = getRequestDetailLaunchers();

console.log(`Launchers expostos na tela de detalhe: ${launchers.map((l) => l.name).join(", ")}\n`);

for (const c of CASES) {
  console.log(`— ${c.label}`);
  const params = buildLaunchParamsFromRequest({
    origin: c.origin,
    destination: c.destination,
    departureDate: new Date(c.departureDate),
    returnDate: c.returnDate ? new Date(c.returnDate) : null,
  });
  if (!params) {
    console.log("  (sem origem — nenhum link gerado, tela oculta a seção)\n");
    continue;
  }
  for (const l of launchers) {
    console.log(`  [${l.name}] ${l.buildUrl(params)}`);
  }
  console.log();
}
