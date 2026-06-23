"use client";

import { useState, useTransition } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const formSchema = z.object({
  email: z.email({ message: "Ingresa un correo electrónico válido." }),
});

async function submitForgot(email: string): Promise<void> {
  await fetch("/api/auth/password/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

export function ForgotPasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    startTransition(async () => {
      await submitForgot(data.email);
      // Mensaje neutro: no revela si el correo existe.
      setSent(true);
      toast.success("Si el correo está registrado, recibirás un enlace para restablecer la contraseña.");
    });
  };

  if (sent) {
    return (
      <p className="text-center text-muted-foreground text-sm">
        Revisa tu bandeja de entrada. Si el correo está registrado, te hemos enviado un enlace para restablecer la
        contraseña.
      </p>
    );
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Controller
        control={form.control}
        name="email"
        render={({ field, fieldState }) => (
          <Field className="gap-1.5" data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="forgot-email">Correo electrónico</FieldLabel>
            <Input
              {...field}
              id="forgot-email"
              type="email"
              placeholder="tu@ejemplo.com"
              autoComplete="email"
              aria-invalid={fieldState.invalid}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Button className="w-full" type="submit" disabled={isPending}>
        {isPending ? "Enviando..." : "Enviar enlace"}
      </Button>
    </form>
  );
}
