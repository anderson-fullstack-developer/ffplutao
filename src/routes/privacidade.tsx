import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage, Section } from "@/components/store/legal-page";
import { LEGAL } from "@/lib/legal";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade | Plutão Shop" },
      {
        name: "description",
        content: "Como a Plutão Shop trata e protege os seus dados pessoais (RGPD).",
      },
    ],
  }),
  component: Privacidade,
});

function Privacidade() {
  return (
    <LegalPage
      title="Política de Privacidade"
      intro="Que dados recolhemos, para quê, durante quanto tempo e quais são os seus direitos (RGPD)."
    >
      <Section title="1. Responsável pelo tratamento">
        <p>
          {LEGAL.operator}, NIF {LEGAL.nif}, {LEGAL.address} — contacto para questões de
          privacidade: {LEGAL.email}.
        </p>
      </Section>

      <Section title="2. Dados que recolhemos">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong className="text-foreground">Conta:</strong> nome, email e senha (guardada apenas
            de forma cifrada irreversível — nunca a conhecemos).
          </li>
          <li>
            <strong className="text-foreground">Compras:</strong> contas compradas, valores, datas e
            estado dos pedidos.
          </li>
          <li>
            <strong className="text-foreground">Pagamento:</strong> referências da transação. Os
            dados do cartão são tratados apenas pelo prestador de pagamentos, nunca por nós.
          </li>
          <li>
            <strong className="text-foreground">Segurança:</strong> endereço IP e navegador no
            início de sessão e sempre que revela os dados de uma conta comprada.
          </li>
          <li>
            <strong className="text-foreground">Suporte:</strong> as mensagens que nos envia.
          </li>
        </ul>
      </Section>

      <Section title="3. Para que usamos os dados">
        <ul className="list-disc space-y-1 pl-5">
          <li>Executar o contrato de compra e entregar as contas (execução de contrato);</li>
          <li>Processar pagamentos e reembolsos (execução de contrato);</li>
          <li>Responder a pedidos de suporte (execução de contrato);</li>
          <li>
            Prevenir fraude e proteger contas, incluindo limites de tentativas de login e registo de
            acessos (interesse legítimo);
          </li>
          <li>Cumprir obrigações fiscais e contabilísticas (obrigação legal).</li>
        </ul>
        <p>Não vendemos os seus dados nem os usamos para publicidade.</p>
      </Section>

      <Section title="4. Com quem partilhamos">
        <p>Apenas com prestadores necessários ao funcionamento da loja:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Stripe — processamento de pagamentos;</li>
          <li>Neon — alojamento da base de dados (União Europeia);</li>
          <li>Vercel — alojamento do site;</li>
          <li>Cloudinary — alojamento das imagens das contas à venda.</li>
        </ul>
        <p>
          Alguns destes prestadores podem tratar dados fora do Espaço Económico Europeu, com as
          garantias previstas no RGPD (como cláusulas contratuais-tipo).
        </p>
      </Section>

      <Section title="5. Durante quanto tempo">
        <ul className="list-disc space-y-1 pl-5">
          <li>Conta de cliente: enquanto a mantiver ativa;</li>
          <li>Compras e faturação: 10 anos (obrigação legal);</li>
          <li>Registos de acesso aos dados comprados: até 2 anos (prova de entrega e fraude);</li>
          <li>Mensagens de suporte: até 2 anos após o último contacto.</li>
        </ul>
      </Section>

      <Section title="6. Cookies e armazenamento local">
        <p>
          Usamos apenas o essencial: um cookie de sessão (para manter o seu login, protegido contra
          acesso por scripts) e o armazenamento local do navegador para guardar o carrinho. Não
          usamos cookies de publicidade nem de estatísticas de terceiros.
        </p>
      </Section>

      <Section title="7. Os seus direitos">
        <p>
          Pode pedir acesso, retificação, apagamento, limitação, portabilidade dos seus dados ou
          opor-se ao tratamento, através de {LEGAL.email} ou da página de{" "}
          <Link to="/suporte" className="text-primary hover:underline">
            suporte
          </Link>
          . Pode alterar o seu nome e senha em "Minha conta". Tem ainda o direito de apresentar
          reclamação à Comissão Nacional de Proteção de Dados (
          <a
            href="https://www.cnpd.pt"
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            cnpd.pt
          </a>
          ).
        </p>
      </Section>

      <Section title="8. Segurança">
        <p>
          As senhas são guardadas com hash Argon2; os dados de acesso das contas vendidas são
          guardados cifrados (AES-256) e só são revelados ao comprador depois do pagamento. Todo o
          tráfego do site é cifrado (HTTPS).
        </p>
      </Section>
    </LegalPage>
  );
}
