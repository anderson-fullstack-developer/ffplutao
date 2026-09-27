import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage, Section } from "@/components/store/legal-page";
import { LEGAL } from "@/lib/legal";

export const Route = createFileRoute("/reembolsos")({
  head: () => ({
    meta: [
      { title: "Política de Reembolsos | Plutão Shop" },
      {
        name: "description",
        content: "Quando e como pode pedir o reembolso de uma compra na Plutão Shop.",
      },
    ],
  }),
  component: Reembolsos,
});

function Reembolsos() {
  return (
    <LegalPage title="Política de Reembolsos" intro="Quando devolvemos o dinheiro e como pedir.">
      <Section title="Reembolso automático">
        <p>
          Se pagar uma conta que, por motivo excecional, já não possa ser entregue (por exemplo,
          vendida a outra pessoa antes da confirmação do seu pagamento), o valor dessa conta é
          devolvido automaticamente ao seu cartão. Numa compra de várias contas, só é devolvido o
          valor das contas não entregues.
        </p>
      </Section>

      <Section title="Conta com problemas">
        <p>Pode pedir a resolução do problema, a substituição ou o reembolso se:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>os dados entregues não dão acesso à conta;</li>
          <li>a conta não corresponde ao que estava descrito no anúncio.</li>
        </ul>
        <p>
          Para isso, abra um pedido a partir da compra (em "Minhas compras" → "Pedir ajuda") nas
          primeiras <strong className="text-foreground">{LEGAL.claimWindowHours} horas</strong> após
          a entrega, antes de fazer alterações à conta, e descreva o problema. Analisamos cada caso
          e respondemos na sua área de cliente.
        </p>
      </Section>

      <Section title="Quando não há reembolso">
        <p>
          Por se tratar de conteúdo digital entregue de imediato, com o seu consentimento prévio,
          não há direito de desistência sem motivo depois da entrega (ver os{" "}
          <Link to="/termos" className="text-primary hover:underline">
            Termos
          </Link>
          ). Também não há reembolso quando o problema resulta de alterações feitas pelo cliente, da
          partilha dos dados com terceiros ou de decisões da editora do jogo após a entrega.
        </p>
      </Section>

      <Section title="Prazo e forma do reembolso">
        <p>
          Os reembolsos são feitos para o mesmo cartão usado na compra. O valor aparece normalmente
          em 5 a 10 dias úteis, conforme o banco.
        </p>
      </Section>

      <Section title="Contacto">
        <p>
          <Link to="/suporte" className="text-primary hover:underline">
            Página de suporte
          </Link>{" "}
          ou {LEGAL.email}. Pode também usar o{" "}
          <a
            href={LEGAL.complaintsBookUrl}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            Livro de Reclamações Eletrónico
          </a>
          .
        </p>
      </Section>
    </LegalPage>
  );
}
