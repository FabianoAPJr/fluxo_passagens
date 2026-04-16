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
    outboundFlight: "",
    returnFlight: "",
    airline: "",
    totalPrice: "",
    currency: "BRL",
    observations: "",
  });

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
    if (!quotation.outboundFlight || !quotation.airline || !quotation.totalPrice) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    doAction("submit_quotation", {
      quotation: {
        ...quotation,
        totalPrice: parseFloat(quotation.totalPrice),
      },
    });
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
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Companhia aérea *</Label>
              <Input
                placeholder="Ex: LATAM, Gol, Azul"
                value={quotation.airline}
                onChange={(e) => setQuotation({ ...quotation, airline: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Valor total (R$) *</Label>
              <Input
                type="number"
                placeholder="0.00"
                min="0"
                step="0.01"
                value={quotation.totalPrice}
                onChange={(e) => setQuotation({ ...quotation, totalPrice: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Voo de ida *</Label>
              <Input
                placeholder="Ex: LA3040 - 08:00 → 10:20"
                value={quotation.outboundFlight}
                onChange={(e) => setQuotation({ ...quotation, outboundFlight: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Voo de volta</Label>
              <Input
                placeholder="Ex: LA3041 - 19:00 → 21:30"
                value={quotation.returnFlight}
                onChange={(e) => setQuotation({ ...quotation, returnFlight: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Observações</Label>
            <Textarea
              placeholder="Bagagem incluída, escalas, condições de reembolso..."
              value={quotation.observations}
              onChange={(e) => setQuotation({ ...quotation, observations: e.target.value })}
              rows={3}
            />
          </div>
          <Button
            onClick={handleQuotation}
            disabled={loading}
            className="w-full bg-[#1e3a5f] hover:bg-[#2d5fa6]"
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
