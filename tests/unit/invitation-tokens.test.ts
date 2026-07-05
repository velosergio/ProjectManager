import { describe, expect, it } from "vitest";

import {
  hashInvitationToken,
  INVITATION_TTL_DAYS,
  invitationExpiry,
  isInvitationTokenValid,
} from "@/lib/members/tokens";

// Tokens de invitación (US1, research D1): solo se persiste el hash, caducan a
// los 7 días y son de un solo uso (FR-002/FR-005).

describe("hashInvitationToken", () => {
  it("es determinista y no expone el token en claro", () => {
    const token = "token-de-prueba";
    const hash = hashInvitationToken(token);
    expect(hash).toBe(hashInvitationToken(token));
    expect(hash).not.toContain(token);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("tokens distintos producen hashes distintos", () => {
    expect(hashInvitationToken("uno")).not.toBe(hashInvitationToken("dos"));
  });
});

describe("invitationExpiry", () => {
  it("caduca exactamente a los 7 días de la emisión", () => {
    const issued = new Date("2026-07-03T12:00:00.000Z");
    const expiry = invitationExpiry(issued);
    const expected = issued.getTime() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000;
    expect(expiry.getTime()).toBe(expected);
    expect(INVITATION_TTL_DAYS).toBe(7);
  });
});

describe("isInvitationTokenValid", () => {
  const now = new Date("2026-07-03T12:00:00.000Z");
  const future = new Date("2026-07-04T12:00:00.000Z");
  const past = new Date("2026-07-02T12:00:00.000Z");

  it("vigente: sin usar y con caducidad futura", () => {
    expect(isInvitationTokenValid({ usedAt: null, expiresAt: future }, now)).toBe(true);
  });

  it("inválido si ya fue usado (un solo uso)", () => {
    expect(isInvitationTokenValid({ usedAt: past, expiresAt: future }, now)).toBe(false);
  });

  it("inválido si está caducado (incluido el instante exacto)", () => {
    expect(isInvitationTokenValid({ usedAt: null, expiresAt: past }, now)).toBe(false);
    expect(isInvitationTokenValid({ usedAt: null, expiresAt: now }, now)).toBe(false);
  });
});
