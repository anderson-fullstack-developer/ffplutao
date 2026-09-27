import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage, Section } from "@/components/store/legal-page";
import { LEGAL } from "@/lib/legal";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos e Condições | Plutão Shop" },
      {
        name: "description",
        content: "Termos e condições de utilização e de compra na Plutão Shop.",
      },
    ],
  }),
  component: Termos,
});

function Termos() {
  return (
    <LegalPage
      title="Termos e Condições"
      intro="Condições de utilização do site e de compra de contas na Plutão Shop."
    >
      <Section title="1. Quem somos">
        <p>
          A {LEGAL.storeName} é explorada por {LEGAL.operator}, NIF {LEGAL.nif}, com sede em{" "}
          {LEGAL.address}. Contacto: {LEGAL.email} ou através da página de{" "}
          <Link to="/suporte" className="text-primary hover:underline">
            suporte
          </Link>
          .
        </p>
        <p>
          A {LEGAL.storeName} é uma loja independente. Não é afiliada, patrocinada nem administrada
          pela Garena, nem por qualquer editora ou criadora de jogos. "Free Fire" e outras marcas
          pertencem aos respetivos titulares.
        </p>
      </Section>

      <Section title="2. O que vendemos">
        <p>
          Vendemos contas de jogos (inicialmente Free Fire). Cada conta é única: só pode ser vendida
          uma vez. As informações de cada anúncio (nível, servidor, skins, armas, emotes e outras)
          descrevem a conta no momento da publicação.
        </p>
        <p>
          A utilização de contas de jogo está sujeita aos termos do próprio jogo, definidos pela
          respetiva editora. Ao comprar, declara conhecer esses termos e assume a utilização da
          conta de acordo com eles.
        </p>
      </Section>

      <Section title="3. Registo">
        <p>
          Para comprar é necessário criar uma conta na {LEGAL.storeName} com dados verdadeiros. É
          responsável por manter a sua senha em segredo e por toda a atividade na sua conta. A
          compra está reservada a maiores de 18 anos ou a menores com autorização do representante
          legal.
        </p>
      </Section>

      <Section title="4. Preços e pagamento">
        <p>
          Os preços são apresentados em euros (€) e são finais. O pagamento é feito por cartão de
          crédito ou débito, Apple Pay ou Google Pay, através de um prestador de pagamentos
          certificado. A {LEGAL.storeName} não tem acesso aos dados do seu cartão.
        </p>
        <p>
          Ao iniciar o pagamento, as contas escolhidas ficam reservadas para si durante 30 minutos.
          Se o pagamento não for concluído nesse prazo, a reserva termina e as contas voltam a ficar
          disponíveis. O pedido só é considerado pago depois da confirmação do prestador de
          pagamentos.
        </p>
      </Section>

      <Section title="5. Entrega">
        <p>
          Após a confirmação do pagamento, os dados de acesso de cada conta ficam disponíveis na sua
          área de cliente, em "Minhas compras". Os dados não são enviados por email. Cada acesso aos
          dados fica registado (data, endereço IP e navegador) para segurança e como prova de
          entrega.
        </p>
        <p>
          Se, por motivo excecional, uma conta paga já não puder ser entregue, o valor dessa conta é
          devolvido automaticamente.
        </p>
      </Section>

      <Section title="6. Direito de livre resolução">
        <p>
          As contas são conteúdo digital fornecido de imediato. Antes de pagar, o cliente pede
          expressamente o início imediato da entrega e reconhece que, por esse motivo, perde o
          direito de livre resolução (desistência sem motivo no prazo de 14 dias), nos termos da
          legislação aplicável à venda à distância de conteúdos digitais.
        </p>
        <p>
          Isto não afeta os seus direitos quando a conta não corresponde ao anunciado — ver a{" "}
          <Link to="/reembolsos" className="text-primary hover:underline">
            Política de Reembolsos
          </Link>
          .
        </p>
      </Section>

      <Section title="7. Obrigações do cliente">
        <ul className="list-disc space-y-1 pl-5">
          <li>Não partilhar nem revender os dados recebidos sem autorização;</li>
          <li>Alterar a senha e o email de recuperação da conta do jogo após a compra;</li>
          <li>Não utilizar o site para atividades ilícitas ou fraudulentas;</li>
          <li>Não contestar pagamentos de forma abusiva junto do banco.</li>
        </ul>
      </Section>

      <Section title="8. Responsabilidade">
        <p>
          A {LEGAL.storeName} garante que os dados entregues dão acesso à conta descrita no momento
          da entrega. Não é responsável por alterações posteriores feitas pelo cliente, por decisões
          da editora do jogo (incluindo suspensões por violação dos termos do jogo) nem por perdas
          resultantes da partilha dos dados pelo cliente.
        </p>
      </Section>

      <Section title="9. Reclamações e litígios">
        <p>
          Pode apresentar reclamação no{" "}
          <a
            href={LEGAL.complaintsBookUrl}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            Livro de Reclamações Eletrónico
          </a>
          . Em caso de litígio, pode recorrer a uma entidade de Resolução Alternativa de Litígios de
          consumo — lista disponível em{" "}
          <a
            href={LEGAL.ralUrl}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            consumidor.gov.pt
          </a>
          . Aplica-se a lei portuguesa.
        </p>
      </Section>

      <Section title="10. Alterações">
        <p>
          Podemos atualizar estes termos. A versão em vigor é sempre a publicada nesta página; as
          compras regem-se pelos termos em vigor na data da compra.
        </p>
      </Section>
    </LegalPage>
  );
}
