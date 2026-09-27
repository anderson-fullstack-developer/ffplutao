import { Link } from "@tanstack/react-router";

/**
 * Consentimento obrigatório antes de pagar conteúdo digital com entrega imediata
 * (perda do direito de livre resolução). O servidor volta a exigir esta aceitação.
 */
export function CheckoutConsent({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border bg-surface/50 p-3 text-xs leading-relaxed text-muted-foreground">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-[oklch(0.82_0.165_78)]"
      />
      <span>
        Aceito os{" "}
        <Link to="/termos" target="_blank" className="text-primary hover:underline">
          Termos e Condições
        </Link>{" "}
        e peço a <strong className="text-foreground">entrega imediata</strong> dos dados da conta.
        Reconheço que, após a entrega, deixo de poder desistir da compra sem motivo (
        <Link to="/reembolsos" target="_blank" className="text-primary hover:underline">
          ver reembolsos
        </Link>
        ).
      </span>
    </label>
  );
}
