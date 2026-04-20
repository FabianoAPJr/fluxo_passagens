"use client";

import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AirportSelect } from "@/components/airport-select";
import { Loader2, User as UserIcon, AlertTriangle } from "lucide-react";

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const schema = z
  .object({
    origin: z.string().min(3, "Selecione o aeroporto de origem"),
    destination: z.string().min(3, "Selecione o aeroporto de destino"),
    departureDate: z.string().min(1, "Data de ida obrigatória"),
    departureTimeFrom: z.string().regex(timeRegex, "Horário inválido"),
    departureTimeTo: z.string().regex(timeRegex, "Horário inválido"),
    returnDate: z.string().min(1, "Data de volta obrigatória"),
    returnTimeFrom: z.string().regex(timeRegex, "Horário inválido"),
    returnTimeTo: z.string().regex(timeRegex, "Horário inválido"),
    reason: z.string().min(10, "Descreva o motivo com pelo menos 10 caracteres"),
  })
  .refine((d) => new Date(d.returnDate) >= new Date(d.departureDate), {
    message: "A volta deve ser igual ou após a ida",
    path: ["returnDate"],
  })
  .refine((d) => d.departureTimeTo >= d.departureTimeFrom, {
    message: "Horário final deve ser após o inicial",
    path: ["departureTimeTo"],
  })
  .refine((d) => d.returnTimeTo >= d.returnTimeFrom, {
    message: "Horário final deve ser após o inicial",
    path: ["returnTimeTo"],
  });

type FormData = z.infer<typeof schema>;

interface Manager {
  id: string;
  name: string | null;
  email: string | null;
}

interface NewRequestFormProps {
  manager: Manager | null;
  manager2: Manager | null;
}

export default function NewRequestForm({ manager, manager2 }: NewRequestFormProps) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      origin: "",
      destination: "",
      departureTimeFrom: "06:00",
      departureTimeTo: "12:00",
      returnTimeFrom: "12:00",
      returnTimeTo: "20:00",
    },
  });

  const hasManager = !!manager;

  async function onSubmit(data: FormData) {
    if (!manager) {
      toast.error("Você não possui um gestor cadastrado. Contate o administrador.");
      return;
    }

    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, managerId: manager.id }),
    });

    if (!res.ok) {
      toast.error("Erro ao criar solicitação. Tente novamente.");
      return;
    }

    const request = await res.json();
    toast.success("Solicitação enviada ao gestor!");
    router.push(`/requests/${request.id}`);
  }

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="origin">Origem *</Label>
              <Controller
                name="origin"
                control={control}
                render={({ field }) => (
                  <AirportSelect
                    id="origin"
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Ex: SDU ou Rio de Janeiro"
                    ariaInvalid={!!errors.origin}
                  />
                )}
              />
              {errors.origin && <p className="text-xs text-red-500">{errors.origin.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="destination">Destino *</Label>
              <Controller
                name="destination"
                control={control}
                render={({ field }) => (
                  <AirportSelect
                    id="destination"
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Ex: CGH ou São Paulo"
                    ariaInvalid={!!errors.destination}
                  />
                )}
              />
              {errors.destination && <p className="text-xs text-red-500">{errors.destination.message}</p>}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 p-4 space-y-3">
            <p className="text-sm font-semibold text-[#004d33]">Ida *</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="departureDate">Data</Label>
                <Input id="departureDate" type="date" {...register("departureDate")} />
                {errors.departureDate && <p className="text-xs text-red-500">{errors.departureDate.message}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="departureTimeFrom">Horário de</Label>
                <Input id="departureTimeFrom" type="time" {...register("departureTimeFrom")} />
                {errors.departureTimeFrom && <p className="text-xs text-red-500">{errors.departureTimeFrom.message}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="departureTimeTo">Horário até</Label>
                <Input id="departureTimeTo" type="time" {...register("departureTimeTo")} />
                {errors.departureTimeTo && <p className="text-xs text-red-500">{errors.departureTimeTo.message}</p>}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 p-4 space-y-3">
            <p className="text-sm font-semibold text-[#004d33]">Volta *</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="returnDate">Data</Label>
                <Input id="returnDate" type="date" {...register("returnDate")} />
                {errors.returnDate && <p className="text-xs text-red-500">{errors.returnDate.message}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="returnTimeFrom">Horário de</Label>
                <Input id="returnTimeFrom" type="time" {...register("returnTimeFrom")} />
                {errors.returnTimeFrom && <p className="text-xs text-red-500">{errors.returnTimeFrom.message}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="returnTimeTo">Horário até</Label>
                <Input id="returnTimeTo" type="time" {...register("returnTimeTo")} />
                {errors.returnTimeTo && <p className="text-xs text-red-500">{errors.returnTimeTo.message}</p>}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="reason">Motivo da viagem *</Label>
            <Textarea
              id="reason"
              placeholder="Descreva o motivo da viagem e o que será realizado..."
              rows={4}
              {...register("reason")}
            />
            {errors.reason && <p className="text-xs text-red-500">{errors.reason.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Fluxo de aprovação</Label>
            {hasManager ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                  <UserIcon size={16} className="text-gray-500" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">1º gestor</p>
                    <p className="text-sm font-medium text-gray-800">{manager!.name}</p>
                    <p className="text-xs text-gray-400">{manager!.email}</p>
                  </div>
                </div>
                {manager2 && (
                  <div className="flex items-center gap-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                    <UserIcon size={16} className="text-gray-500" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">2º gestor</p>
                      <p className="text-sm font-medium text-gray-800">{manager2.name}</p>
                      <p className="text-xs text-gray-400">{manager2.email}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <AlertTriangle size={16} className="mt-0.5" />
                <p>Você não possui um gestor cadastrado. Contate o administrador para configurar seu fluxo de aprovação.</p>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !hasManager}
              className="flex-1 bg-[#004d33] hover:bg-[#49624e]"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
              Enviar ao gestor
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
