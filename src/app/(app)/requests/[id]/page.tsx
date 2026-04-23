import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { buttonVariants } from "@/components/ui/button";
import StatusBadge from "@/components/status-badge";
import RequestActions from "./request-actions";
import AutoQuotation from "./auto-quotation";
import { ArrowLeft, Calendar, MapPin, User, FileText, ExternalLink, History } from "lucide-react";
import Link from "next/link";
import {
  buildLaunchParamsFromRequest,
  getRequestDetailLaunchers,
} from "@/lib/flight-search/request-launch";

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
      events: {
        include: { actor: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
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

  const launchParams = buildLaunchParamsFromRequest({
    origin: request.origin,
    destination: request.destination,
    departureDate: request.departureDate,
    returnDate: request.returnDate,
  });
  const detailLaunchers = launchParams ? getRequestDetailLaunchers() : [];

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
                {request.departureTimeFrom && request.departureTimeTo && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    Embarque preferido entre {request.departureTimeFrom} e {request.departureTimeTo}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar size={16} className="text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Data de volta</p>
                <p className="text-sm font-medium">{fmt(request.returnDate)}</p>
                {request.returnTimeFrom && request.returnTimeTo && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    Embarque preferido entre {request.returnTimeFrom} e {request.returnTimeTo}
                  </p>
                )}
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

      {(role === "FINANCEIRO" || role === "MASTER") &&
        request.status === "PENDING_QUOTATION" &&
        launchParams && (
          <AutoQuotation requestId={request.id} />
        )}

      {launchParams && detailLaunchers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ExternalLink size={16} />
              Buscar cotação nos consolidadores
            </CardTitle>
            <p className="text-xs text-gray-500 mt-1">
              Abre o site do consolidador em nova aba, já com a rota e as datas desta solicitação preenchidas.
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {detailLaunchers.map((launcher) => (
                <a
                  key={launcher.id}
                  href={launcher.buildUrl(launchParams)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ variant: "outline" })}
                >
                  {launcher.name}
                  <ExternalLink size={14} className="ml-1" />
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {request.quotation && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cotação de passagem</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {request.quotation.locatorCode && (
              <div>
                <p className="text-xs text-gray-500">Código localizador</p>
                <p className="font-bold text-[#967439] text-lg tracking-wider">{request.quotation.locatorCode}</p>
              </div>
            )}

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

      {request.events.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <History size={16} /> Histórico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="relative border-l border-gray-200 ml-2 space-y-4">
              {request.events.map((ev) => {
                const payload = (ev.payload ?? {}) as { rejectionReason?: string; locatorCode?: string };
                return (
                  <li key={ev.id} className="ml-4">
                    <span
                      className={`absolute -left-1.5 w-3 h-3 rounded-full border-2 border-white ${eventDotColor(ev.type)}`}
                    />
                    <p className="text-sm font-medium text-gray-800">{eventLabel(ev.type)}</p>
                    <p className="text-xs text-gray-400">
                      {fmtShort(ev.createdAt)}
                      {ev.actor?.name ? ` · ${ev.actor.name}` : ""}
                    </p>
                    {payload.rejectionReason && (
                      <p className="text-xs text-red-700 mt-1">Motivo: {payload.rejectionReason}</p>
                    )}
                    {payload.locatorCode && (
                      <p className="text-xs text-[#967439] mt-1 tracking-wider">Localizador: {payload.locatorCode}</p>
                    )}
                  </li>
                );
              })}
            </ol>
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

function eventLabel(type: string): string {
  switch (type) {
    case "SUBMITTED": return "Solicitação enviada";
    case "MANAGER_APPROVED": return "Aprovada pelo gestor";
    case "MANAGER_REJECTED": return "Negada pelo gestor";
    case "MANAGER2_APPROVED": return "Aprovada pelo 2º gestor";
    case "MANAGER2_REJECTED": return "Negada pelo 2º gestor";
    case "QUOTATION_SUBMITTED": return "Cotação enviada pelo financeiro";
    case "TRAVELER_APPROVED": return "Cotação aprovada pelo solicitante";
    case "TRAVELER_REJECTED": return "Cotação recusada pelo solicitante";
    case "CANCELLED": return "Solicitação cancelada";
    default: return type;
  }
}

function eventDotColor(type: string): string {
  if (type.includes("REJECTED") || type === "CANCELLED") return "bg-red-500";
  if (type.includes("APPROVED")) return "bg-[#004d33]";
  return "bg-gray-400";
}
