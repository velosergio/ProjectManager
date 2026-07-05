"use client";

import { useTransition } from "react";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { acceptInvitationAction } from "../../invite/actions";

const formSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, { message: "El nombre debe tener al menos 2 caracteres." })
      .max(120, { message: "El nombre no puede superar los 120 caracteres." }),
    password: z.string().min(8, { message: "La contraseña debe tener al menos 8 caracteres." }),
    confirm: z.string().min(8, { message: "La confirmación debe tener al menos 8 caracteres." }),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Las contraseñas no coinciden.",
    path: ["confirm"],
  });

/// Formulario de activación de cuenta invitada: define nombre y contraseña
/// con el token del enlace (FASE 4, FR-003).
export function InviteForm({ token }: { readonly token: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", password: "", confirm: "" },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    startTransition(async () => {
      const result = await acceptInvitationAction({ token, ...data });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Cuenta activada. Inicia sesión con tu nueva contraseña.");
      router.push("/login");
    });
  };

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Controller
        control={form.control}
        name="name"
        render={({ field, fieldState }) => (
          <Field className="gap-1.5" data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="invite-name">Tu nombre</FieldLabel>
            <Input
              {...field}
              id="invite-name"
              type="text"
              placeholder="Nombre y apellido"
              autoComplete="name"
              aria-invalid={fieldState.invalid}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Controller
        control={form.control}
        name="password"
        render={({ field, fieldState }) => (
          <Field className="gap-1.5" data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="invite-password">Contraseña</FieldLabel>
            <Input
              {...field}
              id="invite-password"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              aria-invalid={fieldState.invalid}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Controller
        control={form.control}
        name="confirm"
        render={({ field, fieldState }) => (
          <Field className="gap-1.5" data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="invite-confirm">Confirmar contraseña</FieldLabel>
            <Input
              {...field}
              id="invite-confirm"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              aria-invalid={fieldState.invalid}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Button className="w-full" type="submit" disabled={isPending}>
        {isPending ? "Activando..." : "Activar mi cuenta"}
      </Button>
    </form>
  );
}
