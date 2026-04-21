import type { Browser, BrowserContext } from "playwright-core";

// Configurações de browser para ambiente Vercel serverless. Em desenvolvimento
// local cai no Chrome do sistema (se existir) ou no playwright-core com
// CHROME_EXECUTABLE_PATH definido em .env.local.

export async function criarBrowser(): Promise<{ browser: Browser; context: BrowserContext }> {
  const { chromium } = await import("playwright-core");

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
