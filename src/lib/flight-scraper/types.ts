export interface OfertaVoo {
  preco: number;
  moeda: "BRL";
  companhia: string;
  paradas: number;
  duracaoMin: number;
  horarioPartida: string;
  horarioChegada: string;
  linkCompra: string;
}

export interface ResultadoScrape {
  sucesso: boolean;
  ofertas: OfertaVoo[];
  erro?: string;
  duracaoMs: number;
}

export interface ScrapeInput {
  origem: string;
  destino: string;
  dataIda: string;
  dataVolta?: string;
  adultos: number;
}
