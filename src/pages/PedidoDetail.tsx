import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {Table,TableBody,TableCell,TableHead,TableHeader,TableRow,} from "@/components/ui/table";
import { orderStatusClasses } from "@/data/mock";
import { useOrdersQuery } from "@/hooks/useOrders";

// El estado "Cancelado" no forma parte de la progresión normal del
// pedido (Pendiente -> Enviado -> En tránsito -> Entregado), así que
// se muestra aparte en vez de como un paso más del stepper.
const PROGRESS_STATUSES = ["Pendiente", "Enviado", "En tránsito", "Entregado"] as const;

function OrderNotFound() {
  return (
    <AppShell title="Pedido no encontrado">
      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-10 text-center text-sm text-muted-foreground">
          Ese pedido no existe.{" "}
          <Link to="/pedidos" className="text-primary underline underline-offset-4">
            Volver al listado
          </Link>
        </CardContent>
      </Card>
    </AppShell>
  );
}

export default function OrderDetail() {
  const { numero } = useParams<{ numero: string }>();
  const { data: orders = [], isLoading, isError } = useOrdersQuery();

  if (isLoading) {
    return (
      <AppShell title="Pedido">
        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            Cargando pedido…
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  if (isError) {
    return (
      <AppShell title="Pedido">
        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-10 text-center text-sm text-destructive">
            No se pudo cargar el pedido.
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const order = orders.find((o) => o.numero === numero);
  if (!order) return <OrderNotFound />;

  const cancelado = order.estado === "Cancelado";
  const currentIndex = PROGRESS_STATUSES.indexOf(
    order.estado as (typeof PROGRESS_STATUSES)[number]
  );

  return (
    <AppShell
      title={`Pedido ${order.numero}`}
      subtitle={`${order.proveedor} · creado el ${order.fecha}`}
      actions={
        <Button variant="outline" asChild>
          <Link to="/pedidos">
            <ArrowLeft className="size-4" />
            Volver
          </Link>
        </Button>
      }
    >
      <div className="space-y-6">
        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-foreground">Seguimiento</h2>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${orderStatusClasses[order.estado]}`}
              >
                {order.estado}
              </span>
            </div>

            {cancelado ? (
              <div className="mt-6 flex items-center gap-3 rounded-lg bg-zinc-500/10 px-4 py-3 text-sm text-zinc-600">
                <span className="flex size-9 items-center justify-center rounded-full bg-zinc-500/20 ring-2 ring-zinc-500/40">
                  <X className="size-4" />
                </span>
                Este pedido se canceló y no continuará su seguimiento habitual.
              </div>
            ) : (
              <ol className="mt-6 flex items-start">
                {PROGRESS_STATUSES.map((status, i) => {
                  const done = i < currentIndex;
                  const active = i === currentIndex;
                  return (
                    <li key={status} className="flex flex-1 items-start last:flex-none">
                      <div className="flex w-24 flex-col items-center text-center">
                        <span
                          className={`flex size-9 items-center justify-center rounded-full text-sm font-semibold ring-2 ${
                            done
                              ? "bg-success/15 text-success ring-success/40"
                              : active
                                ? "bg-primary text-primary-foreground ring-primary"
                                : "bg-muted text-muted-foreground ring-border"
                          }`}
                        >
                          {done ? <Check className="size-4" /> : i + 1}
                        </span>
                        <span
                          className={`mt-2 text-xs font-medium ${
                            active ? "text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {status}
                        </span>
                      </div>
                      {i < PROGRESS_STATUSES.length - 1 && (
                        <span
                          className={`mt-4 h-0.5 flex-1 rounded-full ${
                            i < currentIndex ? "bg-success/50" : "bg-border"
                          }`}
                        />
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-0">
            <h2 className="border-b border-border px-6 py-4 text-sm font-semibold text-foreground">
              Productos del pedido
            </h2>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Número</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead className="w-40 text-right">Cantidad pedida</TableHead>
                    <TableHead className="w-40 text-right">Cantidad recibida</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.lineas.map((l) => (
                    <TableRow key={l.numero}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {l.numero}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{l.nombre}</TableCell>
                      <TableCell className="text-right tabular-nums">{l.pedida}</TableCell>
                      <TableCell
                        className={`text-right font-semibold tabular-nums ${
                          l.recibida < l.pedida ? "text-warning-foreground" : "text-success"
                        }`}
                      >
                        {l.recibida}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
