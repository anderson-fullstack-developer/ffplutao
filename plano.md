# CONTEXTO E OBJETIVO DO PROJETO

O projeto chama-se PLUTÃO SHOP.

A Plutão Shop é uma plataforma de e-commerce de produtos digitais focada inicialmente em anúncios de contas de jogos, principalmente contas de Free Fire.

A interface frontend já será criada separadamente.

Este documento serve para explicar o funcionamento esperado do produto, as regras de negócio e os fluxos principais da aplicação.

O objetivo principal é permitir que o administrador publique uma conta disponível para venda e que um utilizador registado consiga visualizar essa conta, efetuar a compra e, somente depois de o pagamento ser confirmado pelo sistema, ter acesso aos dados privados da conta adquirida.

==================================================
VISÃO GERAL
==================================================

A aplicação possui dois tipos principais de utilizadores:

1. CLIENTE
2. ADMINISTRADOR

O administrador controla o inventário da loja.

O cliente navega pelo catálogo e compra uma das contas disponíveis.

Cada produto representa uma conta de jogo única.

Diferentemente de um e-commerce tradicional, normalmente existe apenas uma unidade de cada conta.

Portanto:

uma conta disponível pode ser comprada apenas uma vez.

Depois da confirmação da compra, aquela conta deixa de estar disponível para outros clientes.

==================================================
EXEMPLO DO PRODUTO
==================================================

Um produto pode ser:

Conta Free Fire #128

Informações públicas:

- título
- descrição
- preço
- level
- servidor/região
- quantidade de skins
- quantidade de armas evolutivas
- quantidade de emotes
- passes antigos
- personagens
- ano da conta
- screenshots
- observações
- status

Exemplo:

Conta Free Fire #128

Preço:
€69,90

Level:
74

Servidor:
Brasil

Skins:
350+

Armas evolutivas:
7

Emotes:
15+

Status:
Disponível

Essas informações podem ser visualizadas publicamente.

==================================================
DADOS PRIVADOS DO PRODUTO
==================================================

Cada conta também possui informações privadas.

Exemplo:

- email/login
- senha
- email de recuperação
- instruções adicionais
- outros dados necessários para entregar a conta

Essas informações NUNCA devem fazer parte dos dados públicos do produto.

Um visitante ou cliente que ainda não comprou a conta nunca pode receber esses dados através da API ou frontend.

Os dados privados só podem ser disponibilizados depois que:

1. o utilizador estiver autenticado;
2. existir uma compra daquela conta;
3. aquela compra pertencer ao utilizador autenticado;
4. o pagamento estiver confirmado;
5. o pedido estiver num estado que permita a entrega.

==================================================
FLUXO DO ADMINISTRADOR
==================================================

O administrador entra no painel administrativo.

O administrador pode criar uma nova conta para venda.

Ao adicionar uma conta deverá preencher:

INFORMAÇÕES PÚBLICAS

- título
- descrição
- preço
- level
- servidor
- ano
- skins
- armas evolutivas
- emotes
- personagens
- passes
- características adicionais

IMAGENS

- imagem principal
- screenshots adicionais

DADOS PRIVADOS

- login/email
- senha
- email de recuperação
- instruções

Depois o administrador publica o produto.

O produto passa para:

AVAILABLE

e aparece no catálogo da loja.

==================================================
ESTADOS DE UMA CONTA
==================================================

Uma conta pode possuir estados como:

DRAFT
AVAILABLE
RESERVED
SOLD
DISABLED

DRAFT

Ainda está sendo preparada pelo administrador.

AVAILABLE

Está publicada e pode ser comprada.

RESERVED

Existe um processo de checkout em andamento e temporariamente não deve ser vendida a outro cliente.

SOLD

O pagamento foi confirmado e a conta pertence ao comprador.

DISABLED

O administrador removeu temporariamente a conta do catálogo.

==================================================
FLUXO DO CLIENTE
==================================================

O visitante entra na Plutão Shop.

Ele consegue navegar pelo catálogo.

Pode:

- pesquisar contas
- utilizar filtros
- ordenar resultados
- abrir uma conta
- visualizar screenshots
- visualizar características
- visualizar preço

Nenhum dado privado é mostrado.

Caso queira comprar, deverá estar autenticado.

==================================================
REGISTO E LOGIN
==================================================

O cliente poderá criar uma conta na plataforma.

Dados básicos:

- nome
- email
- senha

Depois poderá fazer login.

Após autenticação terá acesso ao dashboard.

No dashboard poderá visualizar:

- suas compras
- pedidos
- perfil
- suporte
- detalhes das contas adquiridas

==================================================
FLUXO DA COMPRA
==================================================

Exemplo:

Cliente abre:

Conta Free Fire #128

Preço:

€69,90

Clica:

COMPRAR AGORA

Antes de iniciar o pagamento, o backend precisa verificar se:

- o produto existe
- o produto está AVAILABLE
- o preço continua correto
- o utilizador está autenticado

Nunca confiar no preço enviado pelo frontend.

O valor utilizado deve vir diretamente da base de dados.

==================================================
RESERVA DA CONTA
==================================================

Como cada conta é única, precisamos evitar que duas pessoas comprem a mesma conta simultaneamente.

Quando o processo de checkout começar, o sistema poderá reservar temporariamente aquela conta.

Exemplo:

AVAILABLE

↓

RESERVED

A reserva deve possuir uma expiração.

Exemplo:

reservedUntil = 15 minutos

Durante esse período outro cliente não poderá iniciar uma compra daquela mesma conta.

Se o pagamento for confirmado:

RESERVED

↓

SOLD

Se o checkout expirar ou falhar:

RESERVED

↓

AVAILABLE

Essa lógica precisa ser tratada de forma segura contra concorrência.

==================================================
PEDIDO / ORDER
==================================================

Quando o cliente inicia uma compra, criar um Order.

Exemplo:

Order

id
userId
accountId
amount
currency
status
paymentProvider
paymentReference
createdAt
paidAt

Possíveis estados:

PENDING
PAID
CANCELLED
FAILED
REFUNDED

O Order representa a compra.

==================================================
PAGAMENTO
==================================================

Pretendemos utilizar Stripe.

Fluxo esperado:

cliente

↓

clica Comprar agora

↓

backend cria Order PENDING

↓

backend cria Stripe Checkout Session

↓

cliente é enviado para Stripe

↓

cliente realiza pagamento

↓

Stripe envia webhook ao backend

↓

backend valida assinatura do webhook

↓

backend confirma pagamento

↓

Order = PAID

↓

produto = SOLD

↓

produto fica associado ao comprador

==================================================
REGRA FUNDAMENTAL DO PAGAMENTO
==================================================

NUNCA considerar uma compra paga simplesmente porque o navegador foi redirecionado para:

/success

A página success é apenas interface.

A confirmação real deve acontecer através do webhook confiável da Stripe.

O servidor precisa validar a assinatura do webhook.

Somente depois disso o pedido pode ser marcado como PAID.

==================================================
IDEMPOTÊNCIA
==================================================

Os webhooks da Stripe podem ser enviados mais de uma vez.

O sistema deve ser idempotente.

Processar duas vezes o mesmo evento não pode:

- criar duas compras
- duplicar pedidos
- alterar incorretamente o produto
- entregar novamente algo de forma inconsistente

Guardar o ID do evento Stripe processado ou utilizar outra estratégia adequada.

==================================================
COMPRA CONCLUÍDA
==================================================

Após pagamento confirmado:

Order:

PAID

Account:

SOLD

O sistema deve saber que:

Conta #128

pertence ao utilizador:

User X

==================================================
MINHAS COMPRAS
==================================================

No dashboard existe:

Minhas Compras

O utilizador poderá visualizar somente seus próprios pedidos.

Exemplo:

Conta Free Fire #128

Pedido:
#PLU-00128

Preço:
€69,90

Status:
Pago

Data:
26/09/2026

Botão:

Ver detalhes

==================================================
DETALHES DA COMPRA
==================================================

Ao abrir um pedido pago, mostrar informações públicas da conta.

Além disso existe uma seção:

DADOS DA CONTA

Inicialmente poderá aparecer:

Login:

•••••••••••••

Senha:

•••••••••••••

Botão:

REVELAR DADOS

==================================================
REVELAÇÃO DAS CREDENCIAIS
==================================================

Quando o cliente solicitar os dados privados, o frontend deverá chamar uma rota protegida no backend.

Exemplo conceitual:

GET /api/orders/{orderId}/credentials

O servidor precisa verificar:

1. existe sessão válida?
2. existe o Order?
3. order.userId === currentUser.id?
4. order.status === PAID?
5. produto pertence a esse Order?
6. produto está SOLD?

Somente se todas as validações forem verdadeiras o backend pode devolver as credenciais.

Não confiar em informações fornecidas pelo frontend para decidir autorização.

==================================================
EXEMPLO DE ATAQUE QUE PRECISA SER IMPEDIDO
==================================================

Utilizador A comprou:

Order 100

Utilizador B comprou:

Order 200

O utilizador B tenta manualmente acessar:

/api/orders/100/credentials

O backend deve responder:

403 Forbidden

Mesmo que o utilizador esteja autenticado.

A autenticação sozinha não é suficiente.

É obrigatório verificar ownership.

==================================================
CREDENCIAIS DOS PRODUTOS
==================================================

As credenciais das contas são dados altamente sensíveis.

Não armazenar senha da conta de jogo em texto puro.

Elas precisam ser armazenadas de forma encriptada e reversível, pois posteriormente precisam ser entregues ao comprador.

Utilizar criptografia adequada, por exemplo:

AES-256-GCM

A chave de criptografia nunca deve ficar na base de dados.

Deve ficar no ambiente seguro da aplicação / secret manager.

Os dados somente devem ser desencriptados no servidor quando um comprador autorizado solicitar.

==================================================
IMPORTANTE SOBRE SENHAS
==================================================

Existem dois tipos diferentes de senha no sistema.

1. SENHA DO UTILIZADOR DA PLUTÃO SHOP

Essa senha nunca precisa ser recuperada.

Portanto deve ser HASHED.

Utilizar:

Argon2
ou alternativa segura equivalente.

2. SENHA DA CONTA DIGITAL VENDIDA

Essa precisa ser posteriormente entregue ao comprador.

Portanto precisa ser ENCRYPTED, e não hashed.

Não confundir esses dois casos.

==================================================
LOG DE ACESSO ÀS CREDENCIAIS
==================================================

Registrar quando as credenciais forem visualizadas.

Exemplo:

CredentialAccess

id
userId
orderId
createdAt
ipAddress
userAgent

Isso ajuda na auditoria e resolução de problemas.

==================================================
ADMIN - GESTÃO DE CONTAS
==================================================

O administrador poderá:

- listar contas
- criar conta
- editar conta
- desativar conta
- visualizar detalhes
- visualizar status
- visualizar histórico de venda

Uma conta SOLD não deve voltar automaticamente para AVAILABLE.

Qualquer ação administrativa sensível deverá ser protegida.

==================================================
ADMIN - PEDIDOS
==================================================

O administrador poderá visualizar:

- número do pedido
- cliente
- produto
- preço
- status
- pagamento
- data
- referência Stripe

Exemplo:

#PLU-00128

João Silva

Conta Free Fire #128

€69,90

PAID

26/09/2026

==================================================
ADMIN - CLIENTES
==================================================

O administrador poderá visualizar os clientes cadastrados.

Informações:

- nome
- email
- data de registro
- quantidade de compras
- total gasto
- pedidos

==================================================
ROLES
==================================================

Utilizar pelo menos:

USER
ADMIN

USER não pode acessar:

/admin

ADMIN pode acessar área administrativa.

Toda proteção deve existir no backend.

Não confiar apenas em esconder menus no frontend.

==================================================
SEGURANÇA
==================================================

Aplicar uma mentalidade zero-trust no backend.

Nunca confiar diretamente em:

- userId enviado pelo frontend
- preço enviado pelo frontend
- status enviado pelo frontend
- accountId sem validação
- orderId sem verificar ownership
- redirect do Stripe
- dados escondidos apenas por CSS/JavaScript

Todas as regras importantes devem ser validadas no servidor.

==================================================
UPLOAD DE SCREENSHOTS
==================================================

As contas podem possuir múltiplas screenshots.

Futuramente poderão ser armazenadas utilizando Cloudinary ou serviço semelhante.

Precisamos suportar:

- múltiplas imagens
- imagem principal
- ordem das imagens
- exclusão de imagens

Somente administradores podem fazer upload das imagens de produtos.

==================================================
EMAILS
==================================================

Futuramente queremos enviar emails como:

Cadastro realizado.

Compra confirmada.

Pagamento recebido.

Pedido cancelado.

Suporte.

Porém email não deve ser usado como mecanismo principal para entregar senhas das contas.

Preferimos que as credenciais fiquem disponíveis somente dentro da área autenticada da Plutão Shop.

==================================================
SUPORTE
==================================================

O utilizador poderá enviar pedidos de suporte.

Um ticket poderá estar relacionado a uma compra específica.

Exemplo:

SupportTicket

id
userId
orderId opcional
subject
message
status
createdAt

Status:

OPEN
IN_PROGRESS
CLOSED

==================================================
PRINCIPAL REGRA DE NEGÓCIO
==================================================

Uma conta digital representa uma unidade única.

Nunca deverá existir:

duas Orders PAID diferentes para a mesma Account.

Essa regra precisa ser protegida também no banco de dados / transações, e não somente através do frontend.

==================================================
EXEMPLO COMPLETO DO FLUXO
==================================================

ADMIN

cria:

Conta Free Fire #128

↓

adiciona descrição

↓

adiciona imagens

↓

define €69,90

↓

adiciona credenciais privadas

↓

publica

↓

STATUS = AVAILABLE


CLIENTE A

↓

entra na loja

↓

abre Conta #128

↓

visualiza características

↓

clica Comprar

↓

login obrigatório

↓

servidor verifica disponibilidade

↓

conta é temporariamente reservada

↓

Order criado como PENDING

↓

Stripe Checkout

↓

pagamento confirmado

↓

Stripe webhook

↓

backend valida webhook

↓

Order = PAID

↓

Conta = SOLD

↓

Conta desaparece do catálogo disponível


CLIENTE A

↓

Dashboard

↓

Minhas Compras

↓

Conta #128

↓

Ver detalhes

↓

Revelar dados

↓

backend verifica ownership + pagamento

↓

backend desencripta credenciais

↓

envia credenciais ao Cliente A


CLIENTE B

↓

tenta abrir Conta #128

↓

produto aparece vendido ou não aparece mais no catálogo

↓

não consegue comprar


CLIENTE B

↓

tenta acessar manualmente as credenciais do pedido do Cliente A

↓

403 Forbidden

==================================================
EXPERIÊNCIA DO UTILIZADOR
==================================================

Queremos que o processo pareça simples para o cliente:

ESCOLHER

↓

COMPRAR

↓

PAGAR

↓

ACESSAR A COMPRA

Por trás disso, o sistema deve possuir validações fortes para garantir:

- pagamento real
- ownership
- proteção das credenciais
- impossibilidade de venda duplicada
- controle de acesso

==================================================
FORA DO ESCOPO INICIAL
==================================================

Inicialmente NÃO estamos construindo um marketplace multi-vendedor.

Não existem vendedores externos cadastrando suas próprias contas.

Existe apenas:

PLUTÃO SHOP

como operador da loja.

Somente ADMIN publica os produtos.

Portanto NÃO precisamos inicialmente de:

seller accounts
seller dashboard
split payments
Stripe Connect
comissões entre vendedores
saques de vendedores

Caso isso seja necessário no futuro será uma segunda fase.

==================================================
IDENTIDADE
==================================================

Nome:

Plutão Shop

Visual:

dark / gamer / premium

A plataforma não deve se apresentar como produto oficial da Garena ou Free Fire.

Adicionar disclaimer adequado indicando que a loja é independente e não afiliada oficialmente aos desenvolvedores ou publishers dos jogos.

==================================================
OBJETIVO FINAL
==================================================

O objetivo é possuir um e-commerce de inventário digital no qual:

ADMIN

publica um item digital único com informações públicas e credenciais privadas.

CLIENTE

compra o item.

PAGAMENTO

é confirmado pelo servidor.

SISTEMA

marca o item como vendido.

CLIENTE

passa a ter acesso exclusivo às credenciais do item adquirido.

SEGURANÇA

garante que nenhum outro utilizador consiga visualizar essas credenciais.

A arquitetura deve priorizar:

segurança
consistência de dados
controle de acesso
transações
idempotência
auditoria
boa experiência de utilizador

Antes de implementar qualquer funcionalidade, utilizar estas regras de negócio como fonte principal para entender como a Plutão Shop deverá funcionar.