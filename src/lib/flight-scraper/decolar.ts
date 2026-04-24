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
  let browser: Browser | undefined;

  try {
    const criado = await criarBrowser();
    browser = criado.browser;
    const page = await criado.context.newPage();

    page.setDefaultTimeout(Math.min(orcamentoMs, TIMEOUT_NAVEGACAO_MS));

    // Fluxo via home — passa pelo formulário como um usuário real em vez
    // de acessar a URL de resultados direto (que o Datadome serve vazio).
    await page.goto("https://www.decolar.com/", {
      waitUntil: "domcontentloaded",
      timeout: TIMEOUT_NAVEGACAO_MS,
    });
    await simularHumano(page);
    await dismissCookieBanner(page);

    const bloqueioHome = await detectarBloqueio(page);
    if (bloqueioHome) {
      await logDiagnostico(page, "home");
      return { sucesso: false, ofertas: [], erro: `Bloqueio na home: ${bloqueioHome}` };
    }

    await selecionarTipoViagem(page, dados);
    await preencherAeroporto(page, "origin", dados.origem);
    await preencherAeroporto(page, "destination", dados.destino);
    await selecionarDatas(page, dados);
    if (dados.adultos > 1) await ajustarPassageiros(page, dados.adultos);
    await clicarBuscar(page);

    // Espera o redirect para a URL de resultados
    await page.waitForURL(/shop\/flights\/results/, { timeout: TIMEOUT_NAVEGACAO_MS });
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
      await logDiagnostico(page, "resultados");
      return { sucesso: false, ofertas: [], erro: "Nenhuma oferta extraída (possível bloqueio silencioso)" };
    }
    return { sucesso: true, ofertas };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

async function dismissCookieBanner(page: Page): Promise<void> {
  const candidatos = ['button:has-text("Entendi")', 'button:has-text("Aceitar")', 'button:has-text("OK")'];
  for (const sel of candidatos) {
    try {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 1_500 })) {
        await btn.click({ timeout: 2_000 });
        await page.waitForTimeout(500);
        return;
      }
    } catch {
      /* tentar próximo */
    }
  }
}

async function selecionarTipoViagem(page: Page, dados: ScrapeInput): Promise<void> {
  const tipo = dados.dataVolta ? "Ida e volta" : "Só ida";
  try {
    // Abre dropdown (botão costuma mostrar o tipo atual)
    const dropdown = page.locator(
      'button:has-text("Ida e volta"), button:has-text("Só ida"), [data-sfa-id*="trip-type"]',
    ).first();
    if (await dropdown.isVisible({ timeout: 3_000 })) {
      const textoAtual = (await dropdown.textContent())?.trim() ?? "";
      if (textoAtual.includes(tipo)) return;
      await dropdown.click({ timeout: 2_000 });
      await page.waitForTimeout(400);
      await page.locator(`text=${tipo}`).first().click({ timeout: 2_000 });
      await page.waitForTimeout(400);
    }
  } catch (e) {
    console.log(
      JSON.stringify({
        scope: "flight-scraper",
        kind: "selecionarTipoViagem-falhou",
        erro: e instanceof Error ? e.message : String(e),
      }),
    );
  }
}

async function preencherAeroporto(
  page: Page,
  campo: "origin" | "destination",
  iata: string,
): Promise<void> {
  const placeholder = campo === "origin" ? "Origem" : "Destino";
  const input = page.locator(
    `input[placeholder*="${placeholder}"], input[id*="${campo}"], [data-sfa-id*="${campo}"] input`,
  ).first();

  await input.click({ timeout: 5_000 });
  await input.fill("");
  await input.type(iata, { delay: 80 });

  // Autocomplete: primeira opção que contenha o código IATA (estável entre países)
  const sugestao = page.locator(
    `li[role="option"]:has-text("${iata}"), [role="listbox"] [role="option"]:has-text("${iata}"), [role="listbox"] li:has-text("${iata}")`,
  ).first();
  await sugestao.waitFor({ state: "visible", timeout: 6_000 });
  await sugestao.click({ timeout: 2_000 });
  await page.waitForTimeout(300);
}

async function selecionarDatas(page: Page, dados: ScrapeInput): Promise<void> {
  await clicarDataCalendario(page, dados.dataIda);
  if (dados.dataVolta) {
    await clicarDataCalendario(page, dados.dataVolta);
  }
  // Alguns calendários precisam confirmar com "Aplicar"
  try {
    const aplicar = page.locator('button:has-text("Aplicar")').first();
    if (await aplicar.isVisible({ timeout: 1_500 })) {
      await aplicar.click({ timeout: 2_000 });
    }
  } catch {
    /* fora do fluxo — seguir */
  }
}

async function clicarDataCalendario(page: Page, iso: string): Promise<void> {
  // iso = "2026-07-23"
  const [y, m, d] = iso.split("-").map(Number);
  const mesNome = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
  ][m - 1];

  const ariaCandidatos = [
    `[aria-label*="${d} de ${mesNome} de ${y}"]`,
    `[aria-label*="${d} ${mesNome} ${y}"]`,
    `[data-day="${iso}"]`,
    `[data-date="${iso}"]`,
  ];

  // Navega meses até encontrar algum seletor
  for (let i = 0; i < 14; i++) {
    for (const sel of ariaCandidatos) {
      const dia = page.locator(sel).first();
      try {
        if (await dia.isVisible({ timeout: 300 })) {
          await dia.click({ timeout: 2_000 });
          await page.waitForTimeout(300);
          return;
        }
      } catch {
        /* tentar próximo */
      }
    }
    // Avança mês
    try {
      await page
        .locator('[aria-label*="Próximo mês"], [aria-label*="Next month"], button[data-sfa-id*="next"]')
        .first()
        .click({ timeout: 2_000 });
      await page.waitForTimeout(250);
    } catch {
      break;
    }
  }

  throw new Error(`Data ${iso} não encontrada no calendário`);
}

async function ajustarPassageiros(page: Page, adultos: number): Promise<void> {
  try {
    const seletor = page.locator(
      'button:has-text("1 passageiro"), button:has-text("1 adulto"), [data-sfa-id*="passengers"]',
    ).first();
    if (await seletor.isVisible({ timeout: 2_000 })) {
      await seletor.click({ timeout: 2_000 });
      await page.waitForTimeout(300);
      for (let i = 1; i < adultos; i++) {
        const mais = page.locator('[aria-label*="Adicionar adulto"], button:has-text("+")').first();
        await mais.click({ timeout: 2_000 });
      }
      await page.waitForTimeout(200);
    }
  } catch (e) {
    console.log(
      JSON.stringify({
        scope: "flight-scraper",
        kind: "ajustarPassageiros-falhou",
        erro: e instanceof Error ? e.message : String(e),
      }),
    );
  }
}

async function clicarBuscar(page: Page): Promise<void> {
  const btn = page.locator(
    'button:has-text("Buscar"), [data-sfa-id*="search-button"], button[type="submit"]:has-text("Buscar")',
  ).first();
  await btn.click({ timeout: 5_000 });
}

async function logDiagnostico(page: Page, etapa: "home" | "resultados"): Promise<void> {
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
        etapa,
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
        etapa,
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
