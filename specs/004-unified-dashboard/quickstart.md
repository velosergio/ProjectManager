# Quickstart: validación del panel unificado

**Fase 1** · Feature `004-unified-dashboard` · 2026-07-02

Guía de validación manual de extremo a extremo. Referencias: [spec.md](./spec.md) (criterios
SC-001…SC-006), [data-model.md](./data-model.md) (inventario de widgets y traducciones).

## Prerrequisitos

- `.env.local` configurado (`DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`) y base de datos
  accesible con migraciones aplicadas (`npm run db:migrate`) y seed (`npm run db:seed`).
- Un usuario válido para iniciar sesión.
- Dependencias instaladas (`npm install`, que regenera el cliente Prisma vía `postinstall`).

## Arranque

```bash
npm run dev
```

Abrir `http://localhost:3000/login`, iniciar sesión y navegar a `/dashboard`.

## Escenario 1 — Los 12 widgets integrados (SC-001, US1)

En `/dashboard`, verificar que aparecen, además del contenido previo del panel (saludo, resumen,
tareas, proyectos, calendario lateral, notas):

- [ ] Sección **Negocio**: Reuniones próximas, Meta mensual de propuestas, Oportunidades recientes (tabla con filtros y paginación funcionales)
- [ ] Sección **Finanzas**: Resumen de gastos (gráfica de líneas), Distribución de cuentas (gráfica circular), Atajos
- [ ] Sección **Analítica**: Fuentes de tráfico (gráfica de barras con pestañas)
- [ ] Sección **Academia**: 4 tarjetas KPI (Estudiantes atendidos, Asistencia promedio, Tareas asignadas, Clases de hoy), Horario de clases, Estado de tareas, Rendimiento destacado, Próximos eventos (Academia)
- [ ] Sin errores en la consola del navegador ni del servidor

## Escenario 2 — Coherencia visual (SC-002, SC-003, US2)

- [ ] Cambiar tema claro ⇄ oscuro (ajustes de preferencias): todos los widgets se adaptan, las gráficas usan los tokens de color del tema, sin texto ilegible
- [ ] Viewport móvil (~375 px): una sola columna, sin scroll horizontal, tabla de oportunidades desplazable sin romper el layout
- [ ] Viewport tablet (~768 px) y escritorio (~1440 px): los grids se reorganizan según lo previsto en el plan
- [ ] Las secciones tienen encabezados claros y la agrupación temática permite localizar cualquier widget rápidamente

## Escenario 3 — Idioma (SC-004, FR-006)

- [ ] Todos los títulos, etiquetas, botones, tooltips y leyendas de gráficas de los widgets integrados están en español con acentuación correcta (ver tabla de traducciones en data-model.md)
- [ ] Ningún resto de textos de plantilla en inglés en el panel unificado (los datos ficticios con nombres propios pueden conservarse)

## Escenario 4 — Dashboards de origen intactos (SC-005, FR-008, US3)

- [ ] `/dashboard/crm`, `/dashboard/finance`, `/dashboard/analytics` y `/dashboard/academy` cargan sin errores y muestran su contenido original (en inglés, sin cambios)
- [ ] Las entradas CRM, Finance, Analytics y Academy siguen en el sidebar

## Escenario 5 — Puertas de calidad (constitución)

```bash
npm run check    # Biome: 0 errores, 0 advertencias
npm run doctor   # React Doctor: sin diagnósticos pendientes
npm run build    # TypeScript + build de producción sin errores
```

- [ ] Las tres puertas pasan al 100 % sin supresiones nuevas sin justificar

## Escenario 6 — Tras la limpieza (solo cuando se apruebe; SC-006, FR-010)

Ejecutar únicamente después de la aprobación humana y de completar la fase de limpieza:

- [ ] Las carpetas `crm/`, `finance/`, `analytics/`, `academy/` ya no existen bajo `src/app/(main)/dashboard/`
- [ ] El sidebar ya no muestra CRM, Finance, Analytics ni Academy y ninguna otra entrada se rompió
- [ ] `/dashboard` sigue funcionando íntegro (los 12 widgets y el contenido previo)
- [ ] `npm run build` pasa y una búsqueda de imports hacia las carpetas eliminadas no arroja resultados

## Resultado esperado

Los escenarios 1–5 pasan en su totalidad antes de solicitar la validación humana. El escenario 6
solo aplica tras aprobar y ejecutar la fase de limpieza.
