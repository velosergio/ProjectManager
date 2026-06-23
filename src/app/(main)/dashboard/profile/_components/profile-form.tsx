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
import { updateProfile } from "@/server/profile";

const formSchema = z.object({
  name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
});

interface ProfileFormProps {
  defaultName: string;
  email: string;
}

async function submitProfile(name: string, router: ReturnType<typeof useRouter>) {
  try {
    await updateProfile({ name });
    toast.success("Perfil actualizado.");
    router.refresh();
  } catch {
    toast.error("No se pudo actualizar el perfil.");
  }
}

export function ProfileForm({ defaultName, email }: ProfileFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: defaultName },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    startTransition(async () => {
      await submitProfile(data.name, router);
    });
  };

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex max-w-md flex-col gap-4">
      <Controller
        control={form.control}
        name="name"
        render={({ field, fieldState }) => (
          <Field className="gap-1.5" data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="profile-name">Nombre</FieldLabel>
            <Input {...field} id="profile-name" type="text" autoComplete="name" aria-invalid={fieldState.invalid} />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Field className="gap-1.5">
        <FieldLabel htmlFor="profile-email">Correo electrónico</FieldLabel>
        <Input id="profile-email" type="email" value={email} disabled readOnly />
      </Field>
      <Button className="w-fit" type="submit" disabled={isPending}>
        {isPending ? "Guardando..." : "Guardar cambios"}
      </Button>
    </form>
  );
}
