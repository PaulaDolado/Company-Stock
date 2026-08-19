import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "company-stock-sidebar-collapsed";

type SidebarContextValue = {
  /** Colapsado a solo iconos: escritorio (md+). */
  collapsed: boolean;
  toggle: () => void;
  /** Panel deslizante en móvil */
  mobileOpen: boolean;
  openMobile: () => void;
  closeMobile: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    } catch {
      // Sin almacenamiento disponible (modo privado, etc.), la preferencia
      // simplemente no persiste entre sesiones.
    }
  }, [collapsed]);

  return (
    <SidebarContext.Provider
      value={{
        collapsed,
        toggle: () => setCollapsed((c) => !c),
        mobileOpen,
        openMobile: () => setMobileOpen(true),
        closeMobile: () => setMobileOpen(false),
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar debe usarse dentro de SidebarProvider");
  return ctx;
}

/** Ancho actual de la sidebar en píxeles, útil para el padding del contenido en AppShell. */
export const SIDEBAR_WIDTH_EXPANDED = 256; // w-64
export const SIDEBAR_WIDTH_COLLAPSED = 72; // w-[72px]
