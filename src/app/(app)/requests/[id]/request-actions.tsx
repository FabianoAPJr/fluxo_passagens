"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle, DollarSign } from "lucide-react";
import type { RequestStatus, Role } from "@prisma/client";

interface RequestActionsProps {
  request: {
    id: string;
    status: RequestStatus;
    requesterId: string;
    managerId: string;
    manager2Id: string | null;
  };
  currentUserId: string;
  currentRole: Role;
}

export default function RequestActions({ request, currentUserId, currentRole }: RequestActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showQuotationForm, setShowQuotationForm] = useState(false);
  const [quotation, setQuotation] = useState({
    locatorCode: "",
    outboundDate: "",
    outboundOriginCode: "",
    outboundDestinationCode: "",
    outboundDepartureTime: "",
    outboundArrivalTime: "",
    outboundAirline: "",
    outboundFlightNumber: "",
    returnDate: "",
    returnOriginCode: "",
    returnDestinationCode: "",
    returnDepartureTime: "",
    returnArrivalTime: "",
    returnAirline: "",
    returnFlightNumber: "",
    currency: "BRL",
    accommodationType: "" as "" | "APTO_SOMUS" | "EXTERNAL",
    accommodationLink: "",
    observations: "",
  });
  const setQ = (patch: Partial<typeof quotation>) => setQuotation((s) => ({ ...s, ...patch }));

  const isManager = (currentRole === "GESTOR" || currentRole === "MASTER") && request.managerId === currentUserId;
  const isManager2 = (currentRole === "GESTOR" || currentRole === "MASTER") && request.manager2Id === currentUserId;
  const isFinancial = currentRole === "FINANCEIRO" || currentRole === "MASTER";
  const isRequester = request.requesterId === currentUserId || currentRole === "MASTER";

  async function doAction(action: string, extra?: object) {
    setLoading(true);
    try {
      const res = await fetch(`/api/requests/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "Erro ao processar ação.");
        return;
      }
      toast.success("Ação realizada com sucesso!");
      router.refresh();
      setShowRejectForm(false);
      setShowQuotationForm(false);
    } finally {
      setLoading(false);
    }
  }

  function handleReject(action: "reject_manager" | "reject_manager_2" | "reject_traveler") {
    if (!rejectionReason.trim()) {
      toast.error("Informe o motivo.");
      return;
    }
    doAction(action, { rejectionReason });
  }

  function handleQuotation() {
    if (!quotation.outboundAirline) {
      toast.error("Informe pelo menos a companhia da ida.");
      return;
    }
    const payload: any = { ...quotation };
    if (!payload.accommodationType) delete payload.accommodationType;
    doAction("submit_quotation", { quotation: payload });
  }

  // ─── Manager actions ────────────────────────────────────────────
  if (request.status === "PENDING_MANAGER" && isManager) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ação do gestor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!showRejectForm ? (
            <div className="flex gap-3">
              <Button
                onClick={() => doAction("approve_manager")}
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : <CheckCircle size={16} className="mr-2" />}
                Aprovar viagem
              </Button>
              <Button
                onClick={() => setShowRejectForm(true)}
                disabled={loading}
                variant="destructive"
                className="flex-1"
              >
                <XCircle size={16} className="mr-2" />
                Negar viagem
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Motivo da negação *</Label>
                <Textarea
                  placeholder="Explique o motivo da negação..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowRejectForm(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button
                  onClick={() => handleReject("reject_manager")}
                  disabled={loading}
                  variant="destructive"
                  className="flex-1"
                >
                  {loading && <Loader2 size={16} className="animate-spin mr-2" />}
                  Confirmar negação
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // ─── 2nd Manager actions ────────────────────────────────────────
  if (request.status === "PENDING_MANAGER_2" && isManager2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ação do 2º gestor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!showRejectForm ? (
            <div className="flex gap-3">
              <Button
                onClick={() => doAction("approve_manager_2")}
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : <CheckCircle size={16} className="mr-2" />}
                Aprovar viagem
              </Button>
              <Button
                onClick={() => setShowRejectForm(true)}
                disabled={loading}
                variant="destructive"
                className="flex-1"
              >
                <XCircle size={16} className="mr-2" />
                Negar viagem
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Motivo da negação *</Label>
                <Textarea
                  placeholder="Explique o motivo da negação..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowRejectForm(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button
                  onClick={() => handleReject("reject_manager_2")}
                  disabled={loading}
                  variant="destructive"
                  className="flex-1"
                >
                  {loading && <Loader2 size={16} className="animate-spin mr-2" />}
                  Confirmar negação
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // ─── Financial actions ──────────────────────────────────────────
  if (request.status === "PENDING_QUOTATION" && isFinancial) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign size={16} />
            Inserir cotação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-1">
            <Label>Código localizador</Label>
            <Input
              placeholder="Ex: PS515R"
              value={quotation.locatorCode}
              onChange={(e) => setQ({ locatorCode: e.target.value.toUpperCase() })}
            />
          </div>

          <div className="rounded-lg border border-gray-200 p-4 space-y-3">
            <p className="text-sm font-semibold text-[#004d33]">Voo de ida *</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Data</Label>
                <Input type="date" value={quotation.outboundDate} onChange={(e) => setQ({ outboundDate: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Origem</Label>
                <Input placeholder="SDU" maxLength={4} value={quotation.outboundOriginCode} onChange={(e) => setQ({ outboundOriginCode: e.target.value.toUpperCase() })} />
              </div>
              <div className="space-y-1">
                <Label>Destino</Label>
                <Input placeholder="CGH" maxLength={4} value={quotation.outboundDestinationCode} onChange={(e) => setQ({ outboundDestinationCode: e.target.value.toUpperCase() })} />
              </div>
              <div className="space-y-1">
                <Label>Saída</Label>
                <Input type="time" value={quotation.outboundDepartureTime} onChange={(e) => setQ({ outboundDepartureTime: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Chegada</Label>
                <Input type="time" value={quotation.outboundArrivalTime} onChange={(e) => setQ({ outboundArrivalTime: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Companhia *</Label>
                <Input placeholder="AZUL" value={quotation.outboundAirline} onChange={(e) => setQ({ outboundAirline: e.target.value.toUpperCase() })} />
              </div>
              <div className="space-y-1 col-span-3">
                <Label>Número do voo</Label>
                <Input placeholder="4664" value={quotation.outboundFlightNumber} onChange={(e) => setQ({ outboundFlightNumber: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 p-4 space-y-3">
            <p className="text-sm font-semibold text-[#004d33]">Voo de volta <span className="text-xs font-normal text-gray-400">(opcional)</span></p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Data</Label>
                <Input type="date" value={quotation.returnDate} onChange={(e) => setQ({ returnDate: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Origem</Label>
                <Input placeholder="CGH" maxLength={4} value={quotation.returnOriginCode} onChange={(e) => setQ({ returnOriginCode: e.target.value.toUpperCase() })} />
              </div>
              <div className="space-y-1">
                <Label>Destino</Label>
                <Input placeholder="SDU" maxLength={4} value={quotation.returnDestinationCode} onChange={(e) => setQ({ returnDestinationCode: e.target.value.toUpperCase() })} />
              </div>
              <div className="space-y-1">
                <Label>Saída</Label>
                <Input type="time" value={quotation.returnDepartureTime} onChange={(e) => setQ({ returnDepartureTime: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Chegada</Label>
                <Input type="time" value={quotation.returnArrivalTime} onChange={(e) => setQ({ returnArrivalTime: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Companhia</Label>
                <Input placeholder="AZUL" value={quotation.returnAirline} onChange={(e) => setQ({ returnAirline: e.target.value.toUpperCase() })} />
              </div>
              <div className="space-y-1 col-span-3">
                <Label>Número do voo</Label>
                <Input placeholder="6406" value={quotation.returnFlightNumber} onChange={(e) => setQ({ returnFlightNumber: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 p-4 space-y-3">
            <p className="text-sm font-semibold text-[#004d33]">Hospedagem</p>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="accommodationType"
                  checked={quotation.accommodationType === "APTO_SOMUS"}
                  onChange={() => setQ({ accommodationType: "APTO_SOMUS", accommodationLink: "" })}
                />
                APTO da SOMUS
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="accommodationType"
                  checked={quotation.accommodationType === "EXTERNAL"}
                  onChange={() => setQ({ accommodationType: "EXTERNAL" })}
                />
                Reserva externa (Airbnb, Booking, hotel, etc.)
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="accommodationType"
                  checked={quotation.accommodationType === ""}
                  onChange={() => setQ({ accommodationType: "", accommodationLink: "" })}
                />
                Não se aplica
              </label>
            </div>
            {quotation.accommodationType === "EXTERNAL" && (
              <div className="space-y-1">
                <Label>Link ou detalhes da reserva</Label>
                <Input
                  placeholder="https://..."
                  value={quotation.accommodationLink}
                  onChange={(e) => setQ({ accommodationLink: e.target.value })}
                />
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label>Observações</Label>
            <Textarea
              placeholder="Ex: O check-in estará disponível 2 dias antes do embarque. Bagagem incluída. Etc."
              value={quotation.observations}
              onChange={(e) => setQ({ observations: e.target.value })}
              rows={3}
            />
          </div>

          <Button
            onClick={handleQuotation}
            disabled={loading}
            className="w-full bg-[#004d33] hover:bg-[#49624e]"
          >
            {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : <DollarSign size={16} className="mr-2" />}
            Enviar cotação ao colaborador
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ─── Traveler actions ───────────────────────────────────────────
  if (request.status === "PENDING_TRAVELER" && isRequester) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sua decisão</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!showRejectForm ? (
            <div className="flex gap-3">
              <Button
                onClick={() => doAction("approve_traveler")}
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : <CheckCircle size={16} className="mr-2" />}
                Aceitar passagem
              </Button>
              <Button
                onClick={() => setShowRejectForm(true)}
                disabled={loading}
                variant="destructive"
                className="flex-1"
              >
                <XCircle size={16} className="mr-2" />
                Recusar passagem
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Motivo da recusa *</Label>
                <Textarea
                  placeholder="Explique o motivo da recusa..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowRejectForm(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button
                  onClick={() => handleReject("reject_traveler")}
                  disabled={loading}
                  variant="destructive"
                  className="flex-1"
                >
                  {loading && <Loader2 size={16} className="animate-spin mr-2" />}
                  Confirmar recusa
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // ─── Cancel action ──────────────────────────────────────────────
  if (["PENDING_MANAGER", "PENDING_MANAGER_2", "PENDING_QUOTATION"].includes(request.status) && isRequester) {
    return (
      <div className="flex justify-end">
        <Button
          onClick={() => doAction("cancel")}
          disabled={loading}
          variant="outline"
          className="text-gray-500"
        >
          {loading && <Loader2 size={16} className="animate-spin mr-2" />}
          Cancelar solicitação
        </Button>
      </div>
    );
  }

  return null;
}
