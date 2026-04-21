// Script standalone para descobrir seletores CSS da Decolar em modo headed.
// Terceira iteração: fecha o modal de login, inspeciona a estrutura completa
// de um card de oferta, tenta extrair campos usando seletores estáveis
// (tags Angular customizadas + data-sfa-id), e documenta o mapeamento.

import { chromium } from "playwright-core";
import * as fs from "node:fs/promises";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function main() {
  const today = new Date();
  const ida = new Date(today.getTime() + 45 * 24 * 60 * 60 * 1000);
  const volta = new Date(ida.getTime() + 5 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const url = `https://www.decolar.com/shop/flights/results/roundtrip/GIG/CGH/${fmt(ida)}/${fmt(volta)}/1/0/0`;
  console.log("URL:", url);

  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: false,
    args: ["--disable-blink-features=AutomationControlled"],
  });

  const context = await browser.newContext({
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    viewport: { width: 1366, height: 768 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });

  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(8000);

    // Fecha modal de login se aparecer
    const declineLoginSelectors = [
      "text=Não quero benefícios",
      "text=Continuar sem login",
      "button[aria-label='Fechar']",
      "button[aria-label='close']",
      ".close-icon",
      "[class*='close-button']",
    ];
    for (const s of declineLoginSelectors) {
      try {
        const btn = page.locator(s).first();
        if (await btn.isVisible({ timeout: 1000 })) {
          console.log(`Fechando modal via: ${s}`);
          await btn.click({ timeout: 3000 });
          await page.waitForTimeout(1500);
          break;
        }
      } catch {
        /* ignore */
      }
    }

    // Aguarda mais para renderização pós-modal
    await page.waitForTimeout(10000);

    console.log("URL final:", page.url());
    console.log("Título:", await page.title());

    // Screenshot limpo
    await page.screenshot({ path: "scripts/decolar-screenshot.png", fullPage: false });
    console.log("📸 Screenshot pós-modal em scripts/decolar-screenshot.png");

    // ====== Exploração de seletores estáveis ======
    console.log("\n=== Tags Angular customizadas (semanticamente estáveis) ===");
    const angularTags = [
      "cluster",
      "itinerary-optimized",
      "itinerary-element",
      "itinerary-element-airline",
      "itinerary-element-route",
      "itinerary-element-duration",
      "itinerary-element-stops-summary",
      "price-box",
      "flights-price",
      "cluster-price",
      "best-cluster-action",
      "cluster-action",
    ];
    for (const t of angularTags) {
      try {
        const c = await page.locator(t).count();
        if (c > 0) console.log(`  <${t}> × ${c}`);
      } catch {
        /* ignore */
      }
    }

    console.log("\n=== Atributos data-sfa-id visíveis ===");
    const sfaIds = await page.evaluate(() => {
      const els = document.querySelectorAll("[data-sfa-id]");
      const ids = new Map<string, number>();
      els.forEach((el) => {
        const v = el.getAttribute("data-sfa-id")!;
        ids.set(v, (ids.get(v) ?? 0) + 1);
      });
      return Array.from(ids.entries()).sort((a, b) => b[1] - a[1]);
    });
    for (const [id, count] of sfaIds.slice(0, 30)) {
      console.log(`  data-sfa-id="${id}" × ${count}`);
    }

    // Usa JavaScript direto no browser para achar o ancestor comum mais próximo
    // entre <itinerary-optimized> e <flights-price>.
    console.log("\n=== Estrutura DOM: ancestor comum do primeiro card ===");
    const cardInfo = await page.evaluate(() => {
      const itins = Array.from(document.querySelectorAll("itinerary-optimized"));
      const prices = Array.from(document.querySelectorAll("flights-price"));
      if (!itins.length || !prices.length) return null;

      // Primeiro itinerário + primeiro preço — sobe até encontrar ancestor comum
      const itin = itins[0] as HTMLElement;
      const price = prices[0] as HTMLElement;
      let ancestor: HTMLElement | null = itin;
      while (ancestor && !ancestor.contains(price)) {
        ancestor = ancestor.parentElement;
      }
      if (!ancestor) return null;

      // Descreve o caminho
      const tag = ancestor.tagName.toLowerCase();
      const cls = ancestor.getAttribute("class") ?? "";
      const id = ancestor.getAttribute("id") ?? "";
      const dataSfaId = ancestor.getAttribute("data-sfa-id") ?? "";

      return {
        tag,
        cls: cls.slice(0, 200),
        id,
        dataSfaId,
        childCount: ancestor.children.length,
        htmlLen: ancestor.outerHTML.length,
      };
    });
    console.log("Ancestor comum:", cardInfo);

    // Usa um seletor baseado no que descobrimos, extrai card-a-card
    console.log("\n=== Campos extraíveis por card (via JS direto) ===");
    const cardsData = await page.evaluate(() => {
      const itins = Array.from(document.querySelectorAll("itinerary-optimized"));
      return itins.slice(0, 3).map((itin, i) => {
        // Sobe até ancestor que contenha também <flights-price>
        let root: HTMLElement | null = itin as HTMLElement;
        while (root && !root.querySelector("flights-price")) {
          root = root.parentElement;
        }
        if (!root) return { i, ok: false };

        const airlineImg = root.querySelector("[data-sfa-id='airline-container'] img") as HTMLImageElement | null;
        const stopsEl = root.querySelector("[data-sfa-id='stops-text']");
        const priceEl = root.querySelector("[data-sfa-id='total-mobile-main-desktop']");
        const fullText = (root as HTMLElement).innerText;

        // Links de compra
        const links = Array.from(root.querySelectorAll("a[href]")).map(
          (a) => (a as HTMLAnchorElement).href,
        );

        return {
          i,
          ok: true,
          ancestorTag: root.tagName.toLowerCase(),
          ancestorClass: (root.getAttribute("class") ?? "").slice(0, 120),
          airline: airlineImg?.alt ?? null,
          stops: stopsEl?.textContent?.trim() ?? null,
          price: priceEl?.textContent?.trim().replace(/\s+/g, " ") ?? null,
          text: fullText.slice(0, 300).replace(/\s+/g, " "),
          linksCount: links.length,
          firstLink: links[0]?.slice(0, 120) ?? null,
        };
      });
    });
    for (const c of cardsData) console.log(c);

    // Placeholder para manter lógica do resto do script
    const firstCluster = page.locator("body");
    if (await firstCluster.count() > 0) {
      const html = await firstCluster.innerHTML();
      await fs.writeFile("scripts/decolar-first-cluster.html", html, "utf-8");
      console.log(`Salvo em scripts/decolar-first-cluster.html (${html.length} chars)`);

      // Extrações-teste usando candidatos de seletor
      const tests: { label: string; selector: string }[] = [
        { label: "Logo cia (alt)", selector: "[data-sfa-id='airline-container'] img" },
        { label: "Preço total", selector: "price-box" },
        { label: "Fare container", selector: "[data-sfa-id='fare-container']" },
        { label: "Duração", selector: "itinerary-element-duration" },
        { label: "Paradas", selector: "itinerary-element-stops-summary" },
        { label: "Route horários", selector: "itinerary-element-route" },
        { label: "Airline text", selector: "itinerary-element-airline" },
      ];
      console.log("\n=== Extrações-teste no primeiro cluster ===");
      for (const t of tests) {
        try {
          const loc = firstCluster.locator(t.selector).first();
          const count = await firstCluster.locator(t.selector).count();
          if (count === 0) {
            console.log(`  ✗ ${t.label} [${t.selector}] — não encontrado`);
            continue;
          }
          const text = await loc.innerText({ timeout: 1000 }).catch(() => "");
          const alt = await loc.getAttribute("alt").catch(() => null);
          const href = await loc.getAttribute("href").catch(() => null);
          console.log(
            `  ✓ ${t.label} [${t.selector}] (n=${count}) text="${text.slice(0, 60).replace(/\s+/g, " ")}"${alt ? ` alt="${alt}"` : ""}${href ? ` href="${href.slice(0, 60)}"` : ""}`,
          );
        } catch (e) {
          console.log(`  ✗ ${t.label}: ${(e as Error).message}`);
        }
      }

      // Texto cru do cluster pra ver formato
      const rawText = await firstCluster.innerText().catch(() => "");
      console.log("\n=== Texto cru do primeiro cluster ===");
      console.log(rawText.slice(0, 600));

      // Link de compra
      console.log("\n=== Primeiros 3 links dentro do cluster ===");
      const anchors = await firstCluster.locator("a[href]").all();
      for (let i = 0; i < Math.min(3, anchors.length); i++) {
        const h = await anchors[i].getAttribute("href");
        console.log(`  ${i}: ${h?.slice(0, 100)}`);
      }
    }

    console.log("\n⏸️  60s para inspeção manual. Ctrl-c encerra antes.");
    await page.waitForTimeout(60000);
  } catch (e) {
    console.error("Erro:", e);
  } finally {
    await browser.close();
  }
}

main();
