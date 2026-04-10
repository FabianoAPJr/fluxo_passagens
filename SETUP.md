# Fluxo Passagens — Guia de Setup

Sistema de solicitação e aprovação de passagens aéreas corporativas.

---

## Passo 1 — Criar banco de dados no Neon

1. Acesse [neon.tech](https://neon.tech) e crie uma conta gratuita
2. Clique em **"Create a project"**
3. Escolha a região mais próxima (ex: `São Paulo`)
4. Nome do projeto: `fluxo-passagens`
5. Copie a **connection string** exibida (formato: `postgresql://user:pass@host/db?sslmode=require`)
6. Cole no `.env` como `DATABASE_URL`

---

## Passo 2 — Registrar o app no Azure AD

1. Acesse [portal.azure.com](https://portal.azure.com)
2. Vá em **Azure Active Directory → App registrations → New registration**
3. Preencha:
   - **Name**: `Fluxo Passagens`
   - **Supported account types**: `Accounts in this organizational directory only (Single tenant)`
   - **Redirect URI**:
     - Platform: `Web`
     - URI: `http://localhost:3000/api/auth/callback/azure-ad`
4. Clique em **Register**
5. Na página do app registrado, copie:
   - **Application (client) ID** → cole em `AZURE_AD_CLIENT_ID`
   - **Directory (tenant) ID** → cole em `AZURE_AD_TENANT_ID`
6. Vá em **Certificates & secrets → New client secret**
   - Description: `fluxo-passagens-secret`
   - Expires: `24 months`
   - Copie o **Value** → cole em `AZURE_AD_CLIENT_SECRET`

### Permissões necessárias

1. Vá em **API permissions → Add a permission → Microsoft Graph**
2. Escolha **Delegated permissions** e adicione:
   - `openid`
   - `profile`
   - `email`
   - `User.Read`
3. Clique em **Grant admin consent** (se disponível)

### Redirect URI para produção

Após o deploy no Vercel, adicione uma segunda Redirect URI:
```
https://seu-app.vercel.app/api/auth/callback/azure-ad
```

---

## Passo 3 — Preencher o .env

Copie `.env.example` para `.env` e preencha com as credenciais obtidas:

```bash
cp .env.example .env
```

Gere o `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

---

## Passo 4 — Criar as tabelas no banco

```bash
npm run db:migrate
```

Isso executa `npx prisma migrate deploy` e gera o client do Prisma.

Para resetar em desenvolvimento:
```bash
npx prisma migrate reset
```

---

## Passo 5 — Primeiro login e promoção a Master

1. Rode `npm run dev` e acesse `http://localhost:3000`
2. Clique em **"Entrar com Microsoft"** e faça login com sua conta corporativa
3. Após o login, execute no banco (via Neon Console → SQL Editor):

```sql
UPDATE "User" SET role = 'MASTER' WHERE email = 'fabiano.amorim@somuscapital.com.br';
```

4. Faça logout e login novamente para a sessão carregar o papel MASTER
5. Agora você tem acesso ao painel Admin para gerenciar usuários e solicitações

---

## Passo 6 — Deploy no Vercel

1. Acesse [vercel.com](https://vercel.com) e importe o repositório do GitHub
2. Configure as **Environment Variables** no painel do Vercel:
   - `DATABASE_URL` (a mesma connection string do Neon)
   - `AZURE_AD_CLIENT_ID`
   - `AZURE_AD_CLIENT_SECRET`
   - `AZURE_AD_TENANT_ID`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` → `https://seu-app.vercel.app`
3. Clique em **Deploy**
4. Após o deploy, adicione a Redirect URI de produção no Azure AD (veja Passo 2)

---

## Scripts disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Servidor de produção |
| `npm run db:migrate` | Executa migrações do Prisma |
| `npm run db:studio` | Abre Prisma Studio (GUI do banco) |
| `npm run db:push` | Sincroniza schema sem criar migração |

---

## Papéis do sistema

| Papel | Permissões |
|-------|-----------|
| **USER** | Criar e ver suas próprias solicitações |
| **ADMIN** | Tudo de USER + aprovar/rejeitar solicitações |
| **MASTER** | Tudo de ADMIN + gerenciar papéis de usuários |
