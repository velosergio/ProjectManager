# Contrato — Recuperación de contraseña

**Módulos**: `src/app/api/auth/password/request/route.ts`,
`src/app/api/auth/password/reset/route.ts`, `src/lib/password-reset.ts`, `src/lib/mailer.ts`.
Cubre FR-018, SC-008.

## `POST /api/auth/password/request`

Solicita un restablecimiento. **Respuesta neutra** (no revela si el email existe).

Request:
```json
{ "email": "user@example.com" }
```

Comportamiento:
- Si el email pertenece a un usuario: genera token aleatorio, guarda `tokenHash` + `expiresAt`
  (~1 h), envía enlace `"/auth/v1/reset?token=<token>"` por correo (o lo registra en consola en dev
  sin SMTP).
- Si no existe: no hace nada observable.
- Rate-limit básico por email/IP.

Response (siempre): `200 { "ok": true }` con mensaje neutro.

## `POST /api/auth/password/reset`

Confirma el restablecimiento.

Request:
```json
{ "token": "<token>", "password": "<nueva>" }
```

Comportamiento:
- Recalcula el hash del token y busca un `PasswordResetToken` con `usedAt == null` y
  `expiresAt > now`.
- Si es válido: actualiza `User.password` (hash bcrypt), marca `usedAt = now` (uso único).
- Si es inválido/usado/caducado: `400` con mensaje genérico e invitación a solicitar uno nuevo.

Response: `200 { "ok": true }` o `400 { "error": "..." }`.

## Invariantes

- Un token solo sirve una vez (`usedAt`), y caduca por tiempo (`expiresAt`).
- La respuesta de `request` es indistinguible entre email existente y no existente (SC-008).
- El token nunca se almacena en claro (solo su hash).

## Pruebas asociadas

- Token válido ⇒ cambia contraseña; reuso ⇒ rechazado (SC-008).
- Token caducado ⇒ rechazado.
- `request` con email inexistente ⇒ respuesta neutra idéntica.
