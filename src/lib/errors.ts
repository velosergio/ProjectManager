// Errores de dominio compartidos por la capa de acceso a datos y el gating.

/// No hay un tenant resoluble en el contexto (sesión sin tenant, o `mango` sin
/// tenant seleccionado) para una operación que lo exige.
export class MissingTenantContextError extends Error {
  constructor(message = "No hay un tenant en el contexto de la petición.") {
    super(message);
    this.name = "MissingTenantContextError";
  }
}

/// Acceso denegado: el rol del usuario no autoriza la operación solicitada.
export class ForbiddenError extends Error {
  constructor(message = "Acceso denegado.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/// Se superaría la cuota del plan vigente para el recurso indicado.
export class QuotaExceededError extends Error {
  constructor(
    readonly resource: "projects" | "users" | "storage",
    readonly limit: number,
    readonly current: number,
  ) {
    super(`Has alcanzado el límite de tu plan para ${resource} (${current}/${limit}).`);
    this.name = "QuotaExceededError";
  }
}

/// La función solicitada no está incluida en el plan vigente.
export class FeatureNotInPlanError extends Error {
  constructor(readonly feature: string) {
    super(`La función "${feature}" requiere un plan superior.`);
    this.name = "FeatureNotInPlanError";
  }
}
