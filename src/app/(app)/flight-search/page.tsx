import FlightSearchClient from "./flight-search-client";

export default function FlightSearchPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Buscar passagens mais baratas</h1>
        <p className="text-sm text-gray-500 mt-1">
          Pesquise opções de voos disponíveis no mercado. Os resultados consideram preço total estimado, escalas e bagagem.
        </p>
      </div>
      <FlightSearchClient />
    </div>
  );
}
