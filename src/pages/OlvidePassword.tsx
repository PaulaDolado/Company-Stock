import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, MailCheck, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_NAME } from "@/lib/auth";
import logoWhite from "@/assets/logo_white.png";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Introduce tu correo electrónico");
      return;
    }

    // Demo de portfolio: no hay backend ni envío de correo real. Se simula
    // el mismo comportamiento que tendría una app real (no revelar si la
    // cuenta existe), sin llamar a ningún servicio externo.
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 400));
    setIsSubmitting(false);

    setError(undefined);
    setSent(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="flex items-center justify-center">
            <img src={logoWhite} alt="Logo" className="h-10 w-auto object-contain" />
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-sidebar-accent-foreground">
            {APP_NAME}
          </h1>
          <p className="mt-1 text-sm text-sidebar-foreground/70">Recuperar contraseña</p>
        </div>

        <Card className="border-border/60 shadow-lg">
          <CardContent className="p-6">
            {sent ? (
              <div className="space-y-5 text-center">
                <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-success/15 text-success">
                  <MailCheck className="size-6" />
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">Revisa tu correo</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Si <strong>{email}</strong> tiene una cuenta, te habríamos enviado un enlace
                    para restablecer la contraseña. Esta es una demo de portfolio: no se envía
                    ningún correo real. Usa las credenciales de prueba de la pantalla de inicio de
                    sesión.
                  </p>
                </div>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/login">
                    <ArrowLeft className="size-4" />
                    Volver al inicio de sesión
                  </Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                <p className="text-sm text-muted-foreground">
                  Introduce tu correo electrónico y te enviaremos un enlace para restablecer tu
                  contraseña.
                </p>

                <div className="space-y-2">
                  <Label htmlFor="email">Correo electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(undefined);
                    }}
                    placeholder="nombre@companystock.demo"
                    aria-invalid={!!error}
                    disabled={isSubmitting}
                    autoFocus
                  />
                </div>

                {error && <p className="text-xs font-medium text-destructive">{error}</p>}

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  <Send className="size-4" />
                  {isSubmitting ? "Enviando…" : "Enviar enlace de recuperación"}
                </Button>

                <Button asChild variant="ghost" className="w-full">
                  <Link to="/login">
                    <ArrowLeft className="size-4" />
                    Volver al inicio de sesión
                  </Link>
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
