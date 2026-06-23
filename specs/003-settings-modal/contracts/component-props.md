# Contrato — Props de componentes (UI)

Flujo de datos: `layout.tsx (server) → AppSidebar → NavUser → SettingsDialog → pestañas`.

## `SettingsDialog` (controlado)

```ts
type SettingsSection = "appearance" | "account" | "notifications" | "plan";

type SettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
  user: { name: string; email: string; image: string };
  planLabel: string | null;
  roleLabel: string;
  notificationPreferences: NotificationPreferenceView;
};
```

- Estructura: `Dialog` → `DialogContent` → `DialogHeader` + `Tabs orientation="vertical"`.
- `TabsList variant="line"` a la izquierda; contenido a la derecha dentro de `ScrollArea`.
- 4 secciones con iconos lucide: `Palette` (Apariencia), `UserRound` (Cuenta), `Bell`
  (Notificaciones), `CreditCard` (Plan).

## Pestañas

| Componente | Props | Notas |
|------------|-------|-------|
| `AppearanceSettings` | — (sin props) | Lee/escribe `usePreferencesStore` + `@/lib/preferences/*` |
| `AccountSettings` | `{ user: { name; email; image } }` | RHF + Zod; `updateProfile` y `changePassword` |
| `NotificationsSettings` | `{ initial: NotificationPreferenceView }` | Estado optimista; `updateNotificationPreferences` |
| `PlanSettings` | `{ planLabel: string \| null; roleLabel: string }` | Solo lectura; `Badge` |

## `NavUser` (modificado)

```ts
type NavUserProps = {
  user: { name: string; email: string; avatar: string; role: UserRole };
  planLabel: string | null;
  notificationPreferences: NotificationPreferenceView;
};
```

- Mantiene `useState` para `open` y `section`; cada ítem del dropdown llama a `openSection(...)`.
- `ROLE_LABELS: Record<UserRole, string>` (inline): ADMIN→"Administrador", MANGO→"Mango (global)",
  MANAGER→"Gerente", MEMBER→"Miembro", VIEWER→"Lector".
- Mapea `user.avatar` → `image` al pasar `user` a `SettingsDialog`.
- `signOut({ callbackUrl: "/auth/v1/login" })` en "Cerrar sesión".

## `AppSidebar` (modificado)

```ts
type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  access?: AccessContext | null;
  planLabel?: string | null;
  user: { name: string; email: string; avatar: string; role: UserRole };
  notificationPreferences: NotificationPreferenceView;
};
```

- Reenvía `planLabel ?? null` y `notificationPreferences` a `NavUser`.

## `layout.tsx` (modificado)

- Añade `notificationPreferences` al `Promise.all` existente:
  `ctx ? getNotificationPreferences() : Promise.resolve({ emailAlerts: true, productUpdates: false, taskReminders: true })`.
- Tipar `currentUser.role` como `UserRole` (import `@/generated/prisma/client`).
- Pasa `notificationPreferences` a `<AppSidebar>`.
- **Navbar**: elimina `<LayoutControls />` y `<AccountSwitcher .../>`; conserva `<SearchDialog />` y
  `<ThemeSwitcher />`.
