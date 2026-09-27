import * as React from "react";
import { Link } from "@tanstack/react-router";
import * as Dialog from "@radix-ui/react-dialog";
import {
  AlertTriangle,
  Eye,
  ImageOff,
  Loader2,
  Lock,
  Pencil,
  ShieldCheck,
  Star,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PriceDisplay } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAdminAccountFn } from "@/functions/admin";
import type { AdminAccountDetail } from "@/lib/admin";
import { centsToEuros } from "@/lib/catalog";
import { cn } from "@/lib/format";

const cloudinary = (url: string, width: number) =>
  url.replace("/image/upload/", `/image/upload/f_auto,q_auto,c_limit,w_${width}/`);

/** Resumo de uma conta no painel de admin (abre ao clicar numa linha da tabela). */
export function AccountPreviewModal({
  accountId,
  onClose,
}: {
  accountId: string | null;
  onClose: () => void;
}) {
  const [account, setAccount] = React.useState<AdminAccountDetail | null>(null);
  const [error, setError] = React.useState(false);
  const [active, setActive] = React.useState(0);

  React.useEffect(() => {
    if (!accountId) return;
    let cancelled = false;
    setAccount(null);
    setError(false);
    setActive(0);
    getAdminAccountFn({ data: { id: accountId } })
      .then((data) => {
        if (cancelled) return;
        if (data) setAccount(data);
        else setError(true);
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  const isPublic = account && ["AVAILABLE", "RESERVED", "SOLD"].includes(account.status);
  const current = account?.images[active];

  return (
    <Dialog.Root open={accountId !== null} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content className="surface-panel fixed top-1/2 left-1/2 z-50 flex max-h-[90vh] w-[calc(100vw-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95">
          <div className="flex items-start justify-between gap-4 border-b border-border p-5">
            <div className="min-w-0">
              <Dialog.Title className="truncate text-lg font-bold">
                {account?.title ?? "A carregar..."}
              </Dialog.Title>
              {account ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusBadge status={account.status} />
                  {account.featured ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                      <Star className="size-3" /> Destaque
                    </span>
                  ) : null}
                </div>
              ) : null}
              <Dialog.Description className="sr-only">Resumo da conta</Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Fechar"
              className="cursor-pointer rounded-lg p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="size-5" />
            </Dialog.Close>
          </div>

          <div className="overflow-y-auto p-5">
            {error ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Não foi possível carregar esta conta.
              </p>
            ) : !account ? (
              <div className="flex justify-center py-16">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-[1.1fr_1fr]">
                {/* Imagens */}
                <div>
                  {current ? (
                    <img
                      src={cloudinary(current.url, 900)}
                      alt={`Screenshot ${active + 1}`}
                      className="aspect-[16/10] w-full rounded-lg border border-border object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[16/10] w-full items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground">
                      <ImageOff className="size-8" />
                    </div>
                  )}
                  {account.images.length > 1 ? (
                    <div className="mt-3 grid grid-cols-5 gap-2">
                      {account.images.map((image, index) => (
                        <button
                          key={image.publicId}
                          type="button"
                          onClick={() => setActive(index)}
                          aria-label={`Ver screenshot ${index + 1}`}
                          className={cn(
                            "relative cursor-pointer overflow-hidden rounded-md border transition-opacity",
                            index === active
                              ? "border-primary"
                              : "border-border opacity-60 hover:opacity-100",
                          )}
                        >
                          <img
                            src={cloudinary(image.url, 160)}
                            alt=""
                            loading="lazy"
                            className="aspect-[16/10] w-full object-cover"
                          />
                          {index === 0 ? (
                            <span className="gold-surface absolute top-0.5 left-0.5 rounded px-1 text-[8px] font-bold">
                              Capa
                            </span>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                {/* Dados */}
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Preço</p>
                    <PriceDisplay value={centsToEuros(account.priceCents)} />
                  </div>

                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    {(
                      [
                        ["Level", account.level],
                        ["Servidor", account.server],
                        ["Ano", account.accountYear ?? "—"],
                        ["Skins", account.skins],
                        ["Armas evolutivas", account.evolutionWeapons],
                        ["Emotes", account.emotes],
                        ["Personagens", account.characters],
                        ["Passes antigos", account.passes],
                      ] as const
                    ).map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-lg border border-border bg-surface/50 px-3 py-2"
                      >
                        <dt className="text-[11px] text-muted-foreground">{label}</dt>
                        <dd className="font-semibold">{value}</dd>
                      </div>
                    ))}
                  </dl>

                  {account.highlights.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {account.highlights.map((highlight) => (
                        <span
                          key={highlight}
                          className="rounded-full border border-border bg-surface/60 px-2.5 py-1 text-xs font-semibold"
                        >
                          {highlight}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className="space-y-2 text-sm">
                    <p className="flex items-center gap-2">
                      {account.hasCredentials ? (
                        <>
                          <ShieldCheck className="size-4 text-success" /> Credenciais guardadas
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="size-4 text-warning" /> Sem credenciais (não
                          pode ser publicada)
                        </>
                      )}
                    </p>
                    <p className="text-muted-foreground">
                      {account.ordersCount === 0
                        ? "Sem pedidos"
                        : `${account.ordersCount} ${account.ordersCount === 1 ? "pedido" : "pedidos"}`}
                    </p>
                  </div>
                </div>

                {/* Textos */}
                <div className="space-y-4 md:col-span-2">
                  <Section title="Descrição">
                    {account.description || (
                      <span className="text-muted-foreground">Sem descrição.</span>
                    )}
                  </Section>
                  {account.observations ? (
                    <Section title="Observações públicas">{account.observations}</Section>
                  ) : null}
                  {account.adminNotes ? (
                    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                      <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-primary">
                        <Lock className="size-3" /> Notas internas (só admin)
                      </p>
                      <p className="text-sm whitespace-pre-line">{account.adminNotes}</p>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>

          {account ? (
            <div className="flex flex-wrap justify-end gap-3 border-t border-border p-4">
              {isPublic ? (
                <Button asChild variant="outline">
                  <Link to="/contas/$id" params={{ id: account.id }}>
                    <Eye className="size-4" /> Ver na loja
                  </Link>
                </Button>
              ) : null}
              <Button asChild>
                <Link to="/admin/contas/$id/editar" params={{ id: account.id }}>
                  <Pencil className="size-4" /> Editar
                </Link>
              </Button>
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h4>
      <p className="text-sm whitespace-pre-line">{children}</p>
    </div>
  );
}
