"use client";

import * as React from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { FilterX, FolderKanban, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import type { TagOption } from "./types";

const ALL = "all";
const SEARCH_DEBOUNCE_MS = 300;

interface ClientsFiltersProps {
  tags: TagOption[];
}

/// Buscador y filtros combinables del listado de clientes (FR-009/FR-010).
/// Todo vive en la URL (`searchParams`): filtros compartibles y render en
/// servidor (mismo patrón que `projects-filters.tsx`).
export function ClientsFilters({ tags }: ClientsFiltersProps) {
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

  const activeOnly = searchParams.get("active") === "true";
  const hasFilters = Boolean(searchParams.get("q")) || Boolean(searchParams.get("tagId")) || activeOnly;

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nombre, email o teléfono…"
          className="ps-9"
          aria-label="Buscar clientes"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={searchParams.get("tagId") ?? ALL} onValueChange={(value) => applyParam("tagId", value)}>
          <SelectTrigger className="w-40" aria-label="Filtrar por etiqueta">
            <SelectValue placeholder="Etiqueta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Etiqueta: todas</SelectItem>
            {tags.map((tag) => (
              <SelectItem key={tag.id} value={tag.id}>
                {tag.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={activeOnly ? "default" : "outline"}
          size="sm"
          aria-pressed={activeOnly}
          onClick={() => applyParam("active", activeOnly ? null : "true")}
        >
          <FolderKanban data-icon="inline-start" />
          Con proyectos activos
        </Button>
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
