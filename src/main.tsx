import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./styles.css";
import { AuthProvider } from "@/lib/auth";
import { SidebarProvider } from "@/lib/sidebar-context";
import { Toaster } from "@/components/ui/sonner";
import { AppRoutes } from "./AppRoutes";

const queryClient = new QueryClient();

// import.meta.env.BASE_URL refleja el `base` de vite.config.ts: "/" en
// local o en la mayoría de hostings, y "/Company-Stock/" en el build de
// GitHub Pages. Sin decírselo a BrowserRouter, las rutas (definidas como
// "/", "/stock"...) no coinciden con la URL real bajo esa subruta y todo
// cae en el 404 de la app.
const basename = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SidebarProvider>
          <BrowserRouter basename={basename}>
            <AppRoutes />
            <Toaster />
          </BrowserRouter>
        </SidebarProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
