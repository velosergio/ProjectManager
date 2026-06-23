import { notFound } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant-context";

import { ProfileForm } from "./_components/profile-form";

export const metadata = {
  title: "Perfil",
};

export default async function ProfilePage() {
  const ctx = await getTenantContext();
  if (!ctx) {
    notFound();
  }

  const user = await prisma.user.findUnique({ where: { id: ctx.userId } });
  if (!user) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Perfil</h1>
        <p className="text-muted-foreground text-sm">Consulta y actualiza los datos de tu cuenta.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos de la cuenta</CardTitle>
          <CardDescription>El correo electrónico no puede modificarse en esta fase.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm defaultName={user.name} email={user.email} />
        </CardContent>
      </Card>
    </div>
  );
}
