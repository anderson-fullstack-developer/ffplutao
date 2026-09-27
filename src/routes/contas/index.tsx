import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search, SlidersHorizontal, PackageSearch } from "lucide-react";
import { StoreLayout } from "@/components/store/store-layout";
import { AccountGrid } from "@/components/store/account-card";
import { Button } from "@/components/ui/button";
import { Input, Select, Label } from "@/components/ui/field";
import { EmptyState, AccountCardSkeleton } from "@/components/ui/misc";
import { Modal } from "@/components/ui/confirm-modal";
import { accounts } from "@/mock/accounts";
import type { Account } from "@/types";

export const Route = createFileRoute("/contas/")({
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

const priceRanges = [
  { value: "todos", label: "Todos" },
  { value: "0-25", label: "Até €25" },
  { value: "25-50", label: "€25 - €50" },
  { value: "50-100", label: "€50 - €100" },
  { value: "100+", label: "€100+" },
];

const levelRanges = [
  { value: "todos", label: "Todos" },
  { value: "1-30", label: "1 - 30" },
  { value: "31-50", label: "31 - 50" },
  { value: "51-70", label: "51 - 70" },
  { value: "70+", label: "70+" },
];

const servers = ["Brasil", "Europa", "América Latina"] as const;

const features = [
  { key: "evolutivas", label: "Armas evolutivas" },
  { key: "skins", label: "Skins raras" },
  { key: "emotes", label: "Emotes raros" },
  { key: "passes", label: "Passes antigos" },
  { key: "colecao", label: "Itens de coleção" },
];

interface Filters {
  price: string;
  level: string;
  servers: string[];
  features: string[];
}

const emptyFilters: Filters = { price: "todos", level: "todos", servers: [], features: [] };

function matchFeature(account: Account, key: string) {
  switch (key) {
    case "evolutivas":
      return account.evolutionWeapons >= 3;
    case "skins":
      return account.skins >= 200;
    case "emotes":
      return account.emotes >= 10;
    case "passes":
      return account.passes >= 2;
    case "colecao":
      return account.highlights.includes("Itens de coleção");
    default:
      return true;
  }
}

function Catalogo() {
  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState("recentes");
  const [filters, setFilters] = React.useState<Filters>(emptyFilters);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 650);
    return () => clearTimeout(timer);
  }, []);

  const results = React.useMemo(() => {
    let list = accounts.filter((account) => {
      if (query && !account.title.toLowerCase().includes(query.toLowerCase())) return false;

      if (filters.price !== "todos") {
        const [min = "0", max = "99999"] = filters.price.split("-");
        if (filters.price === "100+") {
          if (account.price < 100) return false;
        } else if (account.price < Number(min) || account.price > Number(max)) {
          return false;
        }
      }

      if (filters.level !== "todos") {
        if (filters.level === "70+") {
          if (account.level < 70) return false;
        } else {
          const [min = 0, max = 999] = filters.level.split("-").map(Number);
          if (account.level < min || account.level > max) return false;
        }
      }

      if (filters.servers.length && !filters.servers.includes(account.server)) return false;
      if (filters.features.length && !filters.features.every((f) => matchFeature(account, f)))
        return false;

      return true;
    });

    list = [...list].sort((x, y) => {
      if (sort === "menor") return x.price - y.price;
      if (sort === "maior") return y.price - x.price;
      if (sort === "populares") return y.popularity - x.popularity;
      return y.createdAt.localeCompare(x.createdAt);
    });

    return list;
  }, [query, sort, filters]);

  const toggle = (group: "servers" | "features", value: string) =>
    setFilters((prev) => ({
      ...prev,
      [group]: prev[group].includes(value)
        ? prev[group].filter((v) => v !== value)
        : [...prev[group], value],
    }));

  const filterPanel = (
    <div className="space-y-7">
      <div>
        <Label htmlFor="filtro-preco">Preço</Label>
        <Select
          id="filtro-preco"
          value={filters.price}
          onChange={(e) => setFilters((p) => ({ ...p, price: e.target.value }))}
        >
          {priceRanges.map((r) => (
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
          value={filters.level}
          onChange={(e) => setFilters((p) => ({ ...p, level: e.target.value }))}
        >
          {levelRanges.map((r) => (
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
        <div className="space-y-2">
          {servers.map((server) => (
            <Check
              key={server}
              label={server}
              checked={filters.servers.includes(server)}
              onChange={() => toggle("servers", server)}
            />
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Características
        </legend>
        <div className="space-y-2">
          {features.map((feature) => (
            <Check
              key={feature.key}
              label={feature.label}
              checked={filters.features.includes(feature.key)}
              onChange={() => toggle("features", feature.key)}
            />
          ))}
        </div>
      </fieldset>
      <Button variant="ghost" className="w-full" onClick={() => setFilters(emptyFilters)}>
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
                className="pl-9"
              />
            </div>
            <Select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="Ordenar contas"
              className="sm:w-52"
            >
              <option value="recentes">Mais recentes</option>
              <option value="menor">Menor preço</option>
              <option value="maior">Maior preço</option>
              <option value="populares">Mais populares</option>
            </Select>
            <Button variant="outline" className="lg:hidden" onClick={() => setDrawerOpen(true)}>
              <SlidersHorizontal className="size-4" /> Filtros
            </Button>
          </div>

          <p className="mt-5 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{results.length} contas</span>{" "}
            encontradas
          </p>

          <div className="mt-6">
            {loading ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <AccountCardSkeleton key={i} />
                ))}
              </div>
            ) : results.length ? (
              <AccountGrid accounts={results} />
            ) : (
              <EmptyState
                icon={<PackageSearch className="size-6" />}
                title="Nenhuma conta encontrada."
                description="Experimente alterar seus filtros."
                actionLabel="Limpar filtros"
                onAction={() => {
                  setFilters(emptyFilters);
                  setQuery("");
                }}
              />
            )}
          </div>
        </div>
      </div>

      <Modal open={drawerOpen} onOpenChange={setDrawerOpen} title="Filtros">
        {filterPanel}
        <Button className="mt-6 w-full" onClick={() => setDrawerOpen(false)}>
          Ver {results.length} contas
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
