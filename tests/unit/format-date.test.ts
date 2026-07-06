import { describe, expect, it } from "vitest";

import { formatCalendarDate } from "@/lib/format-date";

/// Las fechas «solo día» se almacenan como medianoche UTC y deben formatearse
/// según su día de calendario UTC, sin depender de la zona horaria del runtime.
/// Así el servidor (UTC) y el navegador (p. ej. UTC-5) coinciden y no se produce
/// el error de hidratación de React #418.
describe("formatCalendarDate", () => {
  it("formatea el día de calendario UTC, no el local", () => {
    // Medianoche UTC del 5 de julio: en UTC-5 el instante local es el 4 de
    // julio, pero el día de calendario que queremos mostrar es el 5.
    const date = new Date(Date.UTC(2026, 6, 5));
    expect(formatCalendarDate(date, "yyyy-MM-dd")).toBe("2026-07-05");
  });

  it("usa el locale español", () => {
    const date = new Date(Date.UTC(2026, 6, 5));
    expect(formatCalendarDate(date, "d 'de' MMMM yyyy")).toBe("5 de julio 2026");
  });

  it("es estable en el límite de fin de día (23:30 UTC)", () => {
    const date = new Date("2026-07-05T23:30:00.000Z");
    expect(formatCalendarDate(date, "d MMM")).toBe("5 jul");
  });
});
