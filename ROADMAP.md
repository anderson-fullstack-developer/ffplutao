# Plutão Shop — Roadmap de implementação

> Regras de negócio: ver [plano.md](plano.md).
> Desenvolvimento 100% local, sem ligação ao Lovable — Claude Code trata do backend **e** do frontend.
> Marcar `[x]` à medida que cada passo fica concluído.

---

## Fase 0 — Preparação
- [x] 1. Desenvolver localmente (sem sincronização com o Lovable); git local para histórico
- [x] 2. Produção na **Vercel** (plano Pro quando a loja começar a vender; runtime Node → Argon2 sem limites de CPU)
- [x] 3. `.env` / `.env.example` criados, `.env` no `.gitignore`
- [x] 4. Neon, Cloudinary e Stripe ligados e testados

## Fase 1 — Base de dados ✅
- [x] 5. Drizzle ORM + driver do Neon (`src/server/db/`), comandos `npm run db:*`
- [x] 6. Tabelas: `users`, `accounts`, `account_images`, `account_credentials` (encriptadas), `orders`, `stripe_events`, `credential_access_logs`, `support_tickets`
- [x] 7. Regras na base de dados (verificadas com testes que tentam violá-las):
  - índices únicos parciais → nunca 2 orders `PAID` nem 2 `PENDING` para a mesma conta
  - `RESERVED` exige prazo; `SOLD` exige data de venda; `PAID` exige data de pagamento
  - email único sem distinguir maiúsculas; evento Stripe processado uma só vez
  - encriptação AES-256-GCM com o id da conta como AAD (`src/server/crypto/credentials.ts`)
- [x] 8. Migration `drizzle/0000_init.sql` aplicada; seed com 15 contas (13 disponíveis, 1 desativada, 1 rascunho), imagens no Cloudinary (`plutao-shop/seed`)
  - O utilizador ADMIN passa para a Fase 2 (precisa do hash Argon2)

**Teste:** as tabelas aparecem no painel do Neon.

## Fase 2 — Autenticação ✅
- [x] 9. Registo e login (email + senha com hash Argon2id); alterar nome e senha em "Minha conta"
- [x] 10. Sessão em cookie HttpOnly (token opaco, BD guarda só o SHA-256), logout, troca de senha termina as outras sessões; limite de tentativas no Postgres
- [x] 11. Papéis `USER` / `ADMIN`; `/admin` (404 para clientes), `/dashboard` e `/checkout` protegidos no servidor; `npm run admin:create -- email`
- [x] 12. Sessão falsa substituída pela real (navbar, dashboard, perfil, admin)

**Verificado:** 36 testes ponta a ponta (registo, login, logout, cookie roubado, CSRF, limite de tentativas, troca de senha, acesso admin).

**Teste:** criar conta, fazer login; um USER a tentar abrir `/admin` é bloqueado.

## Fase 3 — Catálogo real ✅
- [x] 13. Início, catálogo, detalhe e checkout leem da base de dados (admin e dashboard continuam mock até às Fases 4 e 6)
- [x] 14. Filtros, pesquisa, ordenação e paginação no servidor; filtros guardados no URL (links partilháveis)
- [x] 15. API pública com lista explícita de colunas (`src/server/catalog/queries.ts`); rascunho/desativada → 404; vendida sai do catálogo mas o link abre; reserva expirada conta como disponível; imagens otimizadas pelo Cloudinary

**Verificado:** 37 testes (filtros comparados com contagens diretas na BD, pesquisa com `%`/SQL malicioso, estados reservada/expirada/vendida, nenhum dado privado nas respostas nem no HTML).

**Teste:** o catálogo mostra os dados do seed.

## Fase 4 — Painel do admin ✅
- [x] 16. Criar, editar, publicar, desativar e excluir contas; credenciais encriptadas; na edição as credenciais não são enviadas ao formulário (botão "ver credenciais atuais")
- [x] 17. Admin só escolhe `DRAFT` / `AVAILABLE` / `DISABLED`; conta reservada/vendida tem estado e preço bloqueados (linha bloqueada com `FOR UPDATE`); publicar exige imagem + credenciais; excluir só sem pedidos
- [x] 18. Upload direto browser → Cloudinary com assinatura do servidor (pasta e formatos fixos); só aceita imagens do nosso Cloudinary; imagens removidas são apagadas no Cloudinary (nunca as do seed)
- [x] 19. Dashboard (vendas, pedidos, stock, clientes, gráfico 30 dias), pedidos e clientes com dados reais; todas as funções de admin verificam o papel no servidor

**Verificado:** 46 testes (acesso negado a anónimo/cliente em todas as funções, upload real e assinatura adulterada, regras de publicação, bloqueios de conta reservada, exclusão com/sem pedidos, imagem apagada no Cloudinary).

**Teste:** criar uma conta no admin e ela aparece no catálogo.

## Fase 5 — Compra com Stripe (fase mais crítica) ✅
- [x] 20. Chaves Stripe (LIVE, por decisão do utilizador) + Stripe CLI instalado. ⚠️ Confirmar com o Stripe que aceita este tipo de negócio — *utilizador*
- [x] 21. "Comprar agora" (`src/server/payments/checkout.ts`):
  1. o servidor valida (conta existe, está `AVAILABLE`, preço vem da base de dados)
  2. reserva a conta de forma atómica (`SELECT … FOR UPDATE`): sessão Stripe 31 min + 5 min de margem; 1 checkout ativo por cliente; clicar outra vez reutiliza a mesma sessão
  3. cria a order `PENDING`
  4. cria a sessão do Stripe Checkout
- [x] 22. Webhook `POST /api/stripe/webhook` (`src/server/payments/webhook.ts`):
  - valida a assinatura
  - é idempotente (tabela `stripe_events`)
  - marca a order `PAID` e a conta `SOLD` numa transação
- [x] 23. Reservas expiradas → `AVAILABLE` (webhook `checkout.session.expired` ou no checkout seguinte, que expira a sessão antiga no Stripe); pagamento que chegue tarde → reembolso automático (se o reembolso falhar, o pedido fica `FAILED` para o admin tratar); reembolso feito no painel → `REFUNDED`
- [x] 24. `/compra/sucesso` mostra "A confirmar pagamento…" e pergunta ao servidor, que confirma com o Stripe (webhook ou consulta servidor→Stripe com a chave secreta — nunca pelo redirect); `/compra/cancelada` expira a sessão e liberta a conta

**Verificado:** 34 testes com a API real do Stripe (sessões criadas/expiradas, sem cobranças) + webhooks assinados: assinatura errada, evento duplicado, sessão trocada, pagamento tardio, cancelamento, expiração, reembolso, e **6 clientes em simultâneo → só 1 reserva**.

**Falta (antes do lançamento):** uma compra real de ponta a ponta com cartão; em produção criar o endpoint do webhook no painel Stripe (eventos: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`) e pôr o `whsec_` na Vercel. Localmente o `STRIPE_WEBHOOK_SECRET` é um segredo de desenvolvimento.

## Extra — Carrinho e navegação ✅
- [x] Barra de navegação nova: faixa de confiança, menu "Contas" (preço/servidor), pesquisa, carrinho com contador, "Minhas compras"
- [x] Carrinho no browser (até 10 contas; não reserva nada até "Pagar"; sobrevive ao login/registo)
- [x] Um pagamento para várias contas: 1 pedido por conta com o mesmo `checkout_group_id` e a mesma sessão; reserva tudo-ou-nada com bloqueios por ordem fixa (sem deadlocks)
- [x] Conta vendida a outra pessoa antes da confirmação → só essa é reembolsada (reembolso parcial); valor adulterado → nada entregue
- [x] 35 testes com a API real do Stripe, incluindo 6 carrinhos sobrepostos em simultâneo

## Fase 6 — Entrega das credenciais ✅
- [x] 25. "Minhas compras" e "Visão geral" com dados reais, só do próprio utilizador (checkouts cancelados não aparecem)
- [x] 26. `GET /api/orders/:id/credentials`: 401 sem sessão · 404 inexistente · 403 de outra pessoa · 409 não pago/não vendido; desencripta; regista em `credential_access_logs` (IP + browser); `Cache-Control: no-store`. Admin vê "Dados vistos pelo cliente: N×"
- [x] 27. Dados de demonstração (`src/mock`, `src/types`) apagados; a senha nunca vai no HTML — só ao clicar "Revelar dados"

**Verificado:** 23 testes da viagem completa (admin publica → cliente compra carrinho → pagamento confirmado → dados exatos entregues) + ataques (403/401/404, HTML sem senha).

**Teste:** o utilizador B pede as credenciais do pedido do utilizador A → **403**.

## Fase 7 — Suporte e extras
- [x] 28. Tickets de suporte (adiantado): conversa cliente ↔ equipa, ligação a um pedido do próprio cliente, estados Aberto/Em andamento/Fechado (reabre se o cliente responder), caixa "Tickets" no admin com contador de "por responder", limite de envios. 33 testes (acesso, ciclo de estados, XSS, limite).
- [ ] 29. Emails transacionais (Resend) — **nunca** enviar credenciais por email
- [ ] 30. Recuperação de password

## Extra — Páginas legais e FAQ ✅
- [x] FAQ, Termos e Condições, Privacidade (RGPD) e Reembolsos; rodapé sem links partidos; Livro de Reclamações
- [x] Consentimento obrigatório no pagamento (entrega imediata / perda da livre resolução), exigido pelo servidor e gravado em `orders.terms_accepted_at`

## Fase 8 — Produção
- [ ] 31. Revisão de segurança: rate limit no login, cabeçalhos de segurança, revisão do código
- [ ] 32. Rodar as chaves partilhadas em chat: password do Neon, `sk_live_` do Stripe, API secret do Cloudinary
- [ ] 33. Deploy e teste completo do fluxo em produção
- [ ] 34. Preencher os dados legais em `src/lib/legal.ts` (titular, NIF, morada, email) e rever os textos com um jurista

---

## Ajustes de interface (feitos ao ligar cada fase)
- [x] Formulário do admin: trocar "Status: Disponível/Reservada/Vendida" por **Rascunho / Publicada / Desativada** (Fase 4)
- [x] Checkout: remover os campos nome/email/país; deixar só o resumo e o botão **"Pagar com Stripe"** (Fase 5)
- [x] `/compra/sucesso`: estado **"A confirmar pagamento…"** antes de "Compra concluída" (Fase 5)
- [x] Badges: acrescentar **Rascunho**, **Desativada**, **Falhado** (Fase 3)
- [x] Remover o botão "Continuar com Google" do login, até haver decisão sobre login social (Fase 2)
- [x] Tirar `credentials` do tipo `Order` do frontend (Fase 6)
