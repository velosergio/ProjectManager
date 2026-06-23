import { describe, expect, it } from "vitest";

import { FeatureNotInPlanError, QuotaExceededError } from "@/lib/errors";
import { assertFeature, assertWithinQuota } from "@/lib/plans/gating";

type FakeOpts = { maxProjects?: number | null; projectCount?: number };

function fakeDb(opts: FakeOpts) {
  return {
    subscription: {
      findUnique: async () => ({
        plan: { maxProjects: opts.maxProjects ?? null, maxUsers: null, maxStorageBytes: null },
      }),
    },
    project: { count: async () => opts.projectCount ?? 0 },
    user: { count: async () => 0 },
    fileAsset: { aggregate: async () => ({ _sum: { sizeBytes: null } }) },
  } as unknown as Parameters<typeof assertWithinQuota>[0];
}

describe("assertFeature", () => {
  it("permite una feature incluida en el plan", () => {
    expect(() => assertFeature("GRATUITO", "kanban")).not.toThrow();
  });

  it("bloquea una feature no incluida", () => {
    expect(() => assertFeature("GRATUITO", "gantt")).toThrow(FeatureNotInPlanError);
  });
});

describe("assertWithinQuota", () => {
  it("no lanza con cuota ilimitada (null)", async () => {
    await expect(
      assertWithinQuota(fakeDb({ maxProjects: null, projectCount: 999 }), "t1", "projects"),
    ).resolves.toBeUndefined();
  });

  it("permite crear cuando queda cupo", async () => {
    await expect(
      assertWithinQuota(fakeDb({ maxProjects: 3, projectCount: 2 }), "t1", "projects"),
    ).resolves.toBeUndefined();
  });

  it("lanza QuotaExceededError al alcanzar el límite", async () => {
    await expect(
      assertWithinQuota(fakeDb({ maxProjects: 3, projectCount: 3 }), "t1", "projects"),
    ).rejects.toBeInstanceOf(QuotaExceededError);
  });
});
