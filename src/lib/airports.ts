export interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
}

export const AIRPORTS: Airport[] = [
  // ─── Brasil ───────────────────────────────────────────────────────
  { code: "GRU", name: "Guarulhos", city: "São Paulo", country: "Brasil" },
  { code: "CGH", name: "Congonhas", city: "São Paulo", country: "Brasil" },
  { code: "VCP", name: "Viracopos", city: "Campinas", country: "Brasil" },
  { code: "SDU", name: "Santos Dumont", city: "Rio de Janeiro", country: "Brasil" },
  { code: "GIG", name: "Galeão", city: "Rio de Janeiro", country: "Brasil" },
  { code: "CNF", name: "Confins", city: "Belo Horizonte", country: "Brasil" },
  { code: "PLU", name: "Pampulha", city: "Belo Horizonte", country: "Brasil" },
  { code: "BSB", name: "Presidente Juscelino Kubitschek", city: "Brasília", country: "Brasil" },
  { code: "CWB", name: "Afonso Pena", city: "Curitiba", country: "Brasil" },
  { code: "POA", name: "Salgado Filho", city: "Porto Alegre", country: "Brasil" },
  { code: "FLN", name: "Hercílio Luz", city: "Florianópolis", country: "Brasil" },
  { code: "SSA", name: "Deputado Luís Eduardo Magalhães", city: "Salvador", country: "Brasil" },
  { code: "REC", name: "Guararapes", city: "Recife", country: "Brasil" },
  { code: "FOR", name: "Pinto Martins", city: "Fortaleza", country: "Brasil" },
  { code: "NAT", name: "Aluízio Alves", city: "Natal", country: "Brasil" },
  { code: "MCZ", name: "Zumbi dos Palmares", city: "Maceió", country: "Brasil" },
  { code: "AJU", name: "Santa Maria", city: "Aracaju", country: "Brasil" },
  { code: "JPA", name: "Presidente Castro Pinto", city: "João Pessoa", country: "Brasil" },
  { code: "THE", name: "Senador Petrônio Portella", city: "Teresina", country: "Brasil" },
  { code: "SLZ", name: "Marechal Cunha Machado", city: "São Luís", country: "Brasil" },
  { code: "BEL", name: "Val de Cans", city: "Belém", country: "Brasil" },
  { code: "MAO", name: "Eduardo Gomes", city: "Manaus", country: "Brasil" },
  { code: "PVH", name: "Governador Jorge Teixeira", city: "Porto Velho", country: "Brasil" },
  { code: "RBR", name: "Plácido de Castro", city: "Rio Branco", country: "Brasil" },
  { code: "BVB", name: "Atlas Brasil Cantanhede", city: "Boa Vista", country: "Brasil" },
  { code: "MCP", name: "Alberto Alcolumbre", city: "Macapá", country: "Brasil" },
  { code: "PMW", name: "Brigadeiro Lysias Rodrigues", city: "Palmas", country: "Brasil" },
  { code: "CGB", name: "Marechal Rondon", city: "Cuiabá", country: "Brasil" },
  { code: "CGR", name: "Campo Grande", city: "Campo Grande", country: "Brasil" },
  { code: "GYN", name: "Santa Genoveva", city: "Goiânia", country: "Brasil" },
  { code: "VIX", name: "Eurico de Aguiar Salles", city: "Vitória", country: "Brasil" },
  { code: "IGU", name: "Cataratas", city: "Foz do Iguaçu", country: "Brasil" },
  { code: "NVT", name: "Ministro Victor Konder", city: "Navegantes", country: "Brasil" },
  { code: "JOI", name: "Lauro Carneiro de Loyola", city: "Joinville", country: "Brasil" },
  { code: "XAP", name: "Serafim Enoss Bertaso", city: "Chapecó", country: "Brasil" },
  { code: "RAO", name: "Leite Lopes", city: "Ribeirão Preto", country: "Brasil" },
  { code: "SJP", name: "Prof. Eribelto Manoel Reino", city: "São José do Rio Preto", country: "Brasil" },
  { code: "UDI", name: "Ten. Cel. Av. César Bombonato", city: "Uberlândia", country: "Brasil" },
  { code: "UBA", name: "Mário de Almeida Franco", city: "Uberaba", country: "Brasil" },
  { code: "IOS", name: "Jorge Amado", city: "Ilhéus", country: "Brasil" },
  { code: "PNZ", name: "Senador Nilo Coelho", city: "Petrolina", country: "Brasil" },
  { code: "BPS", name: "Porto Seguro", city: "Porto Seguro", country: "Brasil" },

  // ─── América do Sul ───────────────────────────────────────────────
  { code: "EZE", name: "Ministro Pistarini", city: "Buenos Aires", country: "Argentina" },
  { code: "AEP", name: "Jorge Newbery", city: "Buenos Aires", country: "Argentina" },
  { code: "SCL", name: "Arturo Merino Benítez", city: "Santiago", country: "Chile" },
  { code: "LIM", name: "Jorge Chávez", city: "Lima", country: "Peru" },
  { code: "BOG", name: "El Dorado", city: "Bogotá", country: "Colômbia" },
  { code: "UIO", name: "Mariscal Sucre", city: "Quito", country: "Equador" },
  { code: "MVD", name: "Carrasco", city: "Montevidéu", country: "Uruguai" },
  { code: "ASU", name: "Silvio Pettirossi", city: "Assunção", country: "Paraguai" },
  { code: "CCS", name: "Simón Bolívar", city: "Caracas", country: "Venezuela" },
  { code: "LPB", name: "El Alto", city: "La Paz", country: "Bolívia" },

  // ─── América do Norte ─────────────────────────────────────────────
  { code: "MIA", name: "Miami International", city: "Miami", country: "EUA" },
  { code: "MCO", name: "Orlando International", city: "Orlando", country: "EUA" },
  { code: "JFK", name: "John F. Kennedy", city: "Nova York", country: "EUA" },
  { code: "EWR", name: "Newark Liberty", city: "Nova York", country: "EUA" },
  { code: "LGA", name: "LaGuardia", city: "Nova York", country: "EUA" },
  { code: "LAX", name: "Los Angeles International", city: "Los Angeles", country: "EUA" },
  { code: "SFO", name: "San Francisco International", city: "São Francisco", country: "EUA" },
  { code: "ORD", name: "O'Hare International", city: "Chicago", country: "EUA" },
  { code: "ATL", name: "Hartsfield-Jackson", city: "Atlanta", country: "EUA" },
  { code: "DFW", name: "Dallas/Fort Worth", city: "Dallas", country: "EUA" },
  { code: "IAH", name: "George Bush Intercontinental", city: "Houston", country: "EUA" },
  { code: "BOS", name: "Logan International", city: "Boston", country: "EUA" },
  { code: "IAD", name: "Washington Dulles", city: "Washington D.C.", country: "EUA" },
  { code: "SEA", name: "Seattle-Tacoma", city: "Seattle", country: "EUA" },
  { code: "LAS", name: "Harry Reid International", city: "Las Vegas", country: "EUA" },
  { code: "YYZ", name: "Toronto Pearson", city: "Toronto", country: "Canadá" },
  { code: "YUL", name: "Pierre Elliott Trudeau", city: "Montreal", country: "Canadá" },
  { code: "YVR", name: "Vancouver International", city: "Vancouver", country: "Canadá" },
  { code: "MEX", name: "Benito Juárez", city: "Cidade do México", country: "México" },
  { code: "CUN", name: "Cancún International", city: "Cancún", country: "México" },

  // ─── Europa ───────────────────────────────────────────────────────
  { code: "LIS", name: "Humberto Delgado", city: "Lisboa", country: "Portugal" },
  { code: "OPO", name: "Francisco Sá Carneiro", city: "Porto", country: "Portugal" },
  { code: "MAD", name: "Adolfo Suárez Madrid-Barajas", city: "Madri", country: "Espanha" },
  { code: "BCN", name: "Josep Tarradellas Barcelona-El Prat", city: "Barcelona", country: "Espanha" },
  { code: "CDG", name: "Charles de Gaulle", city: "Paris", country: "França" },
  { code: "ORY", name: "Orly", city: "Paris", country: "França" },
  { code: "LHR", name: "Heathrow", city: "Londres", country: "Reino Unido" },
  { code: "LGW", name: "Gatwick", city: "Londres", country: "Reino Unido" },
  { code: "FRA", name: "Frankfurt", city: "Frankfurt", country: "Alemanha" },
  { code: "MUC", name: "Franz Josef Strauss", city: "Munique", country: "Alemanha" },
  { code: "AMS", name: "Schiphol", city: "Amsterdã", country: "Holanda" },
  { code: "FCO", name: "Leonardo da Vinci-Fiumicino", city: "Roma", country: "Itália" },
  { code: "MXP", name: "Malpensa", city: "Milão", country: "Itália" },
  { code: "ZRH", name: "Zurique", city: "Zurique", country: "Suíça" },
  { code: "GVA", name: "Genebra", city: "Genebra", country: "Suíça" },
  { code: "VIE", name: "Viena International", city: "Viena", country: "Áustria" },
  { code: "BRU", name: "Bruxelas", city: "Bruxelas", country: "Bélgica" },
  { code: "CPH", name: "Copenhague", city: "Copenhague", country: "Dinamarca" },
  { code: "ARN", name: "Estocolmo-Arlanda", city: "Estocolmo", country: "Suécia" },
  { code: "OSL", name: "Gardermoen", city: "Oslo", country: "Noruega" },
  { code: "HEL", name: "Helsinque-Vantaa", city: "Helsinque", country: "Finlândia" },
  { code: "DUB", name: "Dublin", city: "Dublin", country: "Irlanda" },
  { code: "IST", name: "Istambul", city: "Istambul", country: "Turquia" },
  { code: "SVO", name: "Sheremetyevo", city: "Moscou", country: "Rússia" },

  // ─── Ásia, Oceania, África, Oriente Médio ─────────────────────────
  { code: "DXB", name: "Dubai International", city: "Dubai", country: "Emirados Árabes" },
  { code: "DOH", name: "Hamad International", city: "Doha", country: "Catar" },
  { code: "AUH", name: "Abu Dhabi International", city: "Abu Dhabi", country: "Emirados Árabes" },
  { code: "HND", name: "Haneda", city: "Tóquio", country: "Japão" },
  { code: "NRT", name: "Narita", city: "Tóquio", country: "Japão" },
  { code: "ICN", name: "Incheon", city: "Seul", country: "Coreia do Sul" },
  { code: "PEK", name: "Pequim Capital", city: "Pequim", country: "China" },
  { code: "PVG", name: "Pudong", city: "Xangai", country: "China" },
  { code: "HKG", name: "Hong Kong International", city: "Hong Kong", country: "China" },
  { code: "SIN", name: "Changi", city: "Singapura", country: "Singapura" },
  { code: "BKK", name: "Suvarnabhumi", city: "Bangkok", country: "Tailândia" },
  { code: "DEL", name: "Indira Gandhi", city: "Nova Delhi", country: "Índia" },
  { code: "BOM", name: "Chhatrapati Shivaji Maharaj", city: "Mumbai", country: "Índia" },
  { code: "SYD", name: "Kingsford Smith", city: "Sydney", country: "Austrália" },
  { code: "MEL", name: "Tullamarine", city: "Melbourne", country: "Austrália" },
  { code: "AKL", name: "Auckland", city: "Auckland", country: "Nova Zelândia" },
  { code: "JNB", name: "O. R. Tambo", city: "Joanesburgo", country: "África do Sul" },
  { code: "CAI", name: "Cairo International", city: "Cairo", country: "Egito" },
];

export function findAirport(code: string): Airport | undefined {
  return AIRPORTS.find((a) => a.code === code);
}

export function searchAirports(query: string, limit = 50): Airport[] {
  const q = query.trim().toLowerCase();
  if (!q) return AIRPORTS.slice(0, limit);
  const results: Array<{ airport: Airport; score: number }> = [];
  for (const a of AIRPORTS) {
    const code = a.code.toLowerCase();
    const city = a.city.toLowerCase();
    const name = a.name.toLowerCase();
    let score = 0;
    if (code === q) score = 100;
    else if (code.startsWith(q)) score = 80;
    else if (city.startsWith(q)) score = 70;
    else if (city.includes(q)) score = 50;
    else if (name.includes(q)) score = 30;
    else if (code.includes(q)) score = 20;
    if (score > 0) results.push({ airport: a, score });
  }
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit).map((r) => r.airport);
}
