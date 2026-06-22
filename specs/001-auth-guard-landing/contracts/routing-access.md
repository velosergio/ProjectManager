# Contrato: Control de acceso y enrutamiento

**Fecha**: 2026-06-22 · **Feature**: 001-auth-guard-landing

Este contrato define el comportamiento observable del control de acceso (middleware). Es la
interfaz que la aplicación expone al usuario respecto a qué rutas son accesibles y a dónde se
redirige. Sirve de base para la verificación de `quickstart.md`.

## Entradas

- **Ruta solicitada** (`pathname`).
- **Estado de sesión** (`isLoggedIn`): derivado del JWT de NextAuth.

## Salidas (decisión del middleware)

Una de: `ALLOW` (continuar), `REDIRECT /`, `REDIRECT /dashboard/default`.

## Tabla de contrato

| # | Estado | Ruta solicitada | Resultado esperado |
|---|--------|-----------------|--------------------|
| C1 | No autenticado | `/dashboard/default` | `REDIRECT /` |
| C2 | No autenticado | `/dashboard/crm` (cualquier `/dashboard/*`) | `REDIRECT /` |
| C3 | No autenticado | `/chat` | `REDIRECT /` |
| C4 | No autenticado | `/mail` | `REDIRECT /` |
| C5 | No autenticado | `/` | `ALLOW` (muestra landing) |
| C6 | No autenticado | `/auth/v1/login` | `ALLOW` |
| C7 | No autenticado | `/auth/v1/register` | `ALLOW` |
| C8 | No autenticado | `/api/auth/...` | `ALLOW` (excluida del matcher) |
| C9 | No autenticado | ruta protegida inexistente | `REDIRECT /` (protección antes que 404) |
| C10 | Autenticado | `/` | `REDIRECT /dashboard/default` |
| C11 | Autenticado | `/auth/v1/login` | `REDIRECT /dashboard/default` |
| C12 | Autenticado | `/dashboard/default` | `ALLOW` |
| C13 | Autenticado | `/chat` | `ALLOW` |
| C14 | Cualquiera | `_next/static/...`, `favicon.ico`, `*.svg` | `ALLOW` (excluida del matcher) |

## Invariantes

- **Sin bucles**: ningún resultado de redirección produce otra redirección para la misma
  petición (los destinos `/` y `/dashboard/default` son terminales según el estado de sesión).
- **Sin fuga de contenido**: en `C1–C4` y `C9` nunca se renderiza contenido protegido antes de
  redirigir.
- **Rutas públicas siempre accesibles** sin sesión: `C5–C8`.

## Contrato de la landing (UI pública en `/`)

| Elemento | Requisito | FR |
|----------|-----------|-----|
| Navbar sticky glass | logo + enlaces Características/Planes + Iniciar sesión + Crear cuenta | FR-008 |
| Enlace "Iniciar sesión" | navega a `/auth/v1/login` | FR-015 |
| Enlace "Crear cuenta" | navega a `/auth/v1/register` | FR-015 |
| Hero | titular + 2 CTAs + mockup glass | FR-009 |
| Características | ≥ 7 ítems del roadmap | FR-010 |
| Multitenant/roles | aislamiento por organización + `admin`/`mango` | FR-011 |
| Planes | Gratuito/Pro/Pro+ + toggle mensual/anual + Wompi | FR-012, FR-013 |
| CTA final + footer | presentes | FR-014 |
| Movimiento reducido | animaciones reducidas con `prefers-reduced-motion` | FR-018 |
| Accesibilidad | navegable por teclado, contraste y etiquetado | FR-019 |
