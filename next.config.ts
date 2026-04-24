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
};

export default nextConfig;
