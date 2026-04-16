# Guia de Configuração — Passagens Aéreas SOMUS

## Pré-requisitos

- Node.js 18+
- Conta no [Neon](https://neon.tech) (banco de dados PostgreSQL gratuito)
- Conta no [Vercel](https://vercel.com) (deploy gratuito)
- Acesso ao [portal Azure](https://portal.azure.com) com conta `@somuscapital.com.br`

---

## 1. Banco de dados (Neon)

1. Acesse [neon.tech](https://neon.tech) e crie uma conta
2. Crie um novo projeto (ex: `passagens-aereas`)
3. Na aba **Connection Details**, copie a **Connection string** (formato `postgresql://...`)
4. Cole no `.env` como `DATABASE_URL`

---

## 2. Azure AD — Login Microsoft

### 2.1 Registrar o aplicativo

1. Acesse [portal.azure.com](https://portal.azure.com)
2. Vá em **Microsoft Entra ID → App registrations → New registration**
3. Preencha:
   - **Name**: `Passagens Aéreas SOMUS`
   - **Supported account types**: `Accounts in this organizational directory only`
   - **Redirect URI**: Web → `http://localhost:3000/api/auth/callback/azure-ad`
4. Clique em **Register**

### 2.2 Copiar as credenciais

Na página do app registrado:
- **Application (client) ID** → `AZURE_AD_CLIENT_ID`
- **Directory (tenant) ID** → `AZURE_AD_TENANT_ID`

### 2.3 Criar o Client Secret

1. Vá em **Certificates & secrets → New client secret**
2. Coloque uma descrição (ex: `passagens-prod`) e validade de 24 meses
3. Copie o **Value** imediatamente → `AZURE_AD_CLIENT_SECRET`

### 2.4 Adicionar redirect URI de produção (antes do deploy)

1. Vá em **Authentication → Add a platform → Web**
2. Adicione: `https://SEU-APP.vercel.app/api/auth/callback/azure-ad`

---

## 3. E-mail (Office 365)

O app envia notificações via SMTP do Office 365.

1. Entre na conta `fabiano.amorim@somuscapital.com.br` no **portal.office.com**
2. Vá em **Configurações → Segurança → Senhas de aplicativo**
3. Crie uma senha de app (ex: `passagens-aereas`)
4. Use esta senha no `.env` como `EMAIL_PASSWORD`

> Se a conta não tiver "Autenticação Multifator" ativa, pode usar a senha normal temporariamente, mas a App Password é mais segura.

---

## 4. Configurar o `.env`

Copie `.env.example` para `.env` e preencha todos os campos:

```bash
cp .env.example .env
```

---

## 5. Executar as migrations do banco

Com o `.env` configurado:

```bash
npm run db:migrate
```

---

## 6. Definir o primeiro usuário como Master

Após fazer o primeiro login no app com sua conta Microsoft, execute no banco:

```sql
UPDATE "User" SET role = 'MASTER' WHERE email = 'fabiano.amorim@somuscapital.com.br';
```

Você pode fazer isso pelo console SQL do Neon ou via Prisma Studio:

```bash
npm run db:studio
```

---

## 7. Rodar localmente

```bash
npm run dev
```

Acesse: `http://localhost:3000`

---

## 8. Deploy no Vercel

1. Faça push do projeto para um repositório no GitHub
2. Acesse [vercel.com](https://vercel.com) e importe o repositório
3. Em **Environment Variables**, adicione todas as variáveis do `.env`
4. Altere `NEXTAUTH_URL` para a URL do Vercel (ex: `https://passagens.vercel.app`)
5. Atualize também a **Redirect URI** no Azure AD com a URL de produção
6. Clique em **Deploy**

---

## Scripts disponíveis

```bash
npm run dev          # Inicia o servidor de desenvolvimento
npm run build        # Build de produção
npm run db:generate  # Gera o Prisma Client
npm run db:migrate   # Aplica as migrations no banco
npm run db:studio    # Abre o Prisma Studio (interface visual do banco)
```

---

## Fluxo de uso

```
Colaborador → Gestor      → Financeiro    → Colaborador
  (solicita)   (aprova ou    (insere a      (aceita ou
               nega)         cotação)       recusa)
```

Cada etapa dispara um e-mail de notificação para os envolvidos.
