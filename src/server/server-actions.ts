"use server";

import { cookies } from "next/headers";

import { requireUser } from "@/lib/auth";
import { ForbiddenError } from "@/lib/errors";
import { getTenantContext, MANGO_TENANT_COOKIE } from "@/lib/tenant-context";

// Falso positivo intencional (server-auth-actions): estas 3 acciones son de
// preferencias públicas (tema, layout del sidebar) que operan sobre las cookies
// del propio caller y se usan desde páginas no autenticadas (login/registro).
// No exponen datos sensibles ni afectan a otros usuarios.

// react-doctor-disable-next-line react-doctor/server-auth-actions
export async function getValueFromCookie(key: string): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(key)?.value;
}

// react-doctor-disable-next-line react-doctor/server-auth-actions
export async function setValueToCookie(
  key: string,
  value: string,
  options: { path?: string; maxAge?: number } = {},
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(key, value, {
    path: options.path ?? "/",
    maxAge: options.maxAge ?? 60 * 60 * 24 * 7, // default: 7 days
  });
}

// react-doctor-disable-next-line react-doctor/server-auth-actions
export async function getPreference<T extends string>(key: string, allowed: readonly T[], fallback: T): Promise<T> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(key);
  const value = cookie ? cookie.value.trim() : undefined;
  return allowed.includes(value as T) ? (value as T) : fallback;
}

/// Fija (o limpia, con `null`) el tenant activo que el super usuario `mango`
/// está inspeccionando. Solo el rol `mango` puede usarla (FR-021).
export async function setMangoActiveTenant(tenantId: string | null): Promise<void> {
  await requireUser();
  const ctx = await getTenantContext();
  if (ctx?.role !== "MANGO") {
    throw new ForbiddenError("Solo el rol mango puede seleccionar una organización.");
  }

  const cookieStore = await cookies();
  if (tenantId) {
    cookieStore.set(MANGO_TENANT_COOKIE, tenantId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 1 día
    });
  } else {
    cookieStore.delete(MANGO_TENANT_COOKIE);
  }
}
