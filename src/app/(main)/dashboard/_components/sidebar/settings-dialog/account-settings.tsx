"use client";

import { useTransition } from "react";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { getInitials } from "@/lib/utils";
import { changePassword, updateProfile } from "@/server/profile";

// Schemas locales (cliente): equivalentes a los de `@/lib/profile`, que no se
// puede importar aquí porque arrastra Prisma al bundle. La Server Action revalida.
const profileFormSchema = z.object({
  name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
  image: z.string().url({ message: "Ingresa una URL de imagen válida." }).or(z.literal("")).optional(),
});

const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, { message: "Ingresa tu contraseña actual." }),
  newPassword: z.string().min(8, { message: "La nueva contraseña debe tener al menos 8 caracteres." }),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;
type PasswordFormValues = z.infer<typeof passwordFormSchema>;

// Lógica de envío en ámbito de módulo: el React Compiler no procesa funciones
// fuera de componentes/hooks, por lo que el `try/catch` no le afecta aquí.
async function submitProfile(data: ProfileFormValues, router: ReturnType<typeof useRouter>) {
  try {
    await updateProfile({ name: data.name, image: data.image ?? "" });
    toast.success("Perfil actualizado.");
    router.refresh();
  } catch {
    toast.error("No se pudo guardar el perfil. Inténtalo de nuevo.");
  }
}

async function submitPassword(data: PasswordFormValues, reset: () => void) {
  try {
    await changePassword(data);
    toast.success("Contraseña actualizada.");
    reset();
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "No se pudo cambiar la contraseña.");
  }
}

/// Pestaña «Cuenta» del modal de Configuración: edición de nombre y avatar (URL),
/// correo de solo lectura y cambio de contraseña con verificación de la actual.
export function AccountSettings({ user }: { readonly user: { name: string; email: string; image: string } }) {
  const router = useRouter();
  const [isProfilePending, startProfileTransition] = useTransition();
  const [isPasswordPending, startPasswordTransition] = useTransition();

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { name: user.name, image: user.image },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: { currentPassword: "", newPassword: "" },
  });

  const watchedName = profileForm.watch("name");
  const watchedImage = profileForm.watch("image");

  const onSubmitProfile = (data: ProfileFormValues) => {
    startProfileTransition(async () => {
      await submitProfile(data, router);
    });
  };

  const onSubmitPassword = (data: PasswordFormValues) => {
    startPasswordTransition(async () => {
      await submitPassword(data, () => passwordForm.reset({ currentPassword: "", newPassword: "" }));
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <form noValidate onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Avatar className="size-12 rounded-lg">
            <AvatarImage src={watchedImage || undefined} alt={watchedName} />
            <AvatarFallback className="rounded-lg">{getInitials(watchedName || user.name)}</AvatarFallback>
          </Avatar>
          <div className="grid gap-0.5">
            <span className="font-medium text-sm">{watchedName || user.name}</span>
            <span className="text-muted-foreground text-xs">{user.email}</span>
          </div>
        </div>
        <FieldGroup className="gap-4">
          <Controller
            control={profileForm.control}
            name="name"
            render={({ field, fieldState }) => (
              <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="account-name">Nombre</FieldLabel>
                <Input
                  {...field}
                  id="account-name"
                  type="text"
                  placeholder="Tu nombre"
                  autoComplete="name"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            control={profileForm.control}
            name="image"
            render={({ field, fieldState }) => (
              <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="account-image">URL del avatar</FieldLabel>
                <Input
                  {...field}
                  id="account-image"
                  type="url"
                  placeholder="https://ejemplo.com/avatar.png"
                  autoComplete="off"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Field className="gap-1.5">
            <FieldLabel htmlFor="account-email">Correo electrónico</FieldLabel>
            <Input id="account-email" type="email" value={user.email} readOnly disabled autoComplete="email" />
          </Field>
        </FieldGroup>
        <Button type="submit" className="w-fit" disabled={isProfilePending}>
          {isProfilePending ? "Guardando..." : "Guardar perfil"}
        </Button>
      </form>

      <Separator />

      <form noValidate onSubmit={passwordForm.handleSubmit(onSubmitPassword)} className="flex flex-col gap-4">
        <div className="space-y-1">
          <h3 className="font-medium text-sm">Cambiar contraseña</h3>
          <p className="text-muted-foreground text-xs">Introduce tu contraseña actual y la nueva.</p>
        </div>
        <FieldGroup className="gap-4">
          <Controller
            control={passwordForm.control}
            name="currentPassword"
            render={({ field, fieldState }) => (
              <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="account-current-password">Contraseña actual</FieldLabel>
                <Input
                  {...field}
                  id="account-current-password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            control={passwordForm.control}
            name="newPassword"
            render={({ field, fieldState }) => (
              <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="account-new-password">Nueva contraseña</FieldLabel>
                <Input
                  {...field}
                  id="account-new-password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </FieldGroup>
        <Button type="submit" variant="outline" className="w-fit" disabled={isPasswordPending}>
          {isPasswordPending ? "Cambiando..." : "Cambiar contraseña"}
        </Button>
      </form>
    </div>
  );
}
