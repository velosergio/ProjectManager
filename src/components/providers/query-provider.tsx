"use client";

import { type ReactNode, useState } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/// Provider de TanStack Query para las islas cliente del dashboard (convención
/// transversal de la FASE 4): un QueryClient por sesión de navegación, con
/// query keys escopadas por tenant e invalidación tras cada mutación.
export function QueryProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, refetchOnWindowFocus: false },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
