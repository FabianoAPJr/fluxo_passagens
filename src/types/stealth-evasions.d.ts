// Ambient module declarations para os sub-módulos do puppeteer-extra-plugin-stealth.
// O pacote não publica tipos por evasion; são carregados em runtime como factories
// opacas. Ver src/lib/flight-scraper/browser.ts:preloadStealthEvasions.
declare module "puppeteer-extra-plugin-stealth/evasions/*" {
  const plugin: unknown;
  export default plugin;
}
