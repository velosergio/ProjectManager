"use client";

import { useTransition } from "react";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const formSchema = z
  .object({
    organizationName: z.string().min(2, { message: "El nombre de la organización debe tener al menos 2 caracteres." }),
    name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
    email: z.email({ message: "Ingresa un correo electrónico válido." }),
    password: z.string().min(8, { message: "La contraseña debe tener al menos 8 caracteres." }),
    confirmPassword: z.string().min(8, { message: "La confirmación debe tener al menos 8 caracteres." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

// Lógica de envío en ámbito de módulo: el React Compiler no procesa funciones
// fuera de componentes/hooks, por lo que el `try/finally` no le afecta aquí.
async function submitRegistration(data: z.infer<typeof formSchema>, router: ReturnType<typeof useRouter>) {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      organizationName: data.organizationName,
      name: data.name,
      email: data.email,
      password: data.password,
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    toast.error(payload?.error ?? "No se pudo crear la cuenta. Inténtalo de nuevo.");
    return;
  }

  const result = await signIn("credentials", { email: data.email, password: data.password, redirect: false });

  if (result?.error) {
    toast.success("Cuenta creada. Inicia sesión para continuar.");
    router.push("login");
    return;
  }

  toast.success("Cuenta creada correctamente.");
  router.push("/dashboard");
  router.refresh();
}

export function RegisterForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      organizationName: "",
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    startTransition(async () => {
      await submitRegistration(data, router);
    });
  };

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <FieldGroup className="gap-4">
        <Controller
          control={form.control}
          name="organizationName"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="register-organization">Organización</FieldLabel>
              <Input
                {...field}
                id="register-organization"
                type="text"
                placeholder="Nombre de tu organización"
                autoComplete="organization"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="register-name">Nombre completo</FieldLabel>
              <Input
                {...field}
                id="register-name"
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
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="register-email">Correo electrónico</FieldLabel>
              <Input
                {...field}
                id="register-email"
                type="email"
                placeholder="tu@ejemplo.com"
                autoComplete="email"
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
              <FieldLabel htmlFor="register-password">Contraseña</FieldLabel>
              <Input
                {...field}
                id="register-password"
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
          name="confirmPassword"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="register-confirm-password">Confirmar contraseña</FieldLabel>
              <Input
                {...field}
                id="register-confirm-password"
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
      <Button className="w-full" type="submit" disabled={isPending}>
        {isPending ? "Creando cuenta..." : "Crear cuenta"}
      </Button>
    </form>
  );
}
