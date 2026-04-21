// Seletores CSS da Decolar. Validados manualmente em 2026-04-21 via
// scripts/discover-decolar-selectors.ts (GIG → CGH, ida-e-volta 45d à frente).
//
// A Decolar usa Angular com classes scoped (_ngcontent-ng-c*) que MUDAM a
// cada deploy — NÃO use esses hashes. Os seletores abaixo são estáveis:
// 1) tags Angular customizadas (<itinerary-optimized>, <flights-price>)
// 2) atributos [data-sfa-id] semânticos
// 3) classes descritivas como "cluster-container"
//
// Quando o scraper quebrar, rode o script de discovery e atualize aqui.

export const SELETORES = {
  // Container raiz de cada card de oferta. Cada um contém um <itinerary-optimized>
  // (detalhes do voo) e um <flights-price> (preço).
  CARD_CONTAINER: "div.cluster-container",

  // Dentro do card:
  AIRLINE_IMG: "[data-sfa-id='airline-container'] img",
  STOPS_TEXT: "[data-sfa-id='stops-text']",
  PRICE_TEXT: "[data-sfa-id='total-mobile-main-desktop']",

  // Marcadores usados para aguardar a página carregar
  READY_MARKER: "itinerary-optimized",

  // Modal de login que a Decolar abre após ~5s de página carregada
  DISMISS_LOGIN_MODAL: "text=Não quero benefícios",
} as const;

// URL canônica de resultados. A Decolar redireciona /roundtrip/ para
// /multipleoneway/?isRedirectFromRoundtrip=true — isso é esperado e não é erro.
// Mesmo no formato multipleoneway, o preço exibido é o total do pacote ida+volta.
export function buildDecolarResultsUrl(params: {
  origem: string;
  destino: string;
  dataIda: string;
  dataVolta?: string;
  adultos: number;
}): string {
  const { origem, destino, dataIda, dataVolta, adultos } = params;
  const tipo = dataVolta ? "roundtrip" : "oneway";
  const datas = dataVolta ? `${dataIda}/${dataVolta}` : dataIda;
  return `https://www.decolar.com/shop/flights/results/${tipo}/${origem}/${destino}/${datas}/${adultos}/0/0`;
}

export const TIMEOUT_TOTAL_MS = 55_000;
export const TIMEOUT_NAVEGACAO_MS = 30_000;
export const AGUARDO_POS_CARGA_MS = 12_000;
export const AGUARDO_POS_MODAL_MS = 3_000;
export const AGUARDO_MARKER_MS = 25_000;
export const MAX_OFERTAS = 10;
