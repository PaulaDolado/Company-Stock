import { useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Menu } from "lucide-react";
import { AppSidebar } from "./AppSidebar";
import { useAuth } from "@/lib/auth";
import { useSidebar } from "@/lib/sidebar-context";

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const { collapsed, openMobile } = useSidebar();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate("/login", { replace: true });
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <div
        className={`transition-[padding-left] duration-200 ease-in-out ${
          collapsed ? "md:pl-[72px]" : "md:pl-64"
        }`}
      >
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border bg-card px-4 py-6 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={openMobile}
              aria-label="Abrir menú"
              className="-ml-1 flex size-9 shrink-0 items-center justify-center rounded-md text-foreground hover:bg-accent md:hidden"
            >
              <Menu className="size-5" />
            </button>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
              {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          {actions}
        </header>
        <main className="px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}