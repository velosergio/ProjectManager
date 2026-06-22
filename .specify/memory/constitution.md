<!--
SYNC IMPACT REPORT
==================
Cambio de versión: (plantilla sin versión) → 1.0.0
Tipo de incremento: MAJOR (ratificación inicial de la constitución)

Principios definidos (nuevos):
- I. Calidad del Código No Negociable (Biome y React Doctor al 100 %, sin trampas)
- II. Estándares de Prueba
- III. Coherencia de la Experiencia del Usuario
- IV. Requisitos de Rendimiento
- V. Documentación en Español

Secciones añadidas:
- Pila Tecnológica y Restricciones
- Flujo de Desarrollo y Puertas de Calidad
- Gobernanza

Secciones eliminadas: ninguna (creación inicial)

Plantillas y artefactos dependientes:
- ✅ .specify/templates/plan-template.md (verificado: "Constitution Check" es genérico y compatible)
- ✅ .specify/templates/spec-template.md (verificado: sin conflicto con los principios)
- ✅ .specify/templates/tasks-template.md (verificado: categorías de tareas compatibles)
- ✅ CLAUDE.md (sin referencias contradictorias; sección SPECKIT intacta)

TODOs diferidos: ninguno.
-->

# Project Manager Constitution

## Principios Fundamentales

### I. Calidad del Código No Negociable

La calidad del código es una puerta de entrada obligatoria, no una aspiración. Las reglas
son las siguientes:

- **Biome DEBE pasar al 100 %.** El comando `biome check` (lint + formato) DEBE terminar sin
  errores ni advertencias antes de fusionar cualquier cambio. No se permite suprimir reglas
  con `biome-ignore` salvo que se documente la razón concreta en el propio comentario y se
  apruebe en la revisión.
- **React Doctor DEBE pasar al 100 %.** Todos los diagnósticos de React Doctor DEBEN resolverse;
  no se aceptan hallazgos pendientes en código que entra a `main`.
- **Honestidad ante todo, sin trampas.** Está PROHIBIDO alcanzar el 100 % mediante atajos que
  degraden la calidad real: desactivar reglas de forma masiva, excluir archivos del análisis,
  vaciar configuraciones, silenciar diagnósticos sin corregir la causa, o relajar la
  configuración de Biome/React Doctor para que "pase". El 100 % DEBE reflejar código
  genuinamente limpio.
- TypeScript DEBE compilar sin errores y sin usos injustificados de `any` o `@ts-ignore`.

**Justificación:** Biome y React Doctor son la red de seguridad automatizada del proyecto.
Un 100 % obtenido con trampas es peor que un porcentaje honesto inferior, porque oculta deuda
técnica real y erosiona la confianza en las puertas de calidad.

### II. Estándares de Prueba

El código se verifica con pruebas, no con suposiciones.

- Toda lógica de negocio (validaciones, transformaciones de datos, reglas de dominio, acceso a
  datos vía Prisma) DEBE tener pruebas automatizadas.
- Las correcciones de errores DEBEN incluir una prueba de regresión que falle antes del arreglo
  y pase después.
- Las pruebas DEBEN ser deterministas: nada de dependencias de red real, relojes del sistema sin
  controlar, ni orden de ejecución frágil.
- La suite de pruebas DEBE pasar por completo antes de fusionar. Una prueba marcada como
  omitida (`skip`/`todo`) DEBE incluir la razón y una condición de reactivación.

**Justificación:** Un gestor de proyectos manipula datos críticos de los usuarios; las pruebas
protegen la integridad de esos datos y permiten refactorizar sin miedo.

### III. Coherencia de la Experiencia del Usuario

La interfaz DEBE sentirse como un único producto, no como pantallas inconexas.

- Todos los componentes de interfaz DEBEN construirse sobre el sistema de diseño existente
  (shadcn/ui, Radix, Tailwind v4) y reutilizar los componentes compartidos antes de crear nuevos.
- Los patrones de interacción DEBEN ser consistentes: estados de carga, vacíos y de error;
  mensajes mediante el sistema de notificaciones unificado (Sonner); navegación y disposición
  coherentes entre vistas.
- La accesibilidad es obligatoria: roles y etiquetas ARIA correctos, navegación por teclado y
  contraste suficiente. Los componentes interactivos DEBEN ser operables sin ratón.
- El soporte de tema claro/oscuro DEBE mantenerse en todas las vistas nuevas.

**Justificación:** La coherencia reduce la carga cognitiva del usuario y el coste de
mantenimiento; las divergencias visuales y de comportamiento son deuda de producto.

### IV. Requisitos de Rendimiento

El rendimiento es un requisito funcional, no un lujo.

- Las vistas DEBEN priorizar React Server Components y la obtención de datos en el servidor;
  el JavaScript enviado al cliente DEBE limitarse a lo estrictamente interactivo.
- Las consultas a la base de datos vía Prisma DEBEN evitar el problema N+1 y solicitar solo los
  campos necesarios; las listas grandes DEBEN paginarse o virtualizarse.
- Las imágenes y los recursos pesados DEBEN optimizarse (componentes de imagen de Next.js, carga
  diferida cuando proceda).
- Cualquier regresión de rendimiento perceptible (interacciones por encima de ~100 ms, bloqueos
  del hilo principal) DEBE justificarse o corregirse antes de fusionar.

**Justificación:** La capacidad de respuesta determina la utilidad real de una herramienta de
gestión usada a diario; el rendimiento descuidado se acumula y es caro de revertir.

### V. Documentación en Español

Toda la documentación del proyecto DEBE redactarse en español.

- Especificaciones, planes, tareas, README, guías, ADR y comentarios de documentación DEBEN
  estar en español, con ortografía y acentuación correctas.
- Los identificadores de código (nombres de variables, funciones, tipos) y los términos técnicos
  consolidados PUEDEN permanecer en su forma original en inglés cuando sea la convención del
  ecosistema.
- Los mensajes de interfaz visibles para el usuario DEBEN estar en español salvo que el proyecto
  defina explícitamente otra cosa.

**Justificación:** El equipo y los usuarios trabajan en español; una documentación coherente en
un solo idioma elimina ambigüedades y barreras de comprensión.

## Pila Tecnológica y Restricciones

- **Framework:** Next.js (App Router) con React 19 y TypeScript en modo estricto.
- **Datos:** Prisma como ORM; las migraciones DEBEN versionarse y revisarse.
- **Estilos:** Tailwind CSS v4 y shadcn/ui; no se introducen sistemas de estilos paralelos.
- **Calidad automatizada:** Biome (lint + formato) y React Doctor son las herramientas oficiales
  de calidad. Su configuración DEBE mantenerse estricta; debilitarla para "pasar" viola el
  Principio I.
- **Hooks de pre-commit:** Husky y lint-staged DEBEN permanecer activos; no se permite el
  bypass de hooks (`--no-verify`) salvo autorización explícita documentada.

## Flujo de Desarrollo y Puertas de Calidad

Antes de fusionar a `main`, TODO cambio DEBE cumplir estas puertas:

1. `biome check` pasa al 100 % sin errores ni advertencias.
2. React Doctor pasa al 100 % sin diagnósticos pendientes.
3. La compilación de TypeScript y el `build` de Next.js terminan sin errores.
4. La suite de pruebas pasa por completo.
5. La revisión de código confirma el cumplimiento de los cinco principios y la ausencia de
   trampas en las puertas automatizadas.

Las excepciones a cualquier puerta DEBEN documentarse en la descripción del cambio, justificarse
y aprobarse explícitamente en la revisión.

## Gobernanza

Esta constitución prevalece sobre cualquier otra práctica o preferencia individual del proyecto.

- **Enmiendas:** Las modificaciones a esta constitución DEBEN proponerse por escrito, justificarse
  y aprobarse antes de aplicarse. Cada enmienda actualiza la versión y la fecha de última
  modificación.
- **Versionado:** Se aplica versionado semántico. MAJOR para cambios incompatibles o eliminación
  o redefinición de principios; MINOR para añadir un principio o sección o ampliar guía de forma
  material; PATCH para aclaraciones y correcciones no semánticas.
- **Cumplimiento:** Todas las revisiones de código y de planes DEBEN verificar la conformidad con
  estos principios. La complejidad añadida DEBE justificarse frente a la alternativa más simple.
- **Sincronización:** Las plantillas dependientes (`plan-template.md`, `spec-template.md`,
  `tasks-template.md`) y la guía en `CLAUDE.md` DEBEN mantenerse coherentes con esta constitución.

**Version**: 1.0.0 | **Ratified**: 2026-06-22 | **Last Amended**: 2026-06-22
