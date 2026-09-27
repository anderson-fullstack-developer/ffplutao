import { useNavigate } from "@tanstack/react-router";
import { Check, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MAX_CART_ITEMS, useCart } from "@/lib/cart";
import { cn } from "@/lib/format";

export function AddToCartButton({
  accountId,
  title,
  disabled,
  size = "lg",
  compact,
  className,
}: {
  accountId: string;
  title: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  /** Só o ícone (cartões do catálogo). */
  compact?: boolean;
  className?: string;
}) {
  const cart = useCart();
  const navigate = useNavigate();
  const inCart = cart.has(accountId);

  const add = () => {
    if (inCart) {
      void navigate({ to: "/carrinho" });
      return;
    }
    const result = cart.add(accountId);
    if (result === "full") {
      toast.error(`O carrinho aceita no máximo ${MAX_CART_ITEMS} contas.`);
      return;
    }
    toast.success(`${title} foi adicionada ao carrinho`, {
      action: { label: "Ver carrinho", onClick: () => void navigate({ to: "/carrinho" }) },
    });
  };

  const label = inCart ? "No carrinho" : "Adicionar ao carrinho";

  return (
    <Button
      type="button"
      size={size}
      variant="outline"
      disabled={disabled}
      onClick={add}
      aria-label={compact ? label : undefined}
      title={compact ? label : undefined}
      className={cn(inCart && "border-primary/50 text-primary", compact && "px-0 w-9", className)}
    >
      {inCart ? <Check className="size-4" /> : <ShoppingCart className="size-4" />}
      {compact ? null : label}
    </Button>
  );
}
