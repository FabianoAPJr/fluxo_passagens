"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plane } from "lucide-react";

export default function NewRequest() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!session) {
    router.replace("/");
    return null;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const body = {
      origin: formData.get("origin"),
      destination: formData.get("destination"),
      departureDate: formData.get("departureDate"),
      returnDate: formData.get("returnDate") || null,
      passengers: Number(formData.get("passengers")),
      reason: formData.get("reason"),
    };

    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao criar solicitação");
      }

      router.push("/requests");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-primary-light p-2.5 rounded-lg">
          <Plane className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Nova Solicitação</h1>
          <p className="text-sm text-muted">Preencha os dados da viagem</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label htmlFor="origin" className="block text-sm font-medium mb-1.5">
              Origem *
            </label>
            <input
              id="origin"
              name="origin"
              type="text"
              required
              placeholder="Ex: São Paulo (GRU)"
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="destination" className="block text-sm font-medium mb-1.5">
              Destino *
            </label>
            <input
              id="destination"
              name="destination"
              type="text"
              required
              placeholder="Ex: Rio de Janeiro (GIG)"
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label htmlFor="departureDate" className="block text-sm font-medium mb-1.5">
              Data de Ida *
            </label>
            <input
              id="departureDate"
              name="departureDate"
              type="date"
              required
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="returnDate" className="block text-sm font-medium mb-1.5">
              Data de Volta
            </label>
            <input
              id="returnDate"
              name="returnDate"
              type="date"
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label htmlFor="passengers" className="block text-sm font-medium mb-1.5">
            Número de Passageiros *
          </label>
          <input
            id="passengers"
            name="passengers"
            type="number"
            min={1}
            max={20}
            defaultValue={1}
            required
            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="reason" className="block text-sm font-medium mb-1.5">
            Motivo da Viagem *
          </label>
          <textarea
            id="reason"
            name="reason"
            required
            rows={3}
            placeholder="Descreva o motivo da viagem..."
            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-primary hover:bg-primary-hover text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? "Enviando..." : "Enviar Solicitação"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2.5 border border-border rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
