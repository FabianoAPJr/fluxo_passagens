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
  outputFileTracingIncludes: {
    "/api/flight-search": [
      "./node_modules/is-plain-object/**/*",
      "./node_modules/shallow-clone/**/*",
      "./node_modules/kind-of/**/*",
      "./node_modules/for-own/**/*",
      "./node_modules/for-in/**/*",
      "./node_modules/isobject/**/*",
      "./node_modules/lazy-cache/**/*",
      "./node_modules/clone-deep/**/*",
      "./node_modules/merge-deep/**/*",
      "./node_modules/puppeteer-extra-plugin-user-data-dir/**/*",
      // Binários do Chromium (.br) — o file tracer não detecta assets, mas
      // @sparticuz/chromium.executablePath() precisa deles em runtime.
      "./node_modules/@sparticuz/chromium/bin/**/*",
    ],
    "/api/requests/[id]/cotar-automatico": [
      "./node_modules/is-plain-object/**/*",
      "./node_modules/shallow-clone/**/*",
      "./node_modules/kind-of/**/*",
      "./node_modules/for-own/**/*",
      "./node_modules/for-in/**/*",
      "./node_modules/isobject/**/*",
      "./node_modules/lazy-cache/**/*",
      "./node_modules/clone-deep/**/*",
      "./node_modules/merge-deep/**/*",
      "./node_modules/puppeteer-extra-plugin-user-data-dir/**/*",
      "./node_modules/@sparticuz/chromium/bin/**/*",
    ],
  },
};

export default nextConfig;
