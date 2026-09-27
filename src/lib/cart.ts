import * as React from "react";

/**
 * Carrinho guardado no browser (localStorage): funciona sem conta e sobrevive ao login/registo
 * a meio da compra. Só guarda ids de contas — preços e disponibilidade vêm SEMPRE do servidor.
 */

export const MAX_CART_ITEMS = 10;
const KEY = "plutao-cart";
const EVENT = "plutao-cart-change";
const EMPTY: string[] = [];

let cache: string[] | null = null;

function read(): string[] {
  if (cache) return cache;
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    cache = Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string").slice(0, MAX_CART_ITEMS)
      : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(ids: string[]) {
  cache = ids;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    // Modo privado / armazenamento bloqueado: o carrinho vive só nesta página.
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) {
      cache = null; // mudou noutro separador
      callback();
    }
  };
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}

export type AddResult = "added" | "exists" | "full";

export function useCart() {
  // No servidor o carrinho está sempre vazio; no browser lê o localStorage.
  const ids = React.useSyncExternalStore(subscribe, read, () => EMPTY);

  return React.useMemo(
    () => ({
      ids,
      count: ids.length,
      has: (id: string) => ids.includes(id),
      add: (id: string): AddResult => {
        const current = read();
        if (current.includes(id)) return "exists";
        if (current.length >= MAX_CART_ITEMS) return "full";
        write([...current, id]);
        return "added";
      },
      remove: (id: string) => write(read().filter((item) => item !== id)),
      removeMany: (remove: string[]) => write(read().filter((item) => !remove.includes(item))),
      clear: () => write([]),
    }),
    [ids],
  );
}
