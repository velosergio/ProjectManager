"use client";

import { useTransition } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const formSchema = z
  .object({
    password: z.string().min(8, { message: "La contraseña debe tener al menos 8 caracteres." }),
    confirmPassword: z.string().min(8, { message: "La confirmación debe tener al menos 8 caracteres." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

async function submitReset(token: string, password: string, router: ReturnType<typeof useRouter>) {
  const response = await fetch("/api/auth/password/reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    toast.error(payload?.error ?? "No se pudo restablecer la contraseña.");
    return;
  }

  toast.success("Contraseña actualizada. Inicia sesión con la nueva.");
  router.push("login");
}

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    if (!token) {
      toast.error("Enlace inválido. Solicita un nuevo restablecimiento.");
      return;
    }

    startTransition(async () => {
      await submitReset(token, data.password, router);
    });
  };

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Controller
        control={form.control}
        name="password"
        render={({ field, fieldState }) => (
          <Field className="gap-1.5" data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="reset-password">Nueva contraseña</FieldLabel>
            <Input
              {...field}
              id="reset-password"
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
            <FieldLabel htmlFor="reset-confirm-password">Confirmar contraseña</FieldLabel>
            <Input
              {...field}
              id="reset-confirm-password"
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
        {isPending ? "Guardando..." : "Restablecer contraseña"}
      </Button>
    </form>
  );
}
