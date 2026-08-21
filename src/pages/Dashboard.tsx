import { ClipboardList, ShoppingCart, PackageX, BellRing, PlusCircle, History } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { statusClasses, isRequestArchived, type NotificationType } from "@/data/mock";
import { useMaterialRequestsQuery } from "@/hooks/useMaterialRequests";
import { useProductsQuery } from "@/hooks/useProducts";
import { useOrdersQuery } from "@/hooks/useOrders";
import { useNotificationsQuery } from "@/hooks/useNotifications";

const toneClasses: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/15 text-success",
  destructive: "bg-destructive/10 text-destructive",
  warning: "bg-warning/20 text-warning-foreground",
};

const notificationBadgeVariant: Record<NotificationType, NonNullable<BadgeProps["variant"]>> = {
  "Solicitud de material": "secondary",
  "Solicitud de compra": "destructive",
  "Pedido actualizado": "outline",
};

export default function Dashboard() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null; // o un spinner mientras carga el perfil
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === "SOLICITANTE") {
    return <SolicitanteDashboard nombre={user.nombre} />;
  }

  return <AdminDashboard />;
}

function AdminDashboard() {
  const { data: materialRequests = [] } = useMaterialRequestsQuery();
  const { data: products = [] } = useProductsQuery();
  const { data: orders = [] } = useOrdersQuery();
  const { data: notifications = [] } = useNotificationsQuery();

  const solicitudesPendientes = materialRequests.filter((r) => r.estado === "Pendiente").length;
  const pedidosEnCurso = orders.filter(
    (o) => o.estado !== "Entregado" && o.estado !== "Cancelado",
  ).length;
  const productosStockBajo = products.filter((p) => p.cantidad < p.minimo).length;
  const notificacionesSinLeer = notifications.filter((n) => !n.leida).length;

  const summary = [
    {
      label: "Solicitudes pendientes",
      value: solicitudesPendientes,
      icon: ClipboardList,
      tone: "primary",
      href: "/solicitudes",
    },
    {
      label: "Pedidos en curso",
      value: pedidosEnCurso,
      icon: ShoppingCart,
      tone: "success",
      href: "/pedidos",
    },
    {
      label: "Productos con stock bajo mínimo",
      value: productosStockBajo,
      icon: PackageX,
      tone: "destructive",
      href: "/stock",
    },
    {
      label: "Notificaciones sin leer",
      value: notificacionesSinLeer,
      icon: BellRing,
      tone: "warning",
      href: "/notificaciones",
    },
  ] as const;

  const ultimasNotificaciones = notifications.slice(0, 5);

  return (
    <AppShell title="Dashboard" subtitle="Resumen operativo del almacén central">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((card) => (
          <Link key={card.label} to={card.href}>
            <Card className="border-border/70 shadow-sm cursor-pointer transition-all hover:shadow-md hover:border-border/100 h-full">
              <CardContent className="flex h-full flex-col justify-between gap-6 p-6">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm font-medium leading-snug text-muted-foreground">
                    {card.label}
                  </p>
                  <span
                    className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${toneClasses[card.tone]}`}
                  >
                    <card.icon className="size-5" />
                  </span>
                </div>
                <p className="text-4xl font-semibold tracking-tight text-foreground">
                  {card.value}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mt-6 border-border/70 shadow-sm">
        <CardContent className="p-0">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-base font-semibold text-foreground">Últimas notificaciones</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-44">Tipo</TableHead>
                <TableHead>Mensaje</TableHead>
                <TableHead className="w-44 text-right">Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ultimasNotificaciones.map((n) => (
                <TableRow key={n.id}>
                  <TableCell className="py-2.5">
                    <Badge variant={notificationBadgeVariant[n.tipo]}>{n.tipo}</Badge>
                  </TableCell>
                  <TableCell className="py-2.5 text-sm text-foreground">{n.mensaje}</TableCell>
                  <TableCell className="py-2.5 text-right text-sm text-muted-foreground">
                    {n.fecha}
                  </TableCell>
                </TableRow>
              ))}
              {ultimasNotificaciones.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No hay notificaciones todavía.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}

function SolicitanteDashboard({ nombre }: { nombre: string }) {
  const { data: materialRequests = [] } = useMaterialRequestsQuery();
  const misSolicitudes = materialRequests
    .filter((r) => r.solicitante === nombre && !isRequestArchived(r))
    .slice(0, 8);

  return (
    <AppShell
      title={`Hola, ${nombre.split(" ")[0]}`}
      subtitle="Gestiona tus solicitudes de material"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Link to="/solicitudes/nueva">
          <Card className="h-full border-border/70 shadow-sm transition-all hover:shadow-md hover:border-border/100 cursor-pointer">
            <CardContent className="flex h-full flex-col justify-between gap-6 p-6">
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm font-medium leading-snug text-muted-foreground">
                  Nueva solicitud
                </p>
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <PlusCircle className="size-5" />
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Solicita material del almacén central en unos pocos pasos.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/solicitudes/historico">
          <Card className="h-full border-border/70 shadow-sm transition-all hover:shadow-md hover:border-border/100 cursor-pointer">
            <CardContent className="flex h-full flex-col justify-between gap-6 p-6">
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm font-medium leading-snug text-muted-foreground">
                  Mis solicitudes anteriores
                </p>
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-success/15 text-success">
                  <History className="size-5" />
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Consulta el estado e histórico de todas tus solicitudes.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card className="mt-6 border-border/70 shadow-sm">
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="text-base font-semibold text-foreground">Tus últimas solicitudes</h2>
            <Button asChild variant="outline" size="sm">
              <Link to="/solicitudes/historico">Ver todas</Link>
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Nº solicitud</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead className="w-32 text-right">Cantidad</TableHead>
                <TableHead className="w-44">Estado</TableHead>
                <TableHead className="w-32 text-right">Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {misSolicitudes.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{r.id}</TableCell>
                  <TableCell className="font-medium text-foreground">{r.producto}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.cantidad}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClasses[r.estado]}`}
                    >
                      {r.estado}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {r.fecha}
                  </TableCell>
                </TableRow>
              ))}
              {misSolicitudes.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    Todavía no has hecho ninguna solicitud.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
