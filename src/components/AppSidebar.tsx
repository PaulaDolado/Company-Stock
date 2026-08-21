import { useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Boxes,
  ClipboardList,
  History,
  Truck,
  ShoppingCart,
  Bell,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  RotateCcw,
  X,
} from "lucide-react";
import { useAuth, APP_NAME } from "@/lib/auth";
import { useSidebar } from "@/lib/sidebar-context";
import { resetDemoData } from "@/lib/mock-db";
import logoWhite from "@/assets/logo_white.png";

/** Vuelve a los datos de fábrica de la demo y recarga para limpiar toda la caché en memoria. */
function handleResetDemoData() {
  if (!window.confirm("¿Restablecer todos los datos de la demo a su estado inicial?")) return;
  resetDemoData();
  // Navegación absoluta a propósito (no un Link de React Router): queremos
  // una recarga completa que limpie toda la caché en memoria (TanStack
  // Query, estado de React...). BASE_URL ya incluye la subruta del
  // despliegue (p.ej. "/Company-Stock/" en GitHub Pages, "/" en el resto),
  // así que hay que anteponerla en vez de usar una ruta absoluta a secas.
  window.location.href = `${import.meta.env.BASE_URL}login`;
}

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Stock", url: "/stock", icon: Boxes },
  { title: "Solicitudes", url: "/solicitudes", icon: ClipboardList },
  { title: "Reposición Interna", url: "/reposicion-interna", icon: RefreshCw },
  { title: "Solicitudes anteriores", url: "/solicitudes/historico", icon: History },
  { title: "Proveedores", url: "/proveedores", icon: Truck },
  { title: "Pedidos", url: "/pedidos", icon: ShoppingCart },
  { title: "Notificaciones", url: "/notificaciones", icon: Bell },
] as const;

/** URLs a las que un usuario con rol SOLICITANTE tiene acceso en el menú. */
const SOLICITANTE_URLS = new Set<string>(["/", "/solicitudes", "/solicitudes/historico"]);

/** Enlaces de navegación, compartidos entre la barra de escritorio y el panel móvil. */
function NavItems({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { user } = useAuth();
  const visibleItems =
    user?.role === "SOLICITANTE" ? items.filter((item) => SOLICITANTE_URLS.has(item.url)) : items;

  return (
    <nav className="flex-1 space-y-1 px-3 py-4">
      {visibleItems.map((item) => (
        <NavLink
          key={item.url}
          to={item.url}
          end={item.url === "/" || item.url === "/solicitudes"}
          title={collapsed ? item.title : undefined}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
              collapsed ? "justify-center px-2" : "px-3"
            } ${
              isActive
                ? "!bg-sidebar-accent !text-sidebar-accent-foreground shadow-sm ring-1 ring-sidebar-border"
                : ""
            }`
          }
        >
          <item.icon className="size-4.5 shrink-0" />
          {!collapsed && <span className="truncate">{item.title}</span>}
        </NavLink>
      ))}
    </nav>
  );
}

/** Tarjeta de usuario + cerrar sesión, compartida entre escritorio y móvil. */
function UserFooter({ collapsed }: { collapsed: boolean }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  if (collapsed) {
    return (
      <div className="border-t border-sidebar-border px-3 py-4">
        <div className="flex items-center justify-center rounded-lg py-2">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground"
            title={user.nombre}
          >
            {user.iniciales}
          </span>
        </div>
        <button
          type="button"
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
          onClick={handleLogout}
          className="mt-2 flex w-full items-center justify-center rounded-md p-2 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Restablecer datos de la demo"
          title="Restablecer datos de la demo"
          onClick={handleResetDemoData}
          className="mt-1 flex w-full items-center justify-center rounded-md p-2 text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <RotateCcw className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-sidebar-border px-3 py-4">
      <div className="flex items-center gap-3 rounded-lg px-2 py-2">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
          {user.iniciales}
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-medium text-sidebar-accent-foreground">
            {user.nombre}
          </p>
          <p className="truncate text-xs text-sidebar-foreground/60">{user.departamento}</p>
        </div>
        <button
          type="button"
          aria-label="Restablecer datos de la demo"
          title="Restablecer datos de la demo"
          onClick={handleResetDemoData}
          className="shrink-0 rounded-md p-2 text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <RotateCcw className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Cerrar sesión"
          onClick={handleLogout}
          className="shrink-0 rounded-md p-2 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </div>
  );
}

export function AppSidebar() {
  const { collapsed, toggle, mobileOpen, closeMobile } = useSidebar();
  const location = useLocation();

  // Cierra el panel móvil en cuanto se navega a otra página.
  useEffect(() => {
    closeMobile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return (
    <>
      {/* Escritorio: barra fija, colapsable a solo iconos. Oculta por debajo de md. */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-in-out md:flex ${
          collapsed ? "w-[72px]" : "w-64"
        }`}
      >
        <div
          className={`flex items-center gap-3 border-b border-sidebar-border py-5 ${
            collapsed ? "justify-center px-2" : "px-6"
          }`}
        >
          <span className="flex shrink-0 items-center justify-center">
            <img src={logoWhite} alt="Logo" className="h-6 w-auto object-contain" />
          </span>
          {!collapsed && (
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-semibold text-sidebar-accent-foreground">
                {APP_NAME}
              </p>
            </div>
          )}
        </div>

        <NavItems collapsed={collapsed} />

        <div className="border-t border-sidebar-border px-3 py-3">
          <button
            type="button"
            onClick={toggle}
            aria-label={collapsed ? "Expandir menú" : "Esconder menú"}
            title={collapsed ? "Expandir menú" : "Esconder menú"}
            className={`flex w-full items-center gap-3 rounded-lg py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
              collapsed ? "justify-center px-2" : "px-3"
            }`}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4.5 shrink-0" />
            ) : (
              <>
                <PanelLeftClose className="size-4.5 shrink-0" />
                <span>Esconder menú</span>
              </>
            )}
          </button>
        </div>

        <UserFooter collapsed={collapsed} />
      </aside>

      {/* Móvil: fondo oscuro + panel deslizante, por debajo de md. */}
      <div
        aria-hidden={!mobileOpen}
        onClick={closeMobile}
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 md:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Menú de navegación"
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-sidebar text-sidebar-foreground shadow-xl transition-transform duration-200 ease-in-out md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-sidebar-border px-6 py-5">
          <span className="flex shrink-0 items-center justify-center">
            <img src={logoWhite} alt="Logo" className="h-6 w-auto object-contain" />
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-semibold text-sidebar-accent-foreground">
              {APP_NAME}
            </p>
          </div>
          <button
            type="button"
            onClick={closeMobile}
            aria-label="Cerrar menú"
            className="shrink-0 rounded-md p-1.5 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        <NavItems collapsed={false} onNavigate={closeMobile} />

        <UserFooter collapsed={false} />
      </aside>
    </>
  );
}
