// Smoke test do módulo flight-scraper rodando localmente (Chrome do sistema).
// NÃO roda em CI. Uso manual quando quiser validar que o scraper inteiro
// (não só os seletores) está funcionando.
//
// Uso: npx tsx scripts/smoke-test-scraper.ts
//
// Opcional: HEADLESS_DIAG=1 abre um browser extra em modo headless para
// tirar screenshot + dump HTML e diagnosticar por que o headless falha.

import { scrapeDecolar } from "../src/lib/flight-scraper";
import { chromium } from "playwright-core";
import * as fs from "node:fs/promises";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function diagnosticarHeadless() {
  const today = new Date();
  const ida = new Date(today.getTime() + 45 * 24 * 60 * 60 * 1000);
  const volta = new Date(ida.getTime() + 5 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const url = `https://www.decolar.com/shop/flights/results/roundtrip/GIG/CGH/${fmt(ida)}/${fmt(volta)}/1/0/0`;

  const browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true });
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(15000);
    await page.screenshot({ path: "scripts/decolar-headless.png" });
    const title = await page.title();
    const itinCount = await page.locator("itinerary-optimized").count();
    const bodyLen = ((await page.locator("body").innerText().catch(() => "")) as string).length;
    const html = await page.content();
    await fs.writeFile("scripts/decolar-headless.html", html, "utf-8");
    console.log("\n=== Diagnóstico headless ===");
    console.log("URL final:", page.url());
    console.log("Título:", title);
    console.log("itinerary-optimized count:", itinCount);
    console.log("body text length:", bodyLen);
    console.log("Screenshot: scripts/decolar-headless.png");
    console.log("HTML: scripts/decolar-headless.html");
  } finally {
    await browser.close();
  }
}

async function main() {
  if (process.env.HEADLESS_DIAG) {
    await diagnosticarHeadless();
    return;
  }

  const today = new Date();
  const ida = new Date(today.getTime() + 45 * 24 * 60 * 60 * 1000);
  const volta = new Date(ida.getTime() + 5 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  console.log("Iniciando smoke test do scraper Decolar...");
  const result = await scrapeDecolar({
    origem: "GIG",
    destino: "CGH",
    dataIda: fmt(ida),
    dataVolta: fmt(volta),
    adultos: 1,
  });

  console.log("\n=== Resultado ===");
  console.log("Sucesso:", result.sucesso);
  console.log("Duração:", result.duracaoMs, "ms");
  console.log("Erro:", result.erro ?? "(nenhum)");
  console.log("Ofertas:", result.ofertas.length);
  for (const o of result.ofertas.slice(0, 5)) {
    console.log(
      `  R$ ${o.preco} · ${o.companhia} · ${o.paradas === 0 ? "direto" : o.paradas + " paradas"} · ${Math.floor(o.duracaoMin / 60)}h${o.duracaoMin % 60}m · ${o.horarioPartida}→${o.horarioChegada}`,
    );
  }
}

main();
