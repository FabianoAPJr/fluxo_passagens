import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import StatusBadge from "@/components/status-badge";
import RequestActions from "./request-actions";
import { ArrowLeft, Calendar, MapPin, User, FileText } from "lucide-react";
import Link from "next/link";

export default async function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const { id } = await params;
  const { id: userId, role } = session.user;

  const request = await prisma.travelRequest.findUnique({
    where: { id },
    include: {
      requester: { select: { id: true, name: true, email: true } },
      manager: { select: { id: true, name: true, email: true } },
      manager2: { select: { id: true, name: true, email: true } },
      quotation: { include: { financial: { select: { id: true, name: true, email: true } } } },
    },
  });

  if (!request) notFound();

  const canView =
    role === "MASTER" ||
    request.requesterId === userId ||
    request.managerId === userId ||
    request.manager2Id === userId ||
    role === "FINANCEIRO";
  if (!canView) notFound();

  const fmt = (d: Date) => format(d, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const fmtShort = (d: Date) => format(d, "dd/MM/yyyy HH:mm", { locale: ptBR });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href="/requests" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#004d33] mb-4">
          <ArrowLeft size={14} /> Voltar para solicitações
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <MapPin size={20} className="text-[#004d33]" />
              {request.origin ? `${request.origin} → ${request.destination}` : request.destination}
            </h1>
            <p className="text-sm text-gray-400 mt-1">Criado em {fmtShort(request.createdAt)}</p>
          </div>
          <StatusBadge status={request.status} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalhes da viagem</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <Calendar size={16} className="text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Data de ida</p>
                <p className="text-sm font-medium">{fmt(request.departureDate)}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar size={16} className="text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Data de volta</p>
                <p className="text-sm font-medium">{fmt(request.returnDate)}</p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex items-start gap-2">
            <FileText size={16} className="text-gray-400 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500">Motivo da viagem</p>
              <p className="text-sm">{request.reason}</p>
            </div>
          </div>

          {request.rejectionReason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs text-red-600 font-medium mb-1">Motivo da negação / recusa</p>
              <p className="text-sm text-red-700">{request.rejectionReason}</p>
            </div>
          )}

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <User size={16} className="text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Solicitante</p>
                <p className="text-sm font-medium">{request.requester.name}</p>
                <p className="text-xs text-gray-400">{request.requester.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <User size={16} className="text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Gestor</p>
                <p className="text-sm font-medium">{request.manager.name}</p>
                <p className="text-xs text-gray-400">{request.manager.email}</p>
              </div>
            </div>
            {request.manager2 && (
              <div className="flex items-start gap-2">
                <User size={16} className="text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">2º gestor</p>
                  <p className="text-sm font-medium">{request.manager2.name}</p>
                  <p className="text-xs text-gray-400">{request.manager2.email}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {request.quotation && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cotação de passagem</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              {request.quotation.locatorCode && (
                <div>
                  <p className="text-xs text-gray-500">Código localizador</p>
                  <p className="font-bold text-[#967439] text-lg tracking-wider">{request.quotation.locatorCode}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500">Valor total</p>
                <p className="font-bold text-lg text-[#004d33]">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: request.quotation.currency }).format(request.quotation.totalPrice)}
                </p>
              </div>
            </div>

            {(request.quotation.outboundDate || request.quotation.outboundAirline) && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-semibold text-[#004d33] mb-2">Voo de ida</p>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    {request.quotation.outboundDate && (
                      <div>
                        <p className="text-xs text-gray-500">Data</p>
                        <p className="font-medium">{format(new Date(request.quotation.outboundDate), "dd/MM/yyyy", { locale: ptBR })}</p>
                      </div>
                    )}
                    {(request.quotation.outboundOriginCode || request.quotation.outboundDestinationCode) && (
                      <div>
                        <p className="text-xs text-gray-500">Trecho</p>
                        <p className="font-medium">{request.quotation.outboundOriginCode ?? "—"} × {request.quotation.outboundDestinationCode ?? "—"}</p>
                      </div>
                    )}
                    {(request.quotation.outboundDepartureTime || request.quotation.outboundArrivalTime) && (
                      <div>
                        <p className="text-xs text-gray-500">Horário</p>
                        <p className="font-medium">{request.quotation.outboundDepartureTime ?? "—"} – {request.quotation.outboundArrivalTime ?? "—"}</p>
                      </div>
                    )}
                    {request.quotation.outboundAirline && (
                      <div>
                        <p className="text-xs text-gray-500">Companhia</p>
                        <p className="font-medium">{request.quotation.outboundAirline}</p>
                      </div>
                    )}
                    {request.quotation.outboundFlightNumber && (
                      <div>
                        <p className="text-xs text-gray-500">Voo</p>
                        <p className="font-medium">{request.quotation.outboundFlightNumber}</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {(request.quotation.returnDate || request.quotation.returnAirline) && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-semibold text-[#004d33] mb-2">Voo de volta</p>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    {request.quotation.returnDate && (
                      <div>
                        <p className="text-xs text-gray-500">Data</p>
                        <p className="font-medium">{format(new Date(request.quotation.returnDate), "dd/MM/yyyy", { locale: ptBR })}</p>
                      </div>
                    )}
                    {(request.quotation.returnOriginCode || request.quotation.returnDestinationCode) && (
                      <div>
                        <p className="text-xs text-gray-500">Trecho</p>
                        <p className="font-medium">{request.quotation.returnOriginCode ?? "—"} × {request.quotation.returnDestinationCode ?? "—"}</p>
                      </div>
                    )}
                    {(request.quotation.returnDepartureTime || request.quotation.returnArrivalTime) && (
                      <div>
                        <p className="text-xs text-gray-500">Horário</p>
                        <p className="font-medium">{request.quotation.returnDepartureTime ?? "—"} – {request.quotation.returnArrivalTime ?? "—"}</p>
                      </div>
                    )}
                    {request.quotation.returnAirline && (
                      <div>
                        <p className="text-xs text-gray-500">Companhia</p>
                        <p className="font-medium">{request.quotation.returnAirline}</p>
                      </div>
                    )}
                    {request.quotation.returnFlightNumber && (
                      <div>
                        <p className="text-xs text-gray-500">Voo</p>
                        <p className="font-medium">{request.quotation.returnFlightNumber}</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {request.quotation.accommodationType && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-semibold text-[#004d33] mb-2">Hospedagem</p>
                  {request.quotation.accommodationType === "APTO_SOMUS" ? (
                    <p className="text-sm font-medium">APTO da SOMUS</p>
                  ) : (
                    <>
                      <p className="text-sm font-medium mb-1">Reserva externa</p>
                      {request.quotation.accommodationLink && (
                        <a
                          href={request.quotation.accommodationLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-[#49624e] hover:underline break-all"
                        >
                          {request.quotation.accommodationLink}
                        </a>
                      )}
                    </>
                  )}
                </div>
              </>
            )}

            {request.quotation.observations && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-gray-500 mb-1">Observações</p>
                  <p className="text-sm whitespace-pre-line">{request.quotation.observations}</p>
                </div>
              </>
            )}
            <p className="text-xs text-gray-400">
              Cotado por {request.quotation.financial.name} em {fmtShort(request.quotation.createdAt)}
            </p>
          </CardContent>
        </Card>
      )}

      <RequestActions
        request={{
          id: request.id,
          status: request.status,
          requesterId: request.requesterId,
          managerId: request.managerId,
          manager2Id: request.manager2Id,
        }}
        currentUserId={userId}
        currentRole={role}
      />
    </div>
  );
}
