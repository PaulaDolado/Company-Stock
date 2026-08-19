import { Link } from "react-router-dom";
import { ArrowLeft, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/auth";
import logoWhite from "@/assets/logo_white.png";

// En la app original se llegaba aquí desde el enlace de un correo real de
// recuperación de contraseña (Supabase Auth). Esta es una demo de
// portfolio sin backend ni envío de correos, así que ese enlace nunca
// existe: en vez de simular un flujo que no puede completarse de verdad,
// se explica la situación y se manda de vuelta a las credenciales de demo.
export default function ResetPasswordPage() {
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
          <p className="mt-1 text-sm text-sidebar-foreground/70">Restablecer contraseña</p>
        </div>

        <Card className="border-border/60 shadow-lg">
          <CardContent className="space-y-4 p-6 text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Info className="size-6" />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">No disponible en esta demo</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Esta pantalla solo tiene sentido llegando desde el enlace de un correo real de
                recuperación, y esta es una demo de portfolio sin envío de emails. Usa una de las
                cuentas de prueba desde el inicio de sesión.
              </p>
            </div>
            <Button asChild className="w-full">
              <Link to="/login">
                <ArrowLeft className="size-4" />
                Volver al inicio de sesión
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
