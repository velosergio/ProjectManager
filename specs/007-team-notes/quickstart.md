# Quickstart — Validación de Equipo de trabajo y Notas (FASE 4)

**Spec**: [spec.md](./spec.md) · **Contratos**: [contracts/server-actions.md](./contracts/server-actions.md)

Guía de validación de extremo a extremo. No contiene código de implementación; los detalles
viven en `tasks.md` y en los contratos.

## Prerrequisitos

```bash
cp .env.example .env.local        # si no existe; DATABASE_URL apuntando a MySQL local
npm install                        # postinstall regenera el cliente Prisma
npm run db:migrate                 # aplica la migración <ts>_team_notes
npm run db:seed                    # planes con maxUsers (Gratuito limitado)
npm run dev                        # http://localhost:3000
```

Datos de partida: un tenant con usuario `ADMIN` (registro normal) y al menos un proyecto con
tareas (FASE 2). `SMTP_HOST` **sin** configurar es válido: el correo se registra en la consola
del servidor y la UI siempre muestra el enlace de invitación.

## Escenario 1 — Miembros: invitar, activar, revocar (US1)

1. Como admin, abrir **Ajustes → Miembros** (avatar del sidebar). Verificar el listado con
   nombre, email, rol y estado. Con rol no-admin la pestaña no existe.
2. Invitar `miembro@demo.test` con rol `member`. Verificar: aparece como **invitado**, la UI
   ofrece **copiar enlace** y (sin SMTP) el correo sale por consola.
3. Abrir el enlace `/invite?token=…` en una ventana de incógnito, definir nombre y contraseña.
   Verificar: redirección a login, inicio de sesión correcto, estado **activo** en el listado.
4. Invitar de nuevo el mismo email → error claro sin crear duplicado.
5. Repetir invitaciones hasta alcanzar `maxUsers` del plan Gratuito → la invitación se bloquea
   indicando el límite del plan (activos + invitados cuentan).
6. Cancelar una invitación pendiente → desaparece del listado y libera cupo (reintentar paso 5).
7. Cambiar el rol del nuevo miembro a `manager` → se refleja en el listado. Intentar cambiar el
   propio rol → rechazado.
8. Desactivar al miembro mientras tiene sesión abierta en la otra ventana → su siguiente
   navegación o acción redirige a login (SC-003). Reactivarlo → puede volver a entrar.
9. Con un solo admin activo, intentar desactivarlo o degradarlo → bloqueado con mensaje del
   último administrador.

## Escenario 2 — Equipos (US2)

1. Sidebar → **Equipos** → crear «Diseño» con descripción y 2 miembros. Verificar listado con
   conteo de miembros.
2. Abrir el detalle: composición con rol y estado de cada miembro; añadir y retirar un miembro.
3. Guardar un equipo sin nombre → validación en español, no se crea.
4. (Tras Escenario 3) eliminar un equipo con notas → la confirmación indica cuántas notas se
   eliminarán; al confirmar, equipo y notas desaparecen.

## Escenario 3 — Notas: CRUD, alcance, búsqueda (US3)

1. Sidebar → **Notas** → crear una nota **global** (título + contenido). Verificar autor y fecha.
2. Crear notas con alcance **proyecto**, **tarea** y **equipo** seleccionando la referencia. Con
   alcance «proyecto» sin proyecto elegido → validación, no guarda.
3. Filtrar por alcance «equipo» → solo notas de equipo, con el equipo indicado.
4. Buscar un término del contenido (probar con acentos/mayúsculas) → coincide por título y
   contenido; sin resultados → estado vacío con el término y opción de limpiar.
5. Permisos: como `member`, editar una nota ajena → sin acción disponible y rechazo en servidor;
   como `manager`/`admin` → permitido. Como `viewer` → solo lectura de todas las notas del
   tenant (incluidas las de equipos ajenos: la lectura es organizacional).
6. Editar una nota propia → `updatedAt` visible actualizado.

## Escenario 4 — Notas en contexto (US4)

1. Detalle de un proyecto → sección de notas con solo las de ese proyecto; crear una desde ahí
   (sin elegir alcance) → queda vinculada al proyecto.
2. En la lista de tareas del proyecto, acción **Notas** de una tarea → panel lateral con sus
   notas; crear una en contexto.
3. Detalle de un equipo → notas del equipo de más reciente a más antigua.
4. Eliminar el proyecto → la confirmación avisa de las notas asociadas; tras confirmar, sus
   notas (y las de sus tareas) ya no existen en el listado central.

## Escenario 5 — Panel (US5)

1. Panel (`/dashboard`): el widget **Notas recientes** muestra las notas reales más recientes
   con enlace; sin contenido demo. Organización sin notas → estado vacío con CTA.
2. Acción rápida **Nueva nota** → formulario operativo; al guardar, toast y nota visible en el
   widget de inmediato (SC-005).
3. «Ver todas» → `/dashboard/notes`.

## Escenario 6 — Carga por miembro (US6)

1. Asignar tareas y proyectos a distintos miembros (FASE 2).
2. Ajustes → Miembros: cada miembro muestra tareas activas (≠ finalizadas) y proyectos activos
   (≠ finalizados/archivados) asignados; sin asignaciones → ceros sin errores.

## Aislamiento multitenant (SC-004)

Con dos tenants (registrar una segunda organización): miembros, equipos y notas de A nunca
aparecen en B (listados, detalles, búsqueda, widget). El rol `mango` puede inspeccionar ambos
desde su consola con el selector de tenant.

## Pruebas automatizadas y puertas de calidad

```bash
npm run test        # Vitest: unit (schemas, tokens, authz) + integración (BD real migrada)
npm run check       # Biome al 100 %
npm run doctor      # React Doctor sin diagnósticos
npm run build       # TypeScript + build sin errores
```

Las pruebas de integración cubren: cuota con invitados (incl. carrera en el límite), último
admin, revocación, XOR de alcance, permisos por rol vía peticiones directas (SC-008), cascadas
proyecto/tarea/equipo → notas, búsqueda con acentos, paginación y aislamiento entre tenants.
