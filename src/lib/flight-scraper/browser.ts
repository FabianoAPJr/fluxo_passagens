import type { Browser, BrowserContext } from "playwright-core";

// Configurações de browser para ambiente Vercel serverless. Em desenvolvimento
// local cai no Chrome do sistema (se existir) ou no playwright-core com
// CHROME_EXECUTABLE_PATH definido em .env.local.
//
// Usa playwright-extra + puppeteer-extra-plugin-stealth para contornar o
// anti-bot da Decolar em modo headless (Vercel). O stealth aplica ~17 patches
// de fingerprint que o Datadome/Cloudflare usam para identificar headless.

export async function criarBrowser(): Promise<{ browser: Browser; context: BrowserContext }> {
  // O wrapper `playwright-extra` tenta resolver playwright/playwright-core por
  // require dinâmico — isso falha em bundle serverless. Usamos addExtra para
  // passar o chromium do playwright-core explicitamente.
  const { chromium: playwrightChromium } = await import("playwright-core");
  const { addExtra } = (await import("playwright-extra")) as unknown as {
    addExtra: (pw: unknown) => ChromiumWithPlugins;
  };
  const stealth = (await import("puppeteer-extra-plugin-stealth")).default;
  const chromium = addExtra(playwrightChromium);
  chromium.use(stealth());

  // Cada "evasion" do stealth é um pacote resolvido em runtime pelo plugin
  // base via require(nomeDinamico). No bundle serverless do Next isso quebra
  // com "Plugin dependency not found". Pré-registramos os 16 módulos default
  // via setDependencyResolution para que nenhum require dinâmico precise rodar.
  await preloadStealthEvasions(chromium);

  const executablePath = await resolverExecutablePath();
  const browserArgs = await resolverArgs();

  const browser = await chromium.launch({
    executablePath,
    headless: process.env.FLIGHT_SCRAPER_HEADED === "1" ? false : true,
    args: browserArgs,
  });

  const context = await browser.newContext({
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    viewport: { width: 1366, height: 768 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  await context.addInitScript(() => {
    // Stealth patches mínimos — sem dependências externas. Endereça os sinais
    // de fingerprint mais comumente usados por anti-bot (Datadome/PerimeterX):
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    Object.defineProperty(navigator, "languages", { get: () => ["pt-BR", "pt", "en-US", "en"] });
    Object.defineProperty(navigator, "plugins", {
      get: () => [{ name: "Chrome PDF Plugin" }, { name: "Chrome PDF Viewer" }, { name: "Native Client" }],
    });
    // chrome runtime object presente em Chrome real
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).chrome = (window as any).chrome ?? { runtime: {} };
    // Permissions API retorna "prompt" para notifications em Chrome real
    const origQuery = navigator.permissions?.query?.bind(navigator.permissions);
    if (origQuery) {
      navigator.permissions.query = (params: PermissionDescriptor) =>
        params.name === "notifications"
          ? Promise.resolve({ state: "prompt" } as PermissionStatus)
          : origQuery(params);
    }
  });

  return { browser, context };
}

async function resolverExecutablePath(): Promise<string> {
  // Em produção (Vercel serverless), usa @sparticuz/chromium.
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const chromium = (await import("@sparticuz/chromium")).default;
    return await chromium.executablePath();
  }
  // Local: caminho do Chrome do sistema (Windows/Mac/Linux) via env ou default Windows.
  const envPath = process.env.CHROME_EXECUTABLE_PATH;
  if (envPath) return envPath;
  if (process.platform === "win32") {
    return "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  }
  if (process.platform === "darwin") {
    return "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  }
  return "/usr/bin/google-chrome";
}

async function resolverArgs(): Promise<string[]> {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const chromium = (await import("@sparticuz/chromium")).default;
    return chromium.args;
  }
  return ["--disable-blink-features=AutomationControlled"];
}

interface ChromiumWithPlugins {
  use: (plugin: unknown) => void;
  launch: (opts: Record<string, unknown>) => Promise<Browser>;
  plugins: {
    setDependencyResolution: (path: string, mod: unknown) => void;
  };
}

async function preloadStealthEvasions(chromium: ChromiumWithPlugins): Promise<void> {
  // Imports estáticos (não dinâmicos) — o Turbopack e o file tracer seguem
  // string literal e copiam os 16 módulos para o bundle serverless.
  const evasions = await Promise.all([
    import("puppeteer-extra-plugin-stealth/evasions/chrome.app"),
    import("puppeteer-extra-plugin-stealth/evasions/chrome.csi"),
    import("puppeteer-extra-plugin-stealth/evasions/chrome.loadTimes"),
    import("puppeteer-extra-plugin-stealth/evasions/chrome.runtime"),
    import("puppeteer-extra-plugin-stealth/evasions/defaultArgs"),
    import("puppeteer-extra-plugin-stealth/evasions/iframe.contentWindow"),
    import("puppeteer-extra-plugin-stealth/evasions/media.codecs"),
    import("puppeteer-extra-plugin-stealth/evasions/navigator.hardwareConcurrency"),
    import("puppeteer-extra-plugin-stealth/evasions/navigator.languages"),
    import("puppeteer-extra-plugin-stealth/evasions/navigator.permissions"),
    import("puppeteer-extra-plugin-stealth/evasions/navigator.plugins"),
    import("puppeteer-extra-plugin-stealth/evasions/navigator.webdriver"),
    import("puppeteer-extra-plugin-stealth/evasions/sourceurl"),
    import("puppeteer-extra-plugin-stealth/evasions/user-agent-override"),
    import("puppeteer-extra-plugin-stealth/evasions/webgl.vendor"),
    import("puppeteer-extra-plugin-stealth/evasions/window.outerdimensions"),
  ]);

  const names = [
    "chrome.app",
    "chrome.csi",
    "chrome.loadTimes",
    "chrome.runtime",
    "defaultArgs",
    "iframe.contentWindow",
    "media.codecs",
    "navigator.hardwareConcurrency",
    "navigator.languages",
    "navigator.permissions",
    "navigator.plugins",
    "navigator.webdriver",
    "sourceurl",
    "user-agent-override",
    "webgl.vendor",
    "window.outerdimensions",
  ];

  evasions.forEach((mod, i) => {
    const resolved = (mod as { default?: unknown }).default ?? mod;
    chromium.plugins.setDependencyResolution(`stealth/evasions/${names[i]}`, resolved);
  });
}
