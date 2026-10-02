# Plutão Shop

Loja online de contas de Free Fire. Cada conta é única: o admin publica-a com os dados de acesso, o cliente compra-a e, depois de o pagamento ser confirmado, vê o login e a senha na sua área de cliente.

- Regras de negócio: [plano.md](plano.md)
- Estado do projeto e próximos passos: [ROADMAP.md](ROADMAP.md)

## Tecnologia

| Parte | Ferramenta |
|---|---|
| Site e servidor | TanStack Start (React 19, TypeScript, Tailwind CSS) |
| Base de dados | PostgreSQL no Neon, com Drizzle ORM |
| Pagamentos | Stripe Checkout e webhooks |
| Imagens | Cloudinary (upload direto do browser, assinado pelo servidor) |
| Alojamento | Vercel |

## Instalar e correr

Precisa de Node.js 22 ou mais recente.

```sh
npm install            # ou: npx bun install (o lockfile do projeto é bun.lock)
cp .env.example .env   # preencher as variáveis (ver abaixo)
npm run db:migrate     # cria/atualiza as tabelas
npm run admin:create -- o-seu@email.pt   # cria o administrador (pede a senha)
npm run dev            # http://localhost:8080
```

## Variáveis de ambiente

Os valores ficam no `.env`, que **nunca** vai para o git. O modelo está em [.env.example](.env.example).

| Variável | Para quê |
|---|---|
| `APP_URL` | Endereço do site (links de regresso do pagamento) |
| `DATABASE_URL` | Ligação ao Neon (pooled), usada pela app |
| `DATABASE_URL_UNPOOLED` | Ligação direta ao Neon, usada pelas migrações |
| `SESSION_SECRET` | Segredo das sessões (`openssl rand -base64 32`) |
| `CREDENTIALS_ENCRYPTION_KEY` | Chave AES-256 que cifra os dados das contas (32 bytes em base64). **Se se perder, os dados guardados ficam irrecuperáveis.** |
| `STRIPE_SECRET_KEY` | Chave secreta do Stripe |
| `STRIPE_WEBHOOK_SECRET` | Segredo do endpoint `/api/stripe/webhook` |
| `CLOUDINARY_*` | Nome, chave e segredo do Cloudinary |
| `RESEND_API_KEY`, `EMAIL_FROM` | Emails (ainda não usados) |

Variáveis com o prefixo `VITE_` vão para o browser: nunca lá pôr segredos.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Versão de produção |
| `npm run typecheck` / `npm run lint` | Verificar tipos e estilo |
| `npm run db:generate` | Gerar uma migração depois de mudar `src/server/db/schema.ts` |
| `npm run db:migrate` | Aplicar as migrações |
| `npm run db:studio` | Ver a base de dados no browser |
| `npm run db:seed` | Contas de exemplo (só desenvolvimento; bloqueado em produção) |
| `npm run admin:create -- email` | Criar um admin ou promover um utilizador existente |
| `npm run brand:upload` | Enviar o ícone da loja para o Cloudinary (página de pagamento) |

## Organização do código

```
src/
  routes/          páginas (loja, área de cliente, admin) e rotas de API
  components/      componentes de interface
  functions/       server functions chamadas pelas páginas
  server/          código só do servidor (nunca vai para o browser)
    auth/          sessões, senhas (Argon2), limites de tentativas, guardas
    db/            esquema, ligação, seed
    payments/      checkout, webhook e reembolsos do Stripe
    orders/        compras do cliente e entrega das credenciais
    admin/         painel de admin
    support/       tickets de suporte
    crypto/        cifra AES-256-GCM das credenciais
  lib/             tipos e regras partilhados (cliente + servidor)
drizzle/           migrações SQL
```

## Segurança (resumo)

- Preços, estado das contas e permissões são sempre verificados no servidor.
- O pagamento só é confirmado com dados vindos do Stripe (webhook assinado ou consulta servidor→Stripe), nunca pelo regresso do browser.
- Cada conta só pode ter um pedido pago (garantido por um índice único na base de dados); as reservas são atómicas.
- Os dados das contas ficam cifrados e só são entregues ao dono do pedido pago (`/api/orders/:id/credentials`), com registo de cada acesso.
- As funções de admin verificam o papel `ADMIN` no servidor.

## Antes do lançamento

Ver a Fase 8 do [ROADMAP.md](ROADMAP.md): dados legais em `src/lib/legal.ts`, webhook de produção, rotação das chaves e deploy na Vercel.
