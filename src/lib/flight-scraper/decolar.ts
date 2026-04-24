// ⚠️ Em headless (produção Vercel), Decolar bloqueia no nível do CDN.
// A feature funciona apenas em execução local com headless:false.
// Em produção, a API route retorna fallbackDeepLink:true e a UI cai
// graciosamente para os deep-links manuais.
//
// Ver src/lib/flight-scraper/README.md — seção "Estado atual".

import { z } from "zod";
import { criarBrowser } from "./browser";
import {
  AGUARDO_MARKER_MS,
  AGUARDO_POS_CARGA_MS,
  AGUARDO_POS_MODAL_MS,
  buildDecolarResultsUrl,
  MAX_OFERTAS,
  SELETORES,
  TIMEOUT_NAVEGACAO_MS,
  TIMEOUT_TOTAL_MS,
} from "./constants";
import type { OfertaVoo, ResultadoScrape, ScrapeInput } from "./types";
import type { Browser, Page } from "playwright-core";

const inputSchema = z.object({
  origem: z.string().length(3),
  destino: z.string().length(3),
  dataIda: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dataVolta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  adultos: z.number().int().min(1).max(9),
});

export async function scrapeDecolar(input: ScrapeInput): Promise<ResultadoScrape> {
  const inicio = Date.now();

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return logAndReturn({
      sucesso: false,
      ofertas: [],
      erro: `Input inválido: ${JSON.stringify(parsed.error.flatten())}`,
      duracaoMs: Date.now() - inicio,
      origem: input.origem,
      destino: input.destino,
    });
  }

  const dados = parsed.data;
  let tentativaErro: string | undefined;

  for (let tentativa = 1; tentativa <= 2; tentativa++) {
    const restante = TIMEOUT_TOTAL_MS - (Date.now() - inicio);
    if (restante < 10_000) break;

    const res = await executarTentativa(dados, restante).catch((e: unknown) => ({
      sucesso: false as const,
      ofertas: [] as OfertaVoo[],
      erro: e instanceof Error ? e.message : String(e),
    }));

    if (res.sucesso) {
      return logAndReturn({
        ...res,
        duracaoMs: Date.now() - inicio,
        origem: dados.origem,
        destino: dados.destino,
      });
    }
    tentativaErro = res.erro;
  }

  return logAndReturn({
    sucesso: false,
    ofertas: [],
    erro: tentativaErro ?? "Falha desconhecida no scraper",
    duracaoMs: Date.now() - inicio,
    origem: dados.origem,
    destino: dados.destino,
  });
}

async function executarTentativa(
  dados: ScrapeInput,
  orcamentoMs: number,
): Promise<{ sucesso: boolean; ofertas: OfertaVoo[]; erro?: string }> {
  const url = buildDecolarResultsUrl(dados);
  let browser: Browser | undefined;

  try {
    const criado = await criarBrowser();
    browser = criado.browser;
    const page = await criado.context.newPage();

    page.setDefaultTimeout(Math.min(orcamentoMs, TIMEOUT_NAVEGACAO_MS));

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: TIMEOUT_NAVEGACAO_MS,
    });

    // Aguarda JS/XHR iniciais e simula atividade humana cedo para não disparar heurística
    // de "zero interação". Depois aguarda o marker do primeiro card aparecer.
    await simularHumano(page);
    await page.waitForTimeout(AGUARDO_POS_CARGA_MS);
    await dismissLoginModal(page);
    await simularHumano(page);

    const bloqueio = await detectarBloqueio(page);
    if (bloqueio) return { sucesso: false, ofertas: [], erro: bloqueio };

    await page
      .waitForSelector(SELETORES.READY_MARKER, { timeout: AGUARDO_MARKER_MS })
      .catch(() => {});

    const linkCompra = page.url();
    const ofertas = await extrairOfertas(page, linkCompra);

    if (ofertas.length === 0) {
      await logDiagnostico(page);
      return { sucesso: false, ofertas: [], erro: "Nenhuma oferta extraída (possível bloqueio silencioso)" };
    }
    return { sucesso: true, ofertas };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

async function logDiagnostico(page: Page): Promise<void> {
  try {
    const [url, title, info] = await Promise.all([
      Promise.resolve(page.url()),
      page.title().catch(() => ""),
      page.evaluate(() => ({
        bodyTextStart: document.body?.innerText?.slice(0, 500) ?? "",
        clusterContainer: document.querySelectorAll("div.cluster-container").length,
        itineraryOptimized: document.querySelectorAll("itinerary-optimized").length,
        flightsPrice: document.querySelectorAll("flights-price").length,
        anyDataSfaId: document.querySelectorAll("[data-sfa-id]").length,
        allDivs: document.querySelectorAll("div").length,
        htmlLen: document.documentElement.outerHTML.length,
      })).catch((e: Error) => ({ error: e.message })),
    ]);
    console.log(
      JSON.stringify({
        scope: "flight-scraper",
        provider: "decolar",
        kind: "diagnostico-bloqueio-silencioso",
        timestamp: new Date().toISOString(),
        url,
        title,
        ...info,
      }),
    );
  } catch (e) {
    console.log(
      JSON.stringify({
        scope: "flight-scraper",
        provider: "decolar",
        kind: "diagnostico-falhou",
        erro: e instanceof Error ? e.message : String(e),
      }),
    );
  }
}

async function dismissLoginModal(page: Page): Promise<void> {
  try {
    const btn = page.locator(SELETORES.DISMISS_LOGIN_MODAL).first();
    if (await btn.isVisible({ timeout: 2_000 })) {
      await btn.click({ timeout: 3_000 });
      await page.waitForTimeout(AGUARDO_POS_MODAL_MS);
    }
  } catch {
    /* modal pode não aparecer, seguir */
  }
}

async function simularHumano(page: Page): Promise<void> {
  const delay = () => 500 + Math.floor(Math.random() * 700);
  await page.mouse.move(300 + Math.random() * 400, 200 + Math.random() * 300);
  await page.waitForTimeout(delay());
  await page.mouse.move(600 + Math.random() * 300, 400 + Math.random() * 200);
  await page.mouse.wheel(0, 300 + Math.floor(Math.random() * 300));
  await page.waitForTimeout(delay());
  await page.mouse.wheel(0, 400 + Math.floor(Math.random() * 300));
  await page.waitForTimeout(delay());
}

async function detectarBloqueio(page: Page): Promise<string | null> {
  try {
    const title = (await page.title()).toLowerCase();
    if (title.includes("access denied") || title.includes("blocked")) return "Acesso negado pela Decolar";

    const texto = await page
      .locator("body")
      .innerText({ timeout: 2_000 })
      .catch(() => "");
    const lower = texto.toLowerCase();
    if (lower.includes("captcha") || lower.includes("verify you are human")) return "CAPTCHA detectado";
    if (lower.includes("acesso negado")) return "Acesso negado pela Decolar";
    return null;
  } catch {
    return null;
  }
}

async function extrairOfertas(page: Page, linkCompra: string): Promise<OfertaVoo[]> {
  const raw = await page.evaluate(
    ({ seletores, max }) => {
      const cards = Array.from(document.querySelectorAll(seletores.CARD_CONTAINER));
      return cards.slice(0, max).map((card) => {
        const root = card as HTMLElement;
        const airlineImg = root.querySelector(seletores.AIRLINE_IMG) as HTMLImageElement | null;
        const stopsEl = root.querySelector(seletores.STOPS_TEXT);
        const priceEl = root.querySelector(seletores.PRICE_TEXT);
        return {
          companhia: airlineImg?.alt ?? null,
          stopsText: stopsEl?.textContent?.trim() ?? null,
          precoText: priceEl?.textContent?.trim() ?? null,
          innerText: root.innerText,
        };
      });
    },
    { seletores: SELETORES, max: MAX_OFERTAS },
  );

  const ofertas: OfertaVoo[] = [];
  for (const r of raw) {
    const oferta = normalizarCard(r, linkCompra);
    if (oferta) ofertas.push(oferta);
  }
  return ofertas.sort((a, b) => a.preco - b.preco);
}

interface RawCard {
  companhia: string | null;
  stopsText: string | null;
  precoText: string | null;
  innerText: string;
}

function normalizarCard(raw: RawCard, linkCompra: string): OfertaVoo | null {
  if (!raw.companhia || !raw.precoText) return null;

  const preco = parsePreco(raw.precoText);
  if (preco === null) return null;

  // Texto típico: "GIG 21:05 CGH 22:20 Direto 1h 15m Final ida 1 R$ 244"
  const matchHorarios = raw.innerText.match(/(\d{2}:\d{2})[\s\S]*?(\d{2}:\d{2})/);
  const matchDuracao = raw.innerText.match(/(\d+)h\s*(\d+)?m?/);

  return {
    preco,
    moeda: "BRL",
    companhia: raw.companhia,
    paradas: parseParadas(raw.stopsText ?? ""),
    duracaoMin: matchDuracao ? parseInt(matchDuracao[1]) * 60 + (parseInt(matchDuracao[2] ?? "0") || 0) : 0,
    horarioPartida: matchHorarios?.[1] ?? "",
    horarioChegada: matchHorarios?.[2] ?? "",
    linkCompra,
  };
}

function parsePreco(texto: string): number | null {
  const match = texto.replace(/\s/g, "").match(/R\$?([\d.,]+)/);
  if (!match) return null;
  const n = parseInt(match[1].replace(/[.,]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseParadas(texto: string): number {
  const t = texto.toLowerCase().trim();
  if (t.includes("direto")) return 0;
  const match = t.match(/(\d+)\s+parada/);
  return match ? parseInt(match[1]) : 0;
}

function logAndReturn(
  result: ResultadoScrape & { origem: string; destino: string },
): ResultadoScrape {
  console.log(
    JSON.stringify({
      scope: "flight-scraper",
      provider: "decolar",
      timestamp: new Date().toISOString(),
      origem: result.origem,
      destino: result.destino,
      sucesso: result.sucesso,
      duracaoMs: result.duracaoMs,
      ofertasCount: result.ofertas.length,
      erro: result.erro,
    }),
  );
  return {
    sucesso: result.sucesso,
    ofertas: result.ofertas,
    erro: result.erro,
    duracaoMs: result.duracaoMs,
  };
}
