import * as React from "react";
import { createFileRoute, useRouterState } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, PackageSearch, Search, SlidersHorizontal } from "lucide-react";
import { StoreLayout } from "@/components/store/store-layout";
import { AccountGrid } from "@/components/store/account-card";
import { Button } from "@/components/ui/button";
import { Input, Select, Label } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/misc";
import { Modal } from "@/components/ui/confirm-modal";
import { listCatalogFn } from "@/functions/catalog";
import {
  FEATURES,
  LEVEL_RANGES,
  PRICE_RANGES,
  SERVERS,
  SORTS,
  catalogSearchSchema,
  type CatalogSearch,
} from "@/lib/catalog";
import { cn } from "@/lib/format";

export const Route = createFileRoute("/contas/")({
  validateSearch: catalogSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => listCatalogFn({ data: deps }),
  head: () => ({
    meta: [
      { title: "Contas disponíveis | Plutão Shop" },
      {
        name: "description",
        content:
          "Catálogo completo de contas de Free Fire com filtros por preço, level, servidor e características.",
      },
      { property: "og:title", content: "Contas disponíveis | Plutão Shop" },
      { property: "og:description", content: "Encontre a conta ideal para você." },
    ],
  }),
  component: Catalogo,
});

/** Remove valores vazios para o URL ficar limpo. */
function clean(search: CatalogSearch): CatalogSearch {
  const result: CatalogSearch = {};
  if (search.q) result.q = search.q;
  if (search.preco && search.preco !== "todos") result.preco = search.preco;
  if (search.nivel && search.nivel !== "todos") result.nivel = search.nivel;
  if (search.servidor?.length) result.servidor = search.servidor;
  if (search.carac?.length) result.carac = search.carac;
  if (search.ordem && search.ordem !== "recentes") result.ordem = search.ordem;
  if (search.pagina && search.pagina > 1) result.pagina = search.pagina;
  return result;
}

function Catalogo() {
  const data = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const pending = useRouterState({ select: (state) => state.status === "pending" });
  // Só depois de hidratar: no SSR o router também está "pending" e o atributo
  // ficaria preso no HTML (o React não corrige atributos na hidratação).
  const [hydrated, setHydrated] = React.useState(false);
  React.useEffect(() => setHydrated(true), []);
  const loading = hydrated && pending;
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [query, setQuery] = React.useState(search.q ?? "");

  const update = React.useCallback(
    (patch: Partial<CatalogSearch>, options: { replace?: boolean } = {}) => {
      void navigate({
        search: (prev) => clean({ ...prev, pagina: undefined, ...patch }),
        replace: options.replace ?? false,
        resetScroll: false,
      });
    },
    [navigate],
  );

  // Pesquisa com atraso, para não pedir ao servidor a cada tecla.
  React.useEffect(() => {
    const value = query.trim();
    if (value === (search.q ?? "")) return;
    const timer = setTimeout(() => update({ q: value || undefined }, { replace: true }), 350);
    return () => clearTimeout(timer);
  }, [query, search.q, update]);

  const toggle = (group: "servidor" | "carac", value: string) => {
    const current: string[] = search[group] ?? [];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    update({ [group]: next } as Partial<CatalogSearch>);
  };

  const clearAll = () => {
    setQuery("");
    void navigate({ search: {}, resetScroll: false });
  };

  const filterPanel = (
    <div className="space-y-7">
      <div>
        <Label htmlFor="filtro-preco">Preço</Label>
        <Select
          id="filtro-preco"
          value={search.preco ?? "todos"}
          onChange={(e) => update({ preco: e.target.value as CatalogSearch["preco"] })}
        >
          {PRICE_RANGES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="filtro-level">Level</Label>
        <Select
          id="filtro-level"
          value={search.nivel ?? "todos"}
          onChange={(e) => update({ nivel: e.target.value as CatalogSearch["nivel"] })}
        >
          {LEVEL_RANGES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </Select>
      </div>
      <fieldset>
        <legend className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Servidor
        </legend>
        <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
          {SERVERS.map((server) => (
            <Check
              key={server}
              label={server}
              checked={search.servidor?.includes(server) ?? false}
              onChange={() => toggle("servidor", server)}
            />
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Características
        </legend>
        <div className="space-y-2">
          {FEATURES.map((feature) => (
            <Check
              key={feature.value}
              label={feature.label}
              checked={search.carac?.includes(feature.value) ?? false}
              onChange={() => toggle("carac", feature.value)}
            />
          ))}
        </div>
      </fieldset>
      <Button variant="ghost" className="w-full" onClick={clearAll}>
        Limpar filtros
      </Button>
    </div>
  );

  return (
    <StoreLayout>
      <div className="ember-bg border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <h1 className="font-display text-3xl font-extrabold sm:text-4xl">Contas disponíveis</h1>
          <p className="mt-2 text-muted-foreground">Encontre a conta ideal para você.</p>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl gap-8 px-4 py-10 sm:px-6">
        <aside className="surface-panel hidden h-fit w-64 shrink-0 p-5 lg:block">
          <h2 className="mb-5 font-bold">Filtros</h2>
          {filterPanel}
        </aside>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Pesquisar contas..."
                aria-label="Pesquisar contas"
                maxLength={80}
                className="pl-9"
              />
            </div>
            <Select
              value={search.ordem ?? "recentes"}
              onChange={(e) => update({ ordem: e.target.value as CatalogSearch["ordem"] })}
              aria-label="Ordenar contas"
              className="sm:w-52"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
            <Button variant="outline" className="lg:hidden" onClick={() => setDrawerOpen(true)}>
              <SlidersHorizontal className="size-4" /> Filtros
            </Button>
          </div>

          <p className="mt-5 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">
              {data.total} {data.total === 1 ? "conta" : "contas"}
            </span>{" "}
            {data.total === 1 ? "encontrada" : "encontradas"}
          </p>

          <div className={cn("mt-6 transition-opacity", loading && "opacity-60")}>
            {data.items.length ? (
              <AccountGrid accounts={data.items} />
            ) : (
              <EmptyState
                icon={<PackageSearch className="size-6" />}
                title="Nenhuma conta encontrada."
                description="Experimente alterar seus filtros."
                actionLabel="Limpar filtros"
                onAction={clearAll}
              />
            )}
          </div>

          {data.pageCount > 1 ? (
            <nav
              aria-label="Paginação"
              className="mt-10 flex items-center justify-center gap-3 text-sm"
            >
              <Button
                variant="outline"
                size="sm"
                disabled={data.page <= 1}
                onClick={() => update({ pagina: data.page - 1 })}
              >
                <ChevronLeft className="size-4" /> Anterior
              </Button>
              <span className="text-muted-foreground">
                Página {data.page} de {data.pageCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={data.page >= data.pageCount}
                onClick={() => update({ pagina: data.page + 1 })}
              >
                Seguinte <ChevronRight className="size-4" />
              </Button>
            </nav>
          ) : null}
        </div>
      </div>

      <Modal open={drawerOpen} onOpenChange={setDrawerOpen} title="Filtros">
        {filterPanel}
        <Button className="mt-6 w-full" onClick={() => setDrawerOpen(false)}>
          Ver {data.total} contas
        </Button>
      </Modal>
    </StoreLayout>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="size-4 cursor-pointer accent-[oklch(0.82_0.165_78)]"
      />
      {label}
    </label>
  );
}
