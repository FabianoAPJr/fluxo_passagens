import { ClientSecretCredential } from "@azure/identity";
import { Client } from "@microsoft/microsoft-graph-client";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials";

let graphClient: Client | null = null;

function getGraphClient(): Client {
  if (graphClient) return graphClient;

  const credential = new ClientSecretCredential(
    process.env.AZURE_AD_TENANT_ID!,
    process.env.AZURE_AD_CLIENT_ID!,
    process.env.AZURE_AD_CLIENT_SECRET!,
  );

  const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ["https://graph.microsoft.com/.default"],
  });

  graphClient = Client.initWithMiddleware({ authProvider });
  return graphClient;
}

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  const sender = process.env.EMAIL_FROM!;
  const recipients = (Array.isArray(to) ? to : [to]).map((address) => ({
    emailAddress: { address },
  }));

  const message = {
    message: {
      subject,
      body: { contentType: "HTML", content: html },
      toRecipients: recipients,
      from: { emailAddress: { address: sender } },
    },
    saveToSentItems: true,
  };

  await getGraphClient()
    .api(`/users/${encodeURIComponent(sender)}/sendMail`)
    .post(message);
}

// ─── Email templates ──────────────────────────────────────────────────────────

// Design tokens (brand palette aplicada ao email)
const GREEN_DARK = "#0d4d3a";
const GREEN_LIGHT = "#9FE1CB";
const GREEN_LIGHT_BG = "#E1F5EE";
const GREEN_LIGHT_TXT = "#0F6E56";
const GOLD = "#967439";
const BG_PAGE = "#f5f5f0";
const BG_CARD = "#F7F6F1";
const BORDER_SOFT = "#e8e4d8";
const LABEL_GRAY = "#8a8a80";
const TEXT_DARK = "#2a2a2a";
const TEXT_SOFT = "#555555";
const FONT_STACK = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

interface StatusPill {
  label: string;
  bg: string;
  color: string;
  dot: string;
}

interface BaseProps {
  title: string;
  subtitle: string;
  status: StatusPill;
  greeting: string;
  bodyHtml: string;
  button: { label: string; url: string };
}

const iconPlane = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>`;

const iconPlaneInline = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="${GREEN_LIGHT_TXT}" aria-hidden="true"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>`;

function baseTemplate(p: BaseProps) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${p.title}</title>
</head>
<body style="margin:0;padding:24px 12px;background:${BG_PAGE};font-family:${FONT_STACK};color:${TEXT_DARK};-webkit-font-smoothing:antialiased;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BG_PAGE};">
<tr>
<td align="center">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;background:#ffffff;border-radius:12px;border:1px solid ${BORDER_SOFT};overflow:hidden;">

<!-- HEADER -->
<tr>
<td style="background:${GREEN_DARK};padding:28px 40px 24px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td valign="middle" width="54" style="padding-right:14px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="40" height="40" align="center" valign="middle" style="background:${GREEN_LIGHT};border-radius:8px;">${iconPlane}</td></tr></table>
</td>
<td valign="middle">
<p style="margin:0 0 4px;color:${GREEN_LIGHT};font-size:11px;letter-spacing:2.5px;text-transform:uppercase;font-weight:600;">SOMUS Capital</p>
<h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:500;line-height:1.25;">${p.title}</h1>
<p style="margin:5px 0 0;color:${GREEN_LIGHT};font-size:14px;">${p.subtitle}</p>
</td>
</tr>
</table>
</td>
</tr>

<!-- STATUS PILL -->
<tr>
<td style="padding:22px 40px 0;">
<span style="display:inline-block;padding:6px 14px;background:${p.status.bg};color:${p.status.color};border-radius:20px;font-size:12px;font-weight:500;letter-spacing:0.2px;">
<span style="display:inline-block;width:6px;height:6px;background:${p.status.dot};border-radius:50%;margin-right:7px;vertical-align:middle;"></span>
${p.status.label}
</span>
</td>
</tr>

<!-- GREETING -->
<tr>
<td style="padding:18px 40px 0;">
<p style="margin:0 0 4px;font-size:15px;color:${TEXT_DARK};font-weight:500;">Olá,</p>
<p style="margin:4px 0 0;font-size:14px;color:${TEXT_SOFT};line-height:1.55;">${p.greeting}</p>
</td>
</tr>

<!-- BODY (card) -->
<tr>
<td style="padding:22px 40px 0;">
${p.bodyHtml}
</td>
</tr>

<!-- BUTTON -->
<tr>
<td align="center" style="padding:26px 40px 8px;">
<a href="${p.button.url}" style="display:inline-block;background:${GREEN_DARK};color:#ffffff;text-decoration:none;padding:13px 36px;border-radius:8px;font-weight:600;font-size:14px;letter-spacing:0.3px;">${p.button.label}</a>
</td>
</tr>

<!-- FOOTER -->
<tr>
<td style="padding:0 40px 24px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td style="border-top:1px solid ${BORDER_SOFT};padding-top:18px;text-align:center;"><p style="margin:0;font-size:12px;color:${LABEL_GRAY};line-height:1.5;">Este é um e-mail automático enviado pelo Sistema de Passagens Aéreas da Somus Capital.</p></td></tr>
</table>
</td>
</tr>

</table>
</td>
</tr>
</table>
</body>
</html>`;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function avatarBlock(name: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td width="52" valign="middle" style="padding-right:12px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="40" height="40" align="center" valign="middle" style="background:${GREEN_LIGHT_BG};color:${GREEN_LIGHT_TXT};border-radius:50%;font-size:14px;font-weight:600;line-height:40px;">${initials(name)}</td></tr></table>
</td>
<td valign="middle"><p style="margin:0;font-size:15px;font-weight:500;color:${TEXT_DARK};">${name}</p></td>
</tr></table>`;
}

function sectionLabel(text: string): string {
  return `<p style="margin:0 0 8px;font-size:11px;color:${LABEL_GRAY};letter-spacing:0.5px;text-transform:uppercase;font-weight:600;">${text}</p>`;
}

function durationDays(departure: Date, ret: Date): number {
  const ms = 24 * 60 * 60 * 1000;
  return Math.floor((ret.getTime() - departure.getTime()) / ms) + 1;
}

function fmtBR(d: Date): string {
  return d.toLocaleDateString("pt-BR");
}

function travelCard(data: {
  requesterName: string;
  origin: string;
  destination: string;
  departureDate: Date;
  returnDate: Date;
  reason: string;
}): string {
  const days = durationDays(data.departureDate, data.returnDate);
  const daysLabel = days === 1 ? "1 dia" : `${days} dias`;

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BG_CARD};border-radius:10px;">

<!-- Solicitante -->
<tr><td style="padding:18px 22px;border-bottom:1px solid ${BORDER_SOFT};">
${sectionLabel("Solicitante")}
${avatarBlock(data.requesterName)}
</td></tr>

<!-- Trajeto -->
<tr><td style="padding:18px 22px;border-bottom:1px solid ${BORDER_SOFT};">
${sectionLabel("Trajeto")}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td valign="top" width="40%">
<p style="margin:0;font-size:11px;color:${LABEL_GRAY};">Ida</p>
<p style="margin:3px 0 0;font-size:16px;font-weight:500;color:${TEXT_DARK};line-height:1.3;">${data.origin}</p>
<p style="margin:3px 0 0;font-size:12px;color:${LABEL_GRAY};">${fmtBR(data.departureDate)}</p>
</td>
<td valign="middle" align="center" width="20%">${iconPlaneInline}</td>
<td valign="top" align="right" width="40%">
<p style="margin:0;font-size:11px;color:${LABEL_GRAY};">Volta</p>
<p style="margin:3px 0 0;font-size:16px;font-weight:500;color:${TEXT_DARK};line-height:1.3;">${data.destination}</p>
<p style="margin:3px 0 0;font-size:12px;color:${LABEL_GRAY};">${fmtBR(data.returnDate)}</p>
</td>
</tr>
</table>
<p style="margin:14px 0 0;text-align:center;font-size:12px;color:${LABEL_GRAY};">${daysLabel} de duração</p>
</td></tr>

<!-- Motivo -->
<tr><td style="padding:18px 22px;">
${sectionLabel("Motivo da viagem")}
<p style="margin:0;font-size:14px;color:${TEXT_DARK};line-height:1.55;">${data.reason}</p>
</td></tr>

</table>`;
}

// Status pill presets
const PILL_PENDING_MANAGER: StatusPill = { label: "Pendente de aprovação", bg: "#FAEEDA", color: "#633806", dot: "#C9952B" };
const PILL_PENDING_MANAGER_2: StatusPill = { label: "Aguardando 2ª aprovação", bg: "#FAEEDA", color: "#633806", dot: "#C9952B" };
const PILL_PENDING_QUOTATION: StatusPill = { label: "Aguardando cotação", bg: "#E1EEF5", color: "#1a4966", dot: "#2d6a8f" };
const PILL_QUOTATION_READY: StatusPill = { label: "Cotação disponível", bg: "#F5EFE1", color: "#663a06", dot: GOLD };
const PILL_APPROVED: StatusPill = { label: "Aprovada", bg: GREEN_LIGHT_BG, color: GREEN_LIGHT_TXT, dot: GREEN_LIGHT_TXT };
const PILL_REJECTED: StatusPill = { label: "Negada", bg: "#F5E1E1", color: "#661a1a", dot: "#a83232" };
const PILL_REJECTED_TRAVELER: StatusPill = { label: "Cotação recusada", bg: "#F5E1E1", color: "#661a1a", dot: "#a83232" };

export interface TravelRequestEmailData {
  requesterName: string;
  origin: string;
  destination: string;
  departureDate: Date;
  returnDate: Date;
  reason: string;
  requestUrl: string;
}

export function emailNewRequest(data: TravelRequestEmailData & { approverRole?: "manager" | "manager2" }) {
  const isManager2 = data.approverRole === "manager2";
  return baseTemplate({
    title: isManager2 ? "2ª aprovação de viagem" : "Nova solicitação de viagem",
    subtitle: "Aguardando sua aprovação",
    status: isManager2 ? PILL_PENDING_MANAGER_2 : PILL_PENDING_MANAGER,
    greeting: `<strong>${data.requesterName}</strong> enviou uma solicitação de passagem aérea${isManager2 ? " — aguardando sua aprovação como 2º gestor" : ""}. Revise os detalhes abaixo antes de aprovar.`,
    bodyHtml: travelCard(data),
    button: { label: "Acessar solicitação", url: data.requestUrl },
  });
}

export function emailManagerApproved(data: TravelRequestEmailData) {
  return baseTemplate({
    title: "Solicitação aguardando cotação",
    subtitle: "Ação do Financeiro necessária",
    status: PILL_PENDING_QUOTATION,
    greeting: `A solicitação de <strong>${data.requesterName}</strong> foi aprovada pelo gestor e aguarda a cotação da passagem.`,
    bodyHtml: travelCard(data),
    button: { label: "Realizar cotação", url: data.requestUrl },
  });
}

export function emailManagerRejected(data: TravelRequestEmailData & { rejectionReason: string }) {
  const cardExtras = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5E1E1;border-radius:10px;margin-top:12px;">
<tr><td style="padding:16px 20px;">
${sectionLabel("Motivo da negação")}
<p style="margin:0;font-size:14px;color:#661a1a;line-height:1.55;">${data.rejectionReason}</p>
</td></tr>
</table>`;
  return baseTemplate({
    title: "Solicitação de viagem negada",
    subtitle: "Sua solicitação não foi aprovada",
    status: PILL_REJECTED,
    greeting: `Infelizmente sua solicitação de viagem foi <strong>negada</strong>. Veja o motivo abaixo.`,
    bodyHtml: travelCard(data) + cardExtras,
    button: { label: "Ver detalhes", url: data.requestUrl },
  });
}

interface QuotationEmailFields {
  locatorCode: string | null;
  outboundDate: Date | null;
  outboundOriginCode: string | null;
  outboundDestinationCode: string | null;
  outboundDepartureTime: string | null;
  outboundArrivalTime: string | null;
  outboundAirline: string | null;
  outboundFlightNumber: string | null;
  returnDate: Date | null;
  returnOriginCode: string | null;
  returnDestinationCode: string | null;
  returnDepartureTime: string | null;
  returnArrivalTime: string | null;
  returnAirline: string | null;
  returnFlightNumber: string | null;
  accommodationType: string | null;
  accommodationLink: string | null;
  observations: string | null;
}

function fmtDate(d: Date | null | undefined) {
  if (!d) return "—";
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString("pt-BR");
}

function quotationRow(label: string, value: string, isLocator = false): string {
  const valueStyle = isLocator
    ? `font-size:15px;font-weight:700;color:${GOLD};letter-spacing:1.2px;`
    : `font-size:14px;color:${TEXT_DARK};`;
  return `<tr>
<td style="padding:11px 0;border-bottom:1px solid ${BORDER_SOFT};font-size:12px;color:${LABEL_GRAY};letter-spacing:0.3px;text-transform:uppercase;font-weight:600;width:40%;vertical-align:top;">${label}</td>
<td style="padding:11px 0;border-bottom:1px solid ${BORDER_SOFT};${valueStyle}vertical-align:top;">${value}</td>
</tr>`;
}

function flightBlock(label: string, q: QuotationEmailFields, leg: "outbound" | "return"): string {
  const date = leg === "outbound" ? q.outboundDate : q.returnDate;
  const origin = leg === "outbound" ? q.outboundOriginCode : q.returnOriginCode;
  const dest = leg === "outbound" ? q.outboundDestinationCode : q.returnDestinationCode;
  const dep = leg === "outbound" ? q.outboundDepartureTime : q.returnDepartureTime;
  const arr = leg === "outbound" ? q.outboundArrivalTime : q.returnArrivalTime;
  const airline = leg === "outbound" ? q.outboundAirline : q.returnAirline;
  const flight = leg === "outbound" ? q.outboundFlightNumber : q.returnFlightNumber;

  if (!date && !origin && !airline) return "";

  const rows = [
    date ? quotationRow("Data", fmtDate(date)) : "",
    origin || dest ? quotationRow("Trecho", `${origin ?? "—"} × ${dest ?? "—"}`) : "",
    dep || arr ? quotationRow("Horário", `${dep ?? "—"} – ${arr ?? "—"}`) : "",
    airline ? quotationRow("Companhia", airline) : "",
    flight ? quotationRow("Voo", flight) : "",
  ].join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BG_CARD};border-radius:10px;margin-top:12px;">
<tr><td style="padding:18px 22px;">
${sectionLabel(label)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>
</td></tr>
</table>`;
}

function accommodationBlock(q: QuotationEmailFields): string {
  if (!q.accommodationType) return "";
  const label = sectionLabel("Hospedagem");
  if (q.accommodationType === "APTO_SOMUS") {
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BG_CARD};border-radius:10px;margin-top:12px;">
<tr><td style="padding:18px 22px;">${label}
<p style="margin:0;font-size:15px;font-weight:500;color:${TEXT_DARK};">APTO da SOMUS</p>
</td></tr></table>`;
  }
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BG_CARD};border-radius:10px;margin-top:12px;">
<tr><td style="padding:18px 22px;">${label}
<p style="margin:0 0 6px;font-size:15px;font-weight:500;color:${TEXT_DARK};">Reserva externa</p>
${q.accommodationLink ? `<p style="margin:0;font-size:13px;word-break:break-all;"><a href="${q.accommodationLink}" style="color:${GREEN_DARK};">${q.accommodationLink}</a></p>` : ""}
</td></tr></table>`;
}

export function emailQuotationReady(data: TravelRequestEmailData & { quotation: QuotationEmailFields; totalPrice: string }) {
  const q = data.quotation;
  const summary = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BG_CARD};border-radius:10px;">
<tr><td style="padding:18px 22px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${q.locatorCode ? quotationRow("Código localizador", q.locatorCode, true) : ""}
${quotationRow("Destino", data.destination)}
${quotationRow("Valor total", `<strong style="font-size:16px;color:${GREEN_DARK};">${data.totalPrice}</strong>`)}
</table>
</td></tr>
</table>`;

  const obs = q.observations
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BG_CARD};border-radius:10px;margin-top:12px;">
<tr><td style="padding:18px 22px;">
${sectionLabel("Observações")}
<p style="margin:0;font-size:14px;color:${TEXT_DARK};line-height:1.55;white-space:pre-line;">${q.observations}</p>
</td></tr></table>`
    : "";

  return baseTemplate({
    title: "Cotação de passagem disponível",
    subtitle: "Revise e aprove sua viagem",
    status: PILL_QUOTATION_READY,
    greeting: "A área financeira finalizou a cotação da sua viagem. Revise os detalhes e confirme ou recuse pelo sistema.",
    bodyHtml: summary + flightBlock("Voo de ida", q, "outbound") + flightBlock("Voo de volta", q, "return") + accommodationBlock(q) + obs,
    button: { label: "Ver cotação completa", url: data.requestUrl },
  });
}

export function emailTravelerApproved(data: TravelRequestEmailData & { airline: string }) {
  return baseTemplate({
    title: "Viagem confirmada",
    subtitle: `${data.requesterName} aceitou a cotação`,
    status: PILL_APPROVED,
    greeting: `<strong>${data.requesterName}</strong> confirmou a viagem aprovada. Tudo certo para o embarque.`,
    bodyHtml: travelCard(data),
    button: { label: "Ver detalhes", url: data.requestUrl },
  });
}

export function emailTravelerRejected(data: TravelRequestEmailData & { rejectionReason: string }) {
  const cardExtras = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5E1E1;border-radius:10px;margin-top:12px;">
<tr><td style="padding:16px 20px;">
${sectionLabel("Motivo da recusa")}
<p style="margin:0;font-size:14px;color:#661a1a;line-height:1.55;">${data.rejectionReason}</p>
</td></tr>
</table>`;
  return baseTemplate({
    title: "Cotação recusada",
    subtitle: `${data.requesterName} recusou a cotação enviada`,
    status: PILL_REJECTED_TRAVELER,
    greeting: `<strong>${data.requesterName}</strong> recusou a cotação de viagem. Veja o motivo abaixo.`,
    bodyHtml: travelCard(data) + cardExtras,
    button: { label: "Ver detalhes", url: data.requestUrl },
  });
}
