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

function baseTemplate(content: string) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        .header { background: #1e3a5f; color: #fff; padding: 24px 32px; }
        .header h1 { margin: 0; font-size: 20px; }
        .body { padding: 32px; color: #333; }
        .footer { background: #f8f8f8; padding: 16px 32px; font-size: 12px; color: #888; border-top: 1px solid #eee; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: bold; }
        .badge-pending { background: #fff3cd; color: #856404; }
        .badge-approved { background: #d1e7dd; color: #0f5132; }
        .badge-rejected { background: #f8d7da; color: #842029; }
        .btn { display: inline-block; margin-top: 20px; padding: 12px 24px; background: #1e3a5f; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold; }
        .info-table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        .info-table td { padding: 8px 0; border-bottom: 1px solid #eee; font-size: 14px; }
        .info-table td:first-child { font-weight: bold; width: 40%; color: #555; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✈ Sistema de Passagens Aéreas</h1>
          <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.8;">SOMUS Capital</p>
        </div>
        <div class="body">${content}</div>
        <div class="footer">Este é um e-mail automático. Acesse o sistema para mais detalhes.</div>
      </div>
    </body>
    </html>
  `;
}

export interface TravelRequestEmailData {
  requesterName: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  reason: string;
  requestUrl: string;
}

export function emailNewRequest(data: TravelRequestEmailData) {
  return baseTemplate(`
    <h2>Nova solicitação de viagem</h2>
    <p>Uma nova solicitação de viagem aguarda sua aprovação.</p>
    <table class="info-table">
      <tr><td>Solicitante</td><td>${data.requesterName}</td></tr>
      <tr><td>Destino</td><td>${data.destination}</td></tr>
      <tr><td>Data de ida</td><td>${data.departureDate}</td></tr>
      <tr><td>Data de volta</td><td>${data.returnDate}</td></tr>
      <tr><td>Motivo</td><td>${data.reason}</td></tr>
    </table>
    <a href="${data.requestUrl}" class="btn">Ver solicitação</a>
  `);
}

export function emailManagerApproved(data: TravelRequestEmailData) {
  return baseTemplate(`
    <h2>Solicitação aprovada pelo gestor</h2>
    <p>A solicitação de <strong>${data.requesterName}</strong> foi aprovada e aguarda cotação.</p>
    <table class="info-table">
      <tr><td>Destino</td><td>${data.destination}</td></tr>
      <tr><td>Data de ida</td><td>${data.departureDate}</td></tr>
      <tr><td>Data de volta</td><td>${data.returnDate}</td></tr>
      <tr><td>Motivo</td><td>${data.reason}</td></tr>
    </table>
    <a href="${data.requestUrl}" class="btn">Realizar cotação</a>
  `);
}

export function emailManagerRejected(data: TravelRequestEmailData & { rejectionReason: string }) {
  return baseTemplate(`
    <h2>Solicitação de viagem negada</h2>
    <p>Infelizmente, sua solicitação de viagem foi <span class="badge badge-rejected">negada</span> pelo gestor.</p>
    <table class="info-table">
      <tr><td>Destino</td><td>${data.destination}</td></tr>
      <tr><td>Data de ida</td><td>${data.departureDate}</td></tr>
      <tr><td>Motivo da negação</td><td>${data.rejectionReason}</td></tr>
    </table>
    <a href="${data.requestUrl}" class="btn">Ver detalhes</a>
  `);
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

function flightBlock(label: string, q: QuotationEmailFields, leg: "outbound" | "return") {
  const date = leg === "outbound" ? q.outboundDate : q.returnDate;
  const origin = leg === "outbound" ? q.outboundOriginCode : q.returnOriginCode;
  const dest = leg === "outbound" ? q.outboundDestinationCode : q.returnDestinationCode;
  const dep = leg === "outbound" ? q.outboundDepartureTime : q.returnDepartureTime;
  const arr = leg === "outbound" ? q.outboundArrivalTime : q.returnArrivalTime;
  const airline = leg === "outbound" ? q.outboundAirline : q.returnAirline;
  const flight = leg === "outbound" ? q.outboundFlightNumber : q.returnFlightNumber;

  if (!date && !origin && !airline) return "";

  return `
    <h3 style="margin:20px 0 8px;color:#1e3a5f;font-size:15px;">${label}</h3>
    <table class="info-table">
      ${date ? `<tr><td>Data</td><td>${fmtDate(date)}</td></tr>` : ""}
      ${origin || dest ? `<tr><td>Trecho</td><td>${origin ?? "—"} × ${dest ?? "—"}</td></tr>` : ""}
      ${dep || arr ? `<tr><td>Horário</td><td>${dep ?? "—"} – ${arr ?? "—"}</td></tr>` : ""}
      ${airline ? `<tr><td>Companhia</td><td>${airline}</td></tr>` : ""}
      ${flight ? `<tr><td>Voo</td><td>${flight}</td></tr>` : ""}
    </table>
  `;
}

function accommodationBlock(q: QuotationEmailFields) {
  if (!q.accommodationType) return "";
  if (q.accommodationType === "APTO_SOMUS") {
    return `
      <h3 style="margin:20px 0 8px;color:#1e3a5f;font-size:15px;">Hospedagem</h3>
      <table class="info-table">
        <tr><td>Opção</td><td>APTO DA SOMUS</td></tr>
      </table>
    `;
  }
  return `
    <h3 style="margin:20px 0 8px;color:#1e3a5f;font-size:15px;">Hospedagem</h3>
    <table class="info-table">
      <tr><td>Opção</td><td>Reserva externa</td></tr>
      ${q.accommodationLink ? `<tr><td>Link/Detalhes</td><td><a href="${q.accommodationLink}">${q.accommodationLink}</a></td></tr>` : ""}
    </table>
  `;
}

export function emailQuotationReady(data: TravelRequestEmailData & { quotation: QuotationEmailFields; totalPrice: string }) {
  const q = data.quotation;
  return baseTemplate(`
    <h2>Cotação de passagem disponível</h2>
    <p>A área financeira realizou a cotação da sua viagem. Acesse o sistema para aprovar ou recusar.</p>
    <table class="info-table">
      <tr><td>Destino</td><td>${data.destination}</td></tr>
      ${q.locatorCode ? `<tr><td>Código localizador</td><td><strong>${q.locatorCode}</strong></td></tr>` : ""}
      <tr><td>Valor total</td><td><strong>${data.totalPrice}</strong></td></tr>
    </table>
    ${flightBlock("Voo de ida", q, "outbound")}
    ${flightBlock("Voo de volta", q, "return")}
    ${accommodationBlock(q)}
    ${q.observations ? `<p style="margin-top:16px;"><strong>Observações:</strong> ${q.observations}</p>` : ""}
    <a href="${data.requestUrl}" class="btn">Ver cotação completa</a>
  `);
}

export function emailTravelerApproved(data: TravelRequestEmailData & { airline: string }) {
  return baseTemplate(`
    <h2>Viagem confirmada!</h2>
    <p><strong>${data.requesterName}</strong> confirmou a viagem. <span class="badge badge-approved">Aprovada</span></p>
    <table class="info-table">
      <tr><td>Destino</td><td>${data.destination}</td></tr>
      <tr><td>Data de ida</td><td>${data.departureDate}</td></tr>
      <tr><td>Data de volta</td><td>${data.returnDate}</td></tr>
      <tr><td>Companhia</td><td>${data.airline}</td></tr>
    </table>
    <a href="${data.requestUrl}" class="btn">Ver detalhes</a>
  `);
}

export function emailTravelerRejected(data: TravelRequestEmailData & { rejectionReason: string }) {
  return baseTemplate(`
    <h2>Cotação recusada pelo solicitante</h2>
    <p><strong>${data.requesterName}</strong> recusou a cotação de viagem.</p>
    <table class="info-table">
      <tr><td>Destino</td><td>${data.destination}</td></tr>
      <tr><td>Motivo</td><td>${data.rejectionReason}</td></tr>
    </table>
    <a href="${data.requestUrl}" class="btn">Ver detalhes</a>
  `);
}
