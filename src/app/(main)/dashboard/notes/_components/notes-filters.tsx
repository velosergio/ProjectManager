"use client";

import * as React from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { FilterX, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NOTE_SCOPES } from "@/lib/notes/schemas";

import { NOTE_SCOPE_LABELS } from "./types";

const ALL = "all";
const SEARCH_DEBOUNCE_MS = 300;

/// Buscador y filtro por alcance del listado central de notas (FR-021).
/// Todo vive en la URL (`searchParams`): filtros compartibles y render en
/// servidor (mismo patrón que `clients-filters.tsx`).
export function NotesFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = React.useState(searchParams.get("q") ?? "");

  const applyParam = React.useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams);
      if (value === null || value === "" || value === ALL) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      params.delete("page"); // cualquier cambio de filtro vuelve a la página 1
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  // Debounce del buscador: navega cuando el usuario deja de escribir.
  React.useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (search === current) {
      return;
    }
    const timer = setTimeout(() => applyParam("q", search.trim() || null), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search, searchParams, applyParam]);

  const hasFilters = Boolean(searchParams.get("q")) || Boolean(searchParams.get("scope"));

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por título o contenido…"
          className="ps-9"
          aria-label="Buscar notas"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={searchParams.get("scope") ?? ALL} onValueChange={(value) => applyParam("scope", value)}>
          <SelectTrigger className="w-44" aria-label="Filtrar por alcance">
            <SelectValue placeholder="Alcance" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Alcance: todos</SelectItem>
            {NOTE_SCOPES.map((scope) => (
              <SelectItem key={scope} value={scope}>
                {NOTE_SCOPE_LABELS[scope]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              router.replace(pathname, { scroll: false });
            }}
          >
            <FilterX data-icon="inline-start" />
            Limpiar filtros
          </Button>
        )}
      </div>
    </div>
  );
}
