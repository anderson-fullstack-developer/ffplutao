import { Link } from "@tanstack/react-router";
import { Gamepad2, Globe2, ImageOff, Sparkles, Swords } from "lucide-react";
import { centsToEuros, type PublicAccount } from "@/lib/catalog";
import { StatusBadge } from "@/components/ui/status-badge";
import { PriceDisplay } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { AddToCartButton } from "@/components/store/add-to-cart-button";

export function AccountCard({ account }: { account: PublicAccount }) {
  const cover = account.images[0];

  return (
    <article className="surface-panel group flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-primary/45 hover:shadow-[0_24px_50px_-28px_oklch(0.82_0.165_78/0.6)]">
      <div className="relative aspect-[16/10] overflow-hidden">
        {cover ? (
          <img
            src={cover.thumbUrl}
            alt={`Screenshot da ${account.title}`}
            loading="lazy"
            width={cover.width ?? 1024}
            height={cover.height ?? 640}
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-surface text-muted-foreground">
            <ImageOff className="size-8" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        <div className="absolute top-3 left-3">
          <StatusBadge status={account.status} />
        </div>
        <span className="absolute top-3 right-3 rounded-full border border-border/70 bg-background/80 px-2.5 py-1 text-xs font-semibold backdrop-blur">
          Nível {account.level}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-base font-bold">{account.title}</h3>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <Spec icon={<Globe2 className="size-4" />} label="Servidor" value={account.server} />
          <Spec
            icon={<Gamepad2 className="size-4" />}
            label="Nível"
            value={String(account.level)}
          />
          <Spec icon={<Sparkles className="size-4" />} label="Skins" value={`${account.skins}+`} />
          <Spec
            icon={<Swords className="size-4" />}
            label="Evolutivas"
            value={String(account.evolutionWeapons)}
          />
        </dl>

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-border/70 pt-4">
          <div>
            <p className="text-xs text-muted-foreground">Preço</p>
            <PriceDisplay value={centsToEuros(account.priceCents)} />
          </div>
          <div className="flex items-center gap-2">
            {account.status === "AVAILABLE" ? (
              <AddToCartButton accountId={account.id} title={account.title} size="sm" compact />
            ) : null}
            <Button asChild size="sm">
              <Link to="/contas/$id" params={{ id: account.id }}>
                Ver conta
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

function Spec({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-primary/80">{icon}</span>
      <div className="min-w-0">
        <dt className="text-[11px] text-muted-foreground">{label}</dt>
        <dd className="truncate text-sm font-semibold">{value}</dd>
      </div>
    </div>
  );
}

export function AccountGrid({ accounts }: { accounts: PublicAccount[] }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {accounts.map((account) => (
        <AccountCard key={account.id} account={account} />
      ))}
    </div>
  );
}
