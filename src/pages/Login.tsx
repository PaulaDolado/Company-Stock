import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, APP_NAME } from "@/lib/auth";
import logoWhite from "@/assets/logo_white.png";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) navigate("/", { replace: true });
  }, [isAuthenticated, isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Introduce tu correo y contraseña");
      return;
    }

    setIsSubmitting(true);
    const result = await login(email, password);
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(undefined);
    toast.success("Sesión iniciada");
    navigate("/", { replace: true });
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
          <p className="mt-1 text-sm text-sidebar-foreground/70">
            Gestión de stock, solicitudes y pedidos
          </p>
        </div>

        <Card className="border-border/60 shadow-lg">
          <CardContent className="p-6">
            <div className="mb-5 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">
                Demo de portfolio · credenciales de prueba
              </p>
              <p className="mt-1">
                <strong>admin@companystock.demo</strong> ·{" "}
                <strong>gestion@companystock.demo</strong> ·{" "}
                <strong>solicitante@companystock.demo</strong>
              </p>
              <p>
                Contraseña para las tres: <strong>demo1234</strong>
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-5">
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
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Contraseña</Label>
                  <Link
                    to="/olvide-password"
                    className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(undefined);
                  }}
                  placeholder="••••••••"
                  aria-invalid={!!error}
                  disabled={isSubmitting}
                />
              </div>

              {error && <p className="text-xs font-medium text-destructive">{error}</p>}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                <LogIn className="size-4" />
                {isSubmitting ? "Iniciando sesión…" : "Iniciar sesión"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
