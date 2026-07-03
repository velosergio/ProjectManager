import { describe, expect, it } from "vitest";

import { type AccessContext, canAccess } from "@/lib/authz";
import { filterSidebarItems } from "@/navigation/sidebar/filter-sidebar-items";
import { type NavGroup, sidebarItems } from "@/navigation/sidebar/sidebar-items";

const ADMIN_FREE: AccessContext = { role: "ADMIN", planCode: "GRATUITO" };
const ADMIN_PRO: AccessContext = { role: "ADMIN", planCode: "PRO" };
const MANGO: AccessContext = { role: "MANGO", planCode: null };

function ids(ctx: AccessContext): string[] {
  return filterSidebarItems(sidebarItems, ctx).flatMap((g) => g.items.map((i) => i.id));
}

describe("autorización por rol y plan (SC-009 / FR-017)", () => {
  it("la consola mango requiere rol MANGO", () => {
    expect(canAccess(ADMIN_FREE, { requiredRole: "MANGO" })).toBe(false);
    expect(canAccess(MANGO, { requiredRole: "MANGO" })).toBe(true);
  });

  it("una feature del plan se deniega si no está incluida", () => {
    expect(canAccess(ADMIN_FREE, { requiredFeature: "executiveDashboard" })).toBe(false);
    expect(canAccess(ADMIN_PRO, { requiredFeature: "executiveDashboard" })).toBe(true);
    // mango tiene acceso transversal a las features.
    expect(canAccess(MANGO, { requiredFeature: "executiveDashboard" })).toBe(true);
  });

  it("el menú filtrado refleja el rol", () => {
    expect(ids(ADMIN_FREE)).not.toContain("mango-console");
    expect(ids(MANGO)).toContain("mango-console");
    expect(ids(ADMIN_FREE)).toContain("projects");
  });

  // Los demos con gating por plan salieron del sidebar en el spec 004; el
  // filtrado por `requiredFeature` se verifica con un grupo sintético.
  it("los items con requiredFeature se filtran según el plan", () => {
    const gated: NavGroup[] = [
      { id: 99, items: [{ id: "gantt-item", title: "Gantt", url: "/gantt", requiredFeature: "gantt" }] },
    ];
    const idsFor = (ctx: AccessContext) => filterSidebarItems(gated, ctx).flatMap((g) => g.items.map((i) => i.id));
    expect(idsFor(ADMIN_FREE)).not.toContain("gantt-item"); // GRATUITO no incluye gantt
    expect(idsFor(ADMIN_PRO)).toContain("gantt-item");
    expect(idsFor(MANGO)).toContain("gantt-item"); // acceso transversal
  });
});
