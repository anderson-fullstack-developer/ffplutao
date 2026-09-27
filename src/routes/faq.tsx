import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";
import { LegalPage } from "@/components/store/legal-page";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FAQ } from "@/lib/faq";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "Perguntas frequentes | Plutão Shop" },
      {
        name: "description",
        content:
          "Respostas sobre compras, pagamento, entrega dos dados da conta, reembolsos e segurança na Plutão Shop.",
      },
    ],
  }),
  component: Faq,
});

function Faq() {
  return (
    <LegalPage
      title="Perguntas frequentes"
      intro="Tudo o que precisa de saber antes e depois de comprar."
      updated={false}
    >
      {FAQ.map((group) => (
        <section key={group.category}>
          <h2 className="mb-2 text-lg font-bold text-foreground">{group.category}</h2>
          <Accordion type="multiple" className="surface-panel px-5">
            {group.items.map((item, index) => (
              <AccordionItem
                key={item.q}
                value={`${group.category}-${index}`}
                className="border-border/70 last:border-b-0"
              >
                <AccordionTrigger className="text-base font-semibold text-foreground hover:no-underline">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      ))}

      <div className="surface-panel flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="font-semibold text-foreground">Não encontrou a resposta?</p>
          <p className="text-sm">A nossa equipa responde na sua área de cliente.</p>
        </div>
        <Button asChild>
          <Link to="/suporte">
            <MessageSquare className="size-4" /> Falar com o suporte
          </Link>
        </Button>
      </div>
    </LegalPage>
  );
}
