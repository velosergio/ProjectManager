import nodemailer from "nodemailer";

export interface MailInput {
  to: string;
  subject: string;
  html: string;
}

/// Envía un correo vía SMTP. Si no hay `SMTP_HOST` configurado (desarrollo), lo
/// registra por consola en lugar de enviarlo.
export async function sendMail(input: MailInput): Promise<void> {
  const host = process.env.SMTP_HOST;

  if (!host) {
    console.info(`[mailer:dev] Para: ${input.to} · ${input.subject}\n${input.html}`);
    return;
  }

  const transport = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD ?? "" } : undefined,
  });

  await transport.sendMail({
    from: process.env.SMTP_FROM ?? "noreply@projectmanager.local",
    to: input.to,
    subject: input.subject,
    html: input.html,
  });
}
