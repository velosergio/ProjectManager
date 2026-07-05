"use client";

import { useRouter } from "next/navigation";

import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PanelFilterSelectProps {
  paramKey: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  ariaLabel: string;
  className?: string;
}

/// Select de filtro del panel: persiste la selección en `searchParams` para
/// que las secciones RSC se rendericen con datos reales filtrados.
export function PanelFilterSelect({ paramKey, value, options, ariaLabel, className }: PanelFilterSelectProps) {
  const router = useRouter();

  const handleChange = (next: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set(paramKey, next);
    router.replace(`${url.pathname}?${url.searchParams.toString()}`, { scroll: false });
  };

  return (
    <Select value={value} onValueChange={handleChange}>
      <SelectTrigger className={className} aria-label={ariaLabel}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
