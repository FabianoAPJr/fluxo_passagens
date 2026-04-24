import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Playwright + stealth plugin não devem ser bundlados pelo Turbopack — o
  // grafo de deps transitivas (is-plain-object, debug, etc.) não é resolvido
  // corretamente no bundle serverless. Deixar como require nativo do Node.
  serverExternalPackages: [
    "@sparticuz/chromium",
    "playwright-core",
    "playwright-extra",
    "puppeteer-extra",
    "puppeteer-extra-plugin",
    "puppeteer-extra-plugin-stealth",
    "puppeteer-extra-plugin-user-preferences",
  ],

  // puppeteer-extra-plugin depende de clone-deep/merge-deep, que usam
  // lazy-cache com require dinâmico (require(varString)). O file tracer do
  // Next/Turbopack não consegue detectar essas deps, então precisamos
  // incluí-las manualmente nos bundles das rotas que sobem o scraper.
  outputFileTracingIncludes: (() => {
    // Pacotes com require dinâmico ou sub-módulos não rastreáveis — forçar
    // inclusão do pacote inteiro. Vale para puppeteer-extra (require(var))
    // e puppeteer-extra-plugin-stealth (lista de "evasions" carregadas
    // como deps do plugin base em runtime).
    const scraperDeps = [
      // Cadeia dinâmica do clone-deep/merge-deep (lazy-cache)
      "./node_modules/is-plain-object/**/*",
      "./node_modules/shallow-clone/**/*",
      "./node_modules/kind-of/**/*",
      "./node_modules/for-own/**/*",
      "./node_modules/for-in/**/*",
      "./node_modules/isobject/**/*",
      "./node_modules/lazy-cache/**/*",
      "./node_modules/clone-deep/**/*",
      "./node_modules/merge-deep/**/*",
      // Toda a família puppeteer-extra (plugin base carrega sub-plugins
      // e evasions do stealth por nome em runtime)
      "./node_modules/puppeteer-extra/**/*",
      "./node_modules/puppeteer-extra-plugin/**/*",
      "./node_modules/puppeteer-extra-plugin-stealth/**/*",
      "./node_modules/puppeteer-extra-plugin-user-data-dir/**/*",
      "./node_modules/puppeteer-extra-plugin-user-preferences/**/*",
      // Wrapper do playwright
      "./node_modules/playwright-extra/**/*",
      "./node_modules/playwright-core/**/*",
      // Binários do Chromium (.br) — file tracer não detecta assets
      "./node_modules/@sparticuz/chromium/bin/**/*",
    ];
    return {
      "/api/flight-search": scraperDeps,
      "/api/requests/[id]/cotar-automatico": scraperDeps,
    };
  })(),
};

export default nextConfig;
