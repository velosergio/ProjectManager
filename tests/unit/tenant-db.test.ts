import { describe, expect, it } from "vitest";

import { applyTenantScope } from "@/lib/tenant-db";

const TENANT = "tenant_A";

describe("applyTenantScope", () => {
  it("inyecta tenantId en el where de lecturas", () => {
    const out = applyTenantScope("findMany", { where: { name: "x" } }, TENANT);
    expect(out.where).toEqual({ name: "x", tenantId: TENANT });
  });

  it("añade tenantId en findUnique (extendedWhereUnique)", () => {
    const out = applyTenantScope("findUnique", { where: { id: "p1" } }, TENANT);
    expect(out.where).toEqual({ id: "p1", tenantId: TENANT });
  });

  it("fija tenantId en create ignorando el entrante", () => {
    const out = applyTenantScope("create", { data: { name: "x", tenantId: "otro" } }, TENANT);
    expect(out.data).toEqual({ name: "x", tenantId: TENANT });
  });

  it("fija tenantId en cada fila de createMany", () => {
    const out = applyTenantScope("createMany", { data: [{ name: "a" }, { name: "b" }] }, TENANT);
    expect(out.data).toEqual([
      { name: "a", tenantId: TENANT },
      { name: "b", tenantId: TENANT },
    ]);
  });

  it("escopa where y create en upsert", () => {
    const out = applyTenantScope("upsert", { where: { id: "p1" }, create: { name: "x" }, update: {} }, TENANT);
    expect(out.where).toEqual({ id: "p1", tenantId: TENANT });
    expect(out.create).toEqual({ name: "x", tenantId: TENANT });
  });

  it("escopa update y delete", () => {
    expect(applyTenantScope("update", { where: { id: "p1" }, data: {} }, TENANT).where).toEqual({
      id: "p1",
      tenantId: TENANT,
    });
    expect(applyTenantScope("deleteMany", {}, TENANT).where).toEqual({ tenantId: TENANT });
  });
});
