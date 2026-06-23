import { FeatureNotInPlanError, QuotaExceededError } from "@/lib/errors";

export interface GatingHttp {
  status: number;
  message: string;
}

/// Traduce los errores de gating a estado HTTP y mensaje en español para el
/// usuario (FR-011/FR-012). Devuelve `null` si el error no es de gating.
export function mapGatingError(error: unknown): GatingHttp | null {
  if (error instanceof QuotaExceededError) {
    return { status: 409, message: `${error.message} Amplía tu plan para continuar.` };
  }
  if (error instanceof FeatureNotInPlanError) {
    return { status: 403, message: error.message };
  }
  return null;
}
