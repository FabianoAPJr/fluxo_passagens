# flight-scraper

Scraper oportunístico da Decolar. Executa em uma API route Next.js e retorna
ofertas estruturadas quando tem sucesso.

## Contrato explícito

Esta feature **vai quebrar periodicamente**. Não é bug crítico. O caminho
principal de cotação continua sendo os deep-links em `src/lib/flight-search/launchers.ts` —
o scraper é um atalho quando funciona.

## Estado atual (2026-04-21)

- **Desenvolvimento local (`headless: false`)**: funciona. Pipeline completo
  retorna ~10 ofertas estruturadas em ~22s para rotas domésticas (validado
  GIG → CGH, ida-e-volta 45 dias à frente).
- **Produção (Vercel, `headless: true`)**: a Decolar bloqueia no nível do
  CDN via bot detection. Página é servida em branco — zero cards renderizados,
  body vazio. Stealth patches mínimos (navigator.webdriver, plugins fake,
  chrome.runtime) não são suficientes.
- **Fallback para deep-links é o caminho ativo em produção.** A API route
  sempre retorna `fallbackDeepLink: true` e a UI cai graciosamente para os
  botões manuais de Google Flights / Kayak / Skyscanner logo abaixo.

### Por que a feature permanece instalada

1. **Utilidade local**: o scraper em modo headed (`FLIGHT_SCRAPER_HEADED=1`)
   serve para debug, validação manual de seletores e estudo pontual de
   preços pelo time de operações.
2. **Arquitetura pronta para Amadeus**: a separação `lib/flight-scraper/`
   (types, normalizador, API route, UI de cards) é genérica. Trocar Decolar
   por Amadeus Self-Service API é substituir `decolar.ts` por um
   `amadeus.ts` que implementa a mesma assinatura.
3. **Caminho barato ainda viável**: adicionar `playwright-extra` + stealth
   plugin (ver "Caminhos futuros" abaixo) pode destravar produção com custo
   de uma PR pequena — decisão adiada intencionalmente.

## Caminhos futuros (avaliados)

| Caminho | Status | Racional |
|---|---|---|
| **Amadeus Self-Service API** | Preferido, aprovação pendente | API oficial, sem anti-bot, cobertura global, tier gratuito suficiente para volume atual (~dezenas/ano). Substitui o provider Decolar sem mexer na API route ou na UI. |
| **`playwright-extra` + stealth plugin** | Postergado, viável | Restrição atual proíbe deps novas. Estimativa: 1 dep (`puppeteer-extra-plugin-stealth`), ~30min de trabalho. Primeiro próximo passo se Amadeus demorar. |
| **ScrapingBee / Browserless / Apify** | Descartado | Custo mínimo ~US$30–100/mês para volume baixo (dezenas de consultas/ano). Desproporcional — equivalente a pagar assinatura anual para usar um par de vezes. |
| **Proxy residencial + rotação** | Descartado | Não endereça o problema raiz (fingerprint do headless), só o IP. A Decolar detecta via fingerprint do browser, não da origem da conexão. |
| **Trocar alvo (123milhas / MaxMilhas / Viajanet)** | Descartado | Nenhum oferece cobertura equivalente ao Decolar para rotas nacionais/internacionais misturadas. MaxMilhas foca em milhas; 123milhas tem disponibilidade inconsistente; Viajanet tem a mesma classe de anti-bot. |

## Como funciona

1. API route `/api/requests/[id]/cotar-automatico` (POST) recebe chamada do cotador
2. Monta URL canônica de resultados da Decolar a partir da `TravelRequest`
3. Sobe um Chromium headless (via `@sparticuz/chromium` + `playwright-core`)
4. Fecha o modal de login que a Decolar abre automaticamente
5. Extrai até 10 cards, normaliza, ordena por preço asc
6. Retorna `ResultadoScrape` estruturado — **nunca lança exceção**

## Quando quebrar, o que verificar

Sintoma comum: API retorna `sucesso: false`. Passos para diagnosticar:

1. **Abrir a Decolar manualmente**. Acessar uma URL de resultado real (ex.
   `https://www.decolar.com/shop/flights/results/roundtrip/GIG/CGH/2026-06-05/2026-06-10/1/0/0`)
   num browser normal. Confirmar se cards ainda aparecem e se o layout geral
   parece familiar. Se a Decolar mudou radicalmente (ex. novo formato de URL,
   nova estrutura de cards), todo o scraper precisa ser revalidado.

2. **Rodar o scraper local em modo headed** para ver o que ele vê:

   ```bash
   npx tsx scripts/discover-decolar-selectors.ts
   ```

   O script abre o Chrome, navega para a URL de resultados, tenta identificar
   os containers e imprime amostras dos dados que conseguiu extrair.

3. **Atualizar seletores em `constants.ts`**. Se os nomes das tags Angular
   (`itinerary-optimized`, `flights-price`) ou os atributos `data-sfa-id`
   mudarem, este é o arquivo a editar. Sempre **renovar o comentário de data**
   no topo do arquivo quando atualizar — o `grep "Validados manualmente"`
   mostra quão antiga está a última validação.

4. **Verificar CAPTCHA / bloqueio**. A Decolar usa anti-bot (Cloudflare,
   Datadome ou similar). Se o scraper começar a ser bloqueado consistentemente,
   considere: (a) reduzir volume (nosso uso é ~dezenas/ano, não deveria
   disparar nada); (b) ajustar user-agent/fingerprint em `browser.ts`;
   (c) aceitar a quebra e voltar exclusivamente aos deep-links por um tempo.

## Limitações conhecidas

- **Sem link de compra direta**: a Decolar não expõe anchors de compra nos
  cards — o clique dispara JS interno. `linkCompra` aponta para a URL da
  lista de resultados (fallback honesto — o usuário continua a jornada no
  próprio site).

- **Preço é do pacote completo ida+volta**, apesar do rótulo "Final ida 1"
  que a Decolar exibe. Essa é a forma como o site apresenta em seu layout
  `multipleoneway` (redirect automático de `roundtrip`). Validado 2026-04-21.

- **Sem cache**. Feature explicitamente sem cache/agendamento/warmup — volume
  baixo (dezenas/ano, concentradas em Jan/Jun).

- **Só ida-e-volta**. `TravelRequest` do schema atual sempre tem
  `returnDate` obrigatória, então o scraper assume ida-e-volta.

## Ambiente

- **Local (dev)**: usa Chrome instalado no sistema. Caminho default é o do
  Windows (`C:\Program Files\Google\Chrome\Application\chrome.exe`), ou
  configurável via `CHROME_EXECUTABLE_PATH` no `.env.local`.
- **Vercel (prod)**: detecta `process.env.VERCEL` e usa `@sparticuz/chromium`.

## Flags de debug

- `FLIGHT_SCRAPER_HEADED=1` — força modo headed (navegador visível). Útil
  para debugar seletores ou validar que o pipeline está correto. Não tem
  efeito em Vercel (não há display).
- `HEADLESS_DIAG=1` (no `scripts/smoke-test-scraper.ts`) — tira screenshot
  e salva HTML da página para diagnosticar bloqueios silenciosos.

## Build Vercel

`playwright-core` e `@sparticuz/chromium` estão na allowlist automática de
`serverExternalPackages` do Next.js 16 — o bundler deixa eles como `require`
nativo em vez de tentar empacotar. Portanto **não é preciso adicionar nada em
`next.config.ts`**. Se em alguma atualização futura a allowlist mudar, adicionar
explicitamente:

```ts
// next.config.ts
const nextConfig: NextConfig = {
  serverExternalPackages: ["@sparticuz/chromium", "playwright-core"],
};
```

## Logs

Cada execução emite uma linha JSON estruturada no stdout (capturada
automaticamente pela Vercel):

```json
{"scope":"flight-scraper","provider":"decolar","timestamp":"...","origem":"GIG","destino":"CGH","sucesso":true,"duracaoMs":28451,"ofertasCount":10}
```
