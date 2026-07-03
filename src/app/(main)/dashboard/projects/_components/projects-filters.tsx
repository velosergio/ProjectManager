"use client";

import * as React from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { FilterX, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  PROJECT_PRIORITY_LABELS,
  PROJECT_PRIORITY_ORDER,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_ORDER,
} from "@/lib/projects/labels";

import type { FormCatalogs } from "./types";

const ALL = "all";
const SEARCH_DEBOUNCE_MS = 300;

interface ProjectsFiltersProps {
  catalogs: FormCatalogs;
}

/// Buscador y filtros combinables del listado (FR-012). Todo vive en la URL
/// (`searchParams`): filtros compartibles y render en servidor.
export function ProjectsFilters({ catalogs }: ProjectsFiltersProps) {
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

  const hasFilters =
    Boolean(searchParams.get("q")) ||
    ["status", "priority", "ownerId", "clientId", "processTypeId", "tagId"].some((key) => searchParams.get(key));

  const selectFilters: Array<{
    key: string;
    ariaLabel: string;
    placeholder: string;
    options: Array<{ value: string; label: string }>;
  }> = [
    {
      key: "status",
      ariaLabel: "Filtrar por estado",
      placeholder: "Estado",
      options: PROJECT_STATUS_ORDER.map((status) => ({ value: status, label: PROJECT_STATUS_LABELS[status] })),
    },
    {
      key: "priority",
      ariaLabel: "Filtrar por prioridad",
      placeholder: "Prioridad",
      options: PROJECT_PRIORITY_ORDER.map((priority) => ({
        value: priority,
        label: PROJECT_PRIORITY_LABELS[priority],
      })),
    },
    {
      key: "ownerId",
      ariaLabel: "Filtrar por responsable",
      placeholder: "Responsable",
      options: catalogs.members.map((member) => ({ value: member.id, label: member.name })),
    },
    {
      key: "clientId",
      ariaLabel: "Filtrar por cliente",
      placeholder: "Cliente",
      options: catalogs.clients.map((client) => ({ value: client.id, label: client.name })),
    },
    {
      key: "processTypeId",
      ariaLabel: "Filtrar por tipo de proceso",
      placeholder: "Tipo",
      options: catalogs.processTypes.map((type) => ({ value: type.id, label: type.name })),
    },
    {
      key: "tagId",
      ariaLabel: "Filtrar por etiqueta",
      placeholder: "Etiqueta",
      options: catalogs.tags.map((tag) => ({ value: tag.id, label: tag.name })),
    },
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nombre de proyecto o cliente…"
          className="ps-9"
          aria-label="Buscar proyectos"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {selectFilters.map((filter) => (
          <Select
            key={filter.key}
            value={searchParams.get(filter.key) ?? ALL}
            onValueChange={(value) => applyParam(filter.key, value)}
          >
            <SelectTrigger className="w-36" aria-label={filter.ariaLabel}>
              <SelectValue placeholder={filter.placeholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{filter.placeholder}: todos</SelectItem>
              {filter.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
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
