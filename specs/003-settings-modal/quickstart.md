# Quickstart — Validación del Modal de Configuración

Guía para validar la feature de extremo a extremo. No contiene código de implementación; ese detalle
vive en `tasks.md` y en la fase de implementación.

## Prerrequisitos

- Base de datos MySQL/MariaDB accesible vía `DATABASE_URL` (`.env.local`).
- Dependencias instaladas (`npm install`).
- Una sesión válida (usuario con contraseña, p. ej. creado por el registro o el seed).

## Setup

```bash
# 1) Aplicar la migración del modelo NotificationPreference y regenerar el cliente
npm run db:migrate -- --name notification_preferences

# 2) Verificar tipos (confirma que @/generated/prisma/client exporta NotificationPreference)
npx tsc --noEmit
```

## Puertas de calidad (obligatorias antes de fusionar)

```bash
npm run check        # Biome: lint + formato al 100 %
npx tsc --noEmit     # TypeScript sin errores
npm run build        # build de producción sin errores
npm run doctor       # React Doctor sin diagnósticos
```

Aplicar `npm run check:fix` si Biome propone reordenar imports/clases.

## Verificación manual en navegador

```bash
npm run dev
```

Escenarios (mapeados a las historias de la spec):

1. **Navbar limpio (US5/FR-015)**: el navbar superior ya **no** muestra el control de diseño ni el
   conmutador de cuenta; conserva la búsqueda y el conmutador de tema claro/oscuro.
2. **Apertura por sección (US1–US4/FR-002)**: en el pie del sidebar, el menú de usuario abre el modal
   en la sección correcta según el ítem pulsado (Cuenta / Apariencia / Notificaciones / Plan).
3. **Apariencia (US1)**: cambiar tema/fuente/modo/disposición/sidebar surte efecto inmediato y
   persiste tras recargar. "Restaurar valores por defecto" revierte todo.
4. **Cuenta — perfil (US2)**: guardar nombre y URL de avatar refresca el avatar (previsualización y
   sidebar). El correo es de solo lectura.
5. **Cuenta — contraseña (US2/FR-008)**: con la actual incorrecta, muestra error en español y no
   cambia nada; con la correcta, éxito y el formulario se limpia.
6. **Notificaciones (US3)**: alternar un interruptor persiste tras cerrar y reabrir el modal; ante un
   error de guardado, el interruptor revierte y aparece un aviso.
7. **Plan (US4)**: muestra el plan vigente y el rol reales de la sesión (o "Sin plan").
8. **Cerrar sesión (US5/FR-014)**: termina la sesión y redirige a `/auth/v1/login`.

## Resultado esperado

- Las cuatro puertas de calidad pasan al 100 % sin trampas.
- Los 8 escenarios manuales se comportan según lo descrito.
- La tabla `notification_preferences` existe y se rellena con defaults al primer acceso a la pestaña.
