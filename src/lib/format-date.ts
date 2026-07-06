import { format } from "date-fns";
import { es } from "date-fns/locale";

/// Formateo determinista de fechas «solo día».
///
/// Las fechas de calendario (inicio, cierre, vencimiento) se almacenan como
/// medianoche UTC. Formatearlas con `date-fns` directamente usa la zona horaria
/// local del runtime, por lo que el servidor (UTC en Docker) y el navegador
/// (p. ej. UTC-5) producen días distintos y provocan un error de hidratación
/// (React #418). Aquí reinterpretamos los campos de calendario UTC como una
/// fecha local, de modo que el resultado es idéntico en servidor y cliente.

/// Convierte una fecha «solo día» (medianoche UTC) en un `Date` cuyos campos
/// locales coinciden con el día UTC, para formatear de forma independiente de
/// la zona horaria.
function toCalendarDate(date: Date): Date {
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/// Formatea una fecha «solo día» con `date-fns` (locale español) de forma
/// determinista: el mismo resultado en servidor y cliente.
export function formatCalendarDate(date: Date, pattern: string): string {
  return format(toCalendarDate(date), pattern, { locale: es });
}
