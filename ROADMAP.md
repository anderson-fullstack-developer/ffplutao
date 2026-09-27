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

## Fase 2 — Autenticação
- [ ] 9. Registo e login (email + password com hash Argon2)
- [ ] 10. Sessão em cookie httpOnly seguro, logout
- [ ] 11. Papéis `USER` / `ADMIN`; `/admin` e `/dashboard` protegidos **no servidor**
- [ ] 12. Substituir a sessão falsa (`src/lib/session.tsx`) pela real

**Teste:** criar conta, fazer login; um USER a tentar abrir `/admin` é bloqueado.

## Fase 3 — Catálogo real
- [ ] 13. Páginas passam a ler da base de dados em vez de `src/mock/`
- [ ] 14. Filtros, pesquisa e ordenação feitos no servidor
- [ ] 15. API pública **nunca** devolve credenciais (tipos públicos e privados separados)

**Teste:** o catálogo mostra os dados do seed.

## Fase 4 — Painel do admin
- [ ] 16. Criar, editar, publicar e desativar contas; credenciais encriptadas com AES-256-GCM
- [ ] 17. Admin só escolhe `DRAFT` / `AVAILABLE` / `DISABLED` — `RESERVED` e `SOLD` são automáticos
- [ ] 18. Upload de screenshots para Cloudinary (principal, ordem, exclusão) — *utilizador: chaves Cloudinary*
- [ ] 19. Listas reais de pedidos e clientes

**Teste:** criar uma conta no admin e ela aparece no catálogo.

## Fase 5 — Compra com Stripe (fase mais crítica)
- [ ] 20. Conta Stripe em modo teste + chaves; confirmar que o Stripe aceita este tipo de negócio — *utilizador*
- [ ] 21. "Comprar agora":
  1. o servidor valida (conta existe, está `AVAILABLE`, preço vem da base de dados)
  2. reserva a conta de forma atómica durante 30 min (mínimo exigido pelo Stripe Checkout)
  3. cria a order `PENDING`
  4. cria a sessão do Stripe Checkout
- [ ] 22. Webhook do Stripe:
  - valida a assinatura
  - é idempotente (tabela `stripe_events`)
  - marca a order `PAID` e a conta `SOLD` numa transação
- [ ] 23. Reservas expiradas → `AVAILABLE`; pagamento que chegue tarde → reembolso automático
- [ ] 24. `/compra/sucesso` mostra "A confirmar pagamento…" até o webhook confirmar

**Teste:** comprar com o cartão `4242 4242 4242 4242`; duas pessoas a tentar a mesma conta ao mesmo tempo → só uma consegue.

## Fase 6 — Entrega das credenciais
- [ ] 25. "Minhas Compras" mostra só os pedidos do próprio utilizador
- [ ] 26. `GET /orders/:id/credentials`: verifica sessão → dono → `PAID` → `SOLD`; desencripta; regista em `credential_access_logs`
- [ ] 27. Tirar `credentials` do tipo `Order` no frontend — só chegam ao clicar "Revelar dados"

**Teste:** o utilizador B pede as credenciais do pedido do utilizador A → **403**.

## Fase 7 — Suporte e extras
- [ ] 28. Tickets de suporte (ligação opcional a um pedido)
- [ ] 29. Emails transacionais (Resend) — **nunca** enviar credenciais por email
- [ ] 30. Recuperação de password

## Fase 8 — Produção
- [ ] 31. Revisão de segurança: rate limit no login, cabeçalhos de segurança, revisão do código
- [ ] 32. Rodar as chaves partilhadas em chat: password do Neon, `sk_live_` do Stripe, API secret do Cloudinary
- [ ] 33. Deploy e teste completo do fluxo em produção

---

## Ajustes de interface (feitos ao ligar cada fase)
- [ ] Formulário do admin: trocar "Status: Disponível/Reservada/Vendida" por **Rascunho / Publicada / Desativada** (Fase 4)
- [ ] Checkout: remover os campos nome/email/país; deixar só o resumo e o botão **"Pagar com Stripe"** (Fase 5)
- [ ] `/compra/sucesso`: estado **"A confirmar pagamento…"** antes de "Compra concluída" (Fase 5)
- [ ] Badges: acrescentar **Rascunho**, **Desativada**, **Falhado** (Fase 3)
- [ ] Remover o botão "Continuar com Google" do login, até haver decisão sobre login social (Fase 2)
- [ ] Tirar `credentials` do tipo `Order` do frontend (Fase 6)
