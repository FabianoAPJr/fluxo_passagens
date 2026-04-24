// Ambient module declarations para os sub-módulos do puppeteer-extra-plugin-stealth.
// O pacote não publica tipos por evasion; são carregados em runtime como factories
// opacas. Ver src/lib/flight-scraper/browser.ts:preloadStealthEvasions.
declare module "puppeteer-extra-plugin-stealth/evasions/*" {
  const plugin: unknown;
  export default plugin;
}

// Deps transitivas das evasions (user-agent-override -> user-preferences -> user-data-dir).
declare module "puppeteer-extra-plugin-user-preferences" {
  const plugin: unknown;
  export default plugin;
}
declare module "puppeteer-extra-plugin-user-data-dir" {
  const plugin: unknown;
  export default plugin;
}
