import { LEGAL } from "./legal";

/** Perguntas frequentes (FAQ e "Como funciona"). Refletem o funcionamento real da loja. */
export const FAQ: { category: string; items: { q: string; a: string }[] }[] = [
  {
    category: "Comprar",
    items: [
      {
        q: "Preciso de criar conta para comprar?",
        a: "Pode ver todas as contas sem registo. Para comprar, pedimos que entre ou crie uma conta gratuita — é lá que os dados da conta comprada ficam guardados em segurança.",
      },
      {
        q: "Posso comprar várias contas de uma vez?",
        a: "Sim. Adicione as contas ao carrinho (até 10) e pague todas num só pagamento.",
      },
      {
        q: "O que significa uma conta 'Reservada'?",
        a: "Alguém está a pagar essa conta neste momento. A reserva dura 30 minutos: se o pagamento não for concluído, a conta volta a ficar disponível.",
      },
      {
        q: "Os preços incluem tudo?",
        a: "Sim. Os preços são finais, em euros (€), sem custos escondidos nem subscrições.",
      },
    ],
  },
  {
    category: "Pagamento",
    items: [
      {
        q: "Que formas de pagamento aceitam?",
        a: "Cartão de crédito ou débito, Apple Pay e Google Pay, numa página de pagamento segura.",
      },
      {
        q: "Os dados do meu cartão ficam guardados na loja?",
        a: "Não. O pagamento é processado por um prestador de pagamentos certificado; a Plutão Shop nunca vê nem guarda os dados do seu cartão.",
      },
      {
        q: "E se a conta for vendida a outra pessoa enquanto pago?",
        a: "Não acontece durante a reserva. Se, por um motivo técnico raro, uma conta já não puder ser entregue, o valor dessa conta é devolvido automaticamente ao seu cartão.",
      },
    ],
  },
  {
    category: "Receber a conta",
    items: [
      {
        q: "Quando recebo os dados da conta?",
        a: "Logo após a confirmação do pagamento (normalmente segundos). Vá a 'Minhas compras', abra a compra e carregue em 'Revelar dados'.",
      },
      {
        q: "Recebo os dados por email?",
        a: "Não, por segurança. Os dados ficam apenas na sua área de cliente, protegidos pela sua senha.",
      },
      {
        q: "O que devo fazer depois de entrar na conta?",
        a: "Recomendamos que altere de imediato a senha e o email de recuperação da conta do jogo, para que só você tenha acesso.",
      },
    ],
  },
  {
    category: "Problemas e reembolsos",
    items: [
      {
        q: "A conta não corresponde ao anúncio ou os dados não funcionam. E agora?",
        a: `Abra um pedido de ajuda a partir da compra (botão 'Pedir ajuda') nas primeiras ${LEGAL.claimWindowHours} horas. Analisamos e resolvemos — com novos dados, substituição ou reembolso.`,
      },
      {
        q: "Posso desistir da compra?",
        a: "Por se tratar de conteúdo digital entregue de imediato, ao comprar aceita a entrega imediata e deixa de poder desistir sem motivo. Os casos de conta com problemas são sempre analisados — veja a Política de Reembolsos.",
      },
      {
        q: "A Plutão Shop é oficial da Garena ou do Free Fire?",
        a: "Não. A Plutão Shop é uma loja independente, sem qualquer ligação à Garena ou ao Free Fire.",
      },
    ],
  },
];
