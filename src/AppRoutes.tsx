import { Routes, Route, useLocation } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";

import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import OlvidePassword from "@/pages/OlvidePassword";
import RestablecerPassword from "@/pages/RestablecerPassword";
import Notificaciones from "@/pages/Notificaciones";
import Proveedores from "@/pages/Proveedores";
import ReposicionInterna from "@/pages/ReposicionInterna"; // ← Agregar import

import PedidosLayout from "@/pages/PedidosLayout";
import PedidosList from "@/pages/PedidosList";
import PedidoDetail from "@/pages/PedidoDetail";

import SolicitudesLayout from "@/pages/SolicitudesLayout";
import SolicitudesList from "@/pages/SolicitudesList";
import SolicitudNueva from "@/pages/SolicitudNueva";
import SolicitudesHistorico from "@/pages/SolicitudesHistorico";

import StockLayout from "@/pages/StockLayout";
import StockList from "@/pages/StockList";
import StockNuevo from "@/pages/StockNuevo";

import NotFound from "@/pages/NotFound";

export function AppRoutes() {
  const location = useLocation();

  return (
    <ErrorBoundary key={location.pathname}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/olvide-password" element={<OlvidePassword />} />
        <Route path="/restablecer-password" element={<RestablecerPassword />} />
        <Route path="/notificaciones" element={<Notificaciones />} />
        <Route path="/proveedores" element={<Proveedores />} />
        <Route path="/reposicion-interna" element={<ReposicionInterna />} /> {/* ← Agregar esta línea */}

        <Route path="/pedidos" element={<PedidosLayout />}>
          <Route index element={<PedidosList />} />
          <Route path=":numero" element={<PedidoDetail />} />
        </Route>

        <Route path="/solicitudes" element={<SolicitudesLayout />}>
          <Route index element={<SolicitudesList />} />
          <Route path="nueva" element={<SolicitudNueva />} />
          <Route path="historico" element={<SolicitudesHistorico />} />
        </Route>

        <Route path="/stock" element={<StockLayout />}>
          <Route index element={<StockList />} />
          <Route path="nuevo" element={<StockNuevo />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </ErrorBoundary>
  );
}
