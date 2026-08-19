import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import {Table,TableBody,TableCell,TableHead,TableHeader,TableRow,} from "@/components/ui/table";
import { orderStatusClasses } from "@/data/mock";
import { useOrdersQuery } from "@/hooks/useOrders";

export default function OrdersPage() {
  const { data: orders = [], isLoading, isError } = useOrdersQuery();

  return (
    <AppShell title="Pedidos" subtitle="Reposiciones en curso">
      <Card className="border-border/70 shadow-sm">
        <CardContent className="overflow-x-auto p-0">
          {isLoading && <p className="p-4 text-sm text-muted-foreground">Cargando pedidos…</p>}
          {isError && <p className="p-4 text-sm text-destructive">No se pudieron cargar los pedidos.</p>}
          {!isLoading && !isError && orders.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">Todavía no hay pedidos generados.</p>
          )}
          {!isLoading && !isError && orders.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40">Número de pedido</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead className="w-44">Estado</TableHead>
                  <TableHead className="w-40 text-right">Fecha de creación</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <TableRow key={o.id} className="cursor-pointer">
                    <TableCell className="p-0">
                      <Link
                        to={`/pedidos/${o.numero}`}
                        className="block px-4 py-3 font-mono text-xs font-semibold text-primary"
                      >
                        {o.numero}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">{o.proveedor}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${orderStatusClasses[o.estado]}`}
                      >
                        {o.estado}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {o.fecha}
                    </TableCell>
                    <TableCell>
                      <Link
                        to={`/pedidos/${o.numero}`}
                        aria-label={`Ver detalle de ${o.numero}`}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <ChevronRight className="size-4" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
