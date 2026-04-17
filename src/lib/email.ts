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
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; background: #f0f0e0; margin: 0; padding: 24px 12px; color: #2a2a2a; -webkit-font-smoothing: antialiased; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 14px rgba(0,77,51,0.08); border: 1px solid #e8e8dc; }
        .header { background: #004d33; color: #ffffff; padding: 32px 40px 28px; border-bottom: 3px solid #967439; }
        .header .brand { margin: 0 0 6px; font-size: 11px; letter-spacing: 2.5px; color: #8ccfb4; text-transform: uppercase; font-weight: 600; }
        .header h1 { margin: 0; font-size: 18px; font-weight: 600; letter-spacing: 0.2px; }
        .body { padding: 36px 40px 12px; }
        .body h2 { margin: 0 0 12px; color: #004d33; font-size: 20px; font-weight: 600; }
        .body h3 { margin: 24px 0 8px; color: #004d33; font-size: 14px; font-weight: 600; letter-spacing: 0.3px; text-transform: uppercase; }
        .body p { line-height: 1.55; color: #3a3a3a; font-size: 14px; margin: 8px 0; }
        .info-table { width: 100%; border-collapse: collapse; margin: 18px 0; }
        .info-table td { padding: 11px 0; border-bottom: 1px solid #eee6d6; font-size: 14px; vertical-align: top; }
        .info-table tr:last-child td { border-bottom: none; }
        .info-table td:first-child { font-weight: 600; width: 40%; color: #6b6b6b; font-size: 13px; }
        .btn-wrap { text-align: center; padding: 12px 0 28px; }
        .btn { display: inline-block; padding: 14px 36px; background: #004d33; color: #ffffff !important; text-decoration: none !important; border-radius: 6px; font-weight: 600; font-size: 14px; letter-spacing: 0.3px; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; letter-spacing: 0.2px; }
        .badge-approved { background: #bfd2c1; color: #004d33; }
        .badge-rejected { background: #f6d9d9; color: #7a1f1f; }
        .locator { color: #967439; font-weight: 700; letter-spacing: 1.2px; }
        .footer { padding: 18px 40px; font-size: 12px; color: #8a8a80; background: #fafaf2; border-top: 1px solid #eee6d6; text-align: center; }
        .footer a { color: #004d33; text-decoration: none; }
        a { color: #004d33; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <p class="brand">SOMUS Capital</p>
          <h1>Sistema de Passagens Aéreas</h1>
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
    <div class="btn-wrap"><a href="${data.requestUrl}" class="btn">Ver solicitação</a></div>
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
    <div class="btn-wrap"><a href="${data.requestUrl}" class="btn">Realizar cotação</a></div>
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
    <div class="btn-wrap"><a href="${data.requestUrl}" class="btn">Ver detalhes</a></div>
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
    <h3>${label}</h3>
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
      <h3>Hospedagem</h3>
      <table class="info-table">
        <tr><td>Opção</td><td>APTO DA SOMUS</td></tr>
      </table>
    `;
  }
  return `
    <h3>Hospedagem</h3>
    <table class="info-table">
      <tr><td>Opção</td><td><strong>Reserva externa</strong></td></tr>
      ${q.accommodationLink ? `<tr><td>Link / Detalhes</td><td><a href="${q.accommodationLink}">${q.accommodationLink}</a></td></tr>` : ""}
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
      ${q.locatorCode ? `<tr><td>Código localizador</td><td><span class="locator">${q.locatorCode}</span></td></tr>` : ""}
      <tr><td>Valor total</td><td><strong>${data.totalPrice}</strong></td></tr>
    </table>
    ${flightBlock("Voo de ida", q, "outbound")}
    ${flightBlock("Voo de volta", q, "return")}
    ${accommodationBlock(q)}
    ${q.observations ? `<p style="margin-top:16px;"><strong>Observações:</strong> ${q.observations}</p>` : ""}
    <div class="btn-wrap"><a href="${data.requestUrl}" class="btn">Ver cotação completa</a></div>
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
    <div class="btn-wrap"><a href="${data.requestUrl}" class="btn">Ver detalhes</a></div>
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
    <div class="btn-wrap"><a href="${data.requestUrl}" class="btn">Ver detalhes</a></div>
  `);
}
