# Contrato — Comando CLI `npm run mango`

**Script**: `scripts/create-mango.ts` (ejecutado con `tsx` vía `tsconfig.scripts.json`). Cubre
FR-019, FR-020.

## Invocación

```bash
npm run mango
```

`package.json` → `"mango": "tsx scripts/create-mango.ts"`.

## Flujo interactivo (`@clack/prompts`)

1. `name` — texto, ≥ 2 caracteres.
2. `email` — texto, formato válido (Zod), único.
3. `password` — enmascarado, fuerza mínima (longitud ≥ 8, mezcla recomendada).
4. `passwordConfirm` — enmascarado, debe coincidir.

Cancelación (Ctrl+C) ⇒ salida limpia sin persistir.

## Validación (Zod)

```ts
const mangoSchema = z.object({
  name: z.string().min(2),
  email: z.email(),
  password: z.string().min(8),
}).refine(d => d.password === d.passwordConfirm, { path: ["passwordConfirm"] });
```

## Persistencia

- Comprueba unicidad del `email` con el cliente base de Prisma.
- **Idempotencia**: si el email existe ⇒ imprime aviso y sale con código ≠ 0 **sin** crear duplicado.
- Hash con `bcryptjs` (coste 10).
- Crea `User { role: MANGO, tenantId: null, status: ACTIVE }`.

## Salidas

| Resultado | Código de salida | Mensaje |
|---|---|---|
| Usuario creado | 0 | "Usuario mango creado: <email>" |
| Email ya existe | 1 | "Ya existe un usuario con ese correo. No se creó nada." |
| Validación fallida / cancelado | 1 | Detalle del campo inválido o "Operación cancelada." |

## Pruebas asociadas

- Crear mango con datos válidos ⇒ usuario `MANGO`, `tenantId` null, password hasheada (SC-006).
- Reejecutar con el mismo email ⇒ no duplica, sale con aviso (SC-006).
- Lógica de validación testeada de forma aislada (sin TTY).
