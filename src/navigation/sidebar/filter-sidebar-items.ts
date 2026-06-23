import { type AccessContext, canAccess } from "@/lib/authz";

import type { NavGroup, NavMainItem } from "./sidebar-items";

function filterItem(item: NavMainItem, ctx: AccessContext): NavMainItem | null {
  if (!canAccess(ctx, item)) {
    return null;
  }

  if ("subItems" in item && item.subItems) {
    const subItems = item.subItems.filter((sub) => canAccess(ctx, sub));
    if (subItems.length === 0) {
      return null;
    }
    return { ...item, subItems };
  }

  return item;
}

/// Filtra los grupos del sidebar según el rol y el plan del usuario, eliminando
/// items no accesibles y grupos que queden vacíos (FR-022). La ocultación es
/// solo presentación; las rutas se protegen además en el servidor (FR-017).
export function filterSidebarItems(groups: NavGroup[], ctx: AccessContext): NavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.map((item) => filterItem(item, ctx)).filter((item): item is NavMainItem => item !== null),
    }))
    .filter((group) => group.items.length > 0);
}
