# Quickstart: Verificación de auth global y landing pública

**Fecha**: 2026-06-22 · **Feature**: 001-auth-guard-landing

Guía para validar la feature de extremo a extremo. Los escenarios provienen de los criterios de
aceptación del [spec](./spec.md) y del [contrato de enrutamiento](./contracts/routing-access.md).

## Prerrequisitos

- Dependencias instaladas (incluye la nueva `motion`): `npm install`
- Base de datos configurada y migrada (auth existente): variables de entorno en `.env`
- Al menos un usuario registrado para las pruebas autenticadas (vía `/auth/v1/register`)

## Arranque

```bash
npm run dev
```

Abrir `http://localhost:3000`.

## Puertas de calidad (constitución)

Deben pasar al 100 % antes de dar por completada la feature:

```bash
npm run check      # biome (lint + formato)
npm run doctor     # React Doctor
npm run build      # compilación de Next.js / TypeScript
```

## Escenarios de validación

### A. Protección de vistas internas (US1)

1. En una ventana **sin sesión** (o de incógnito), visitar `http://localhost:3000/dashboard/default`.
   - **Esperado**: redirige a `/` (landing). No se ve contenido del dashboard. *(C1)*
2. Repetir con `/chat`, `/mail`, `/dashboard/crm`.
   - **Esperado**: todas redirigen a `/`. *(C2–C4)*
3. Visitar una ruta interna inexistente, p. ej. `/dashboard/no-existe`.
   - **Esperado**: redirige a `/`. *(C9)*

### B. Landing pública (US2)

4. Visitar `/` sin sesión.
   - **Esperado**: se muestran navbar, hero, características (≥ 7), sección multitenant/roles,
     planes, CTA final y footer. *(FR-007 a FR-014)*
5. Pulsar "Iniciar sesión" en el navbar.
   - **Esperado**: navega a `/auth/v1/login`. *(C6, FR-015)*
6. Volver a `/`, pulsar "Crear cuenta".
   - **Esperado**: navega a `/auth/v1/register`. *(C7, FR-015)*
7. En la sección de planes, alternar el conmutador mensual/anual.
   - **Esperado**: los precios mostrados cambian según el ciclo. *(FR-013)*
8. Recorrer la página solo con teclado (Tab/Shift+Tab/Enter).
   - **Esperado**: foco visible, orden lógico, todos los CTAs accesibles. *(FR-019, SC-007)*
9. Activar "reducir movimiento" en el sistema operativo y recargar `/`.
   - **Esperado**: las animaciones se reducen/desactivan; el contenido permanece legible. *(FR-018, SC-006)*
10. Revisar en viewport móvil (DevTools, ~375px) y escritorio.
    - **Esperado**: layout responsivo y legible en ambos. *(FR-020, SC-005)*

### C. Redirección del usuario autenticado (US3)

11. Iniciar sesión con un usuario válido.
12. Con sesión activa, visitar `/`.
    - **Esperado**: redirige a `/dashboard/default`. *(C10)*
13. Con sesión activa, visitar `/auth/v1/login`.
    - **Esperado**: redirige a `/dashboard/default`. *(C11)*
14. Con sesión activa, navegar por `/dashboard/default` y `/chat`.
    - **Esperado**: acceso normal, sin redirecciones. *(C12–C13)*

### D. Rutas públicas y assets

15. Sin sesión, confirmar que `/auth/v1/login` y `/auth/v1/register` cargan directamente. *(C6–C7)*
16. Confirmar que los assets estáticos cargan sin redirección (la página renderiza estilos e
    iconos correctamente). *(C14)*

## Criterio de aceptación global

La feature se considera verificada cuando todos los escenarios A–D se comportan como se espera y
las tres puertas de calidad pasan al 100 %.
