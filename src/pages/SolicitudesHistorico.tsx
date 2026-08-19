import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Repeat, Search, ExternalLink } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow,} from "@/components/ui/table";
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle,} from "@/components/ui/dialog";
import { statusClasses, MaterialRequest, isRequestArchived, parseSolicitudFecha, isReplenishmentArchived, InternalReplenishment,} from "@/data/mock";
import { useAuth } from "@/lib/auth";
import { useMaterialRequestsQuery } from "@/hooks/useMaterialRequests";
import { useInternalReplenishmentsQuery } from "@/hooks/useInternalReplenishments";

export default function SolicitudesHistorico() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSolicitante = user?.role === "SOLICITANTE";

  const { data: materialRequests = [] } = useMaterialRequestsQuery();
  const { data: internalReplenishments = [] } = useInternalReplenishmentsQuery();

  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [query, setQuery] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<MaterialRequest | null>(null);
  const [selectedReplenishment, setSelectedReplenishment] =
    useState<InternalReplenishment | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const desdeDate = desde ? new Date(desde) : null;
    const hastaDate = hasta ? new Date(hasta) : null;

    const archived = materialRequests.filter((r) => isRequestArchived(r));
    const base = isSolicitante
      ? archived.filter((r) => r.solicitante === user?.nombre)
      : archived;

    return base.filter((r) => {
      const fecha = parseSolicitudFecha(r.fecha);
      const matchesDesde = !desdeDate || (fecha && fecha >= desdeDate);
      const matchesHasta = !hastaDate || (fecha && fecha <= hastaDate);
      const matchesQuery = !q || r.producto.toLowerCase().includes(q) ||
        r.solicitante.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q);
      return matchesDesde && matchesHasta && matchesQuery;
    });
  }, [desde, hasta, query, isSolicitante, user?.nombre, materialRequests]);

  // Reposiciones internas entregadas, o con más de un mes desde su
  // creación, se ven aquí igual que las solicitudes archivadas.
  const filteredReplenishments = useMemo(() => {
    const q = query.trim().toLowerCase();
    const desdeDate = desde ? new Date(desde) : null;
    const hastaDate = hasta ? new Date(hasta) : null;

    const archived = internalReplenishments.filter((r) => isReplenishmentArchived(r));

    return archived.filter((r) => {
      const fecha = new Date(r.fechaSolicitud);
      const matchesDesde = !desdeDate || fecha >= desdeDate;
      const matchesHasta = !hastaDate || fecha <= hastaDate;
      const matchesQuery = !q ||
        r.productoNombre.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q);
      return matchesDesde && matchesHasta && matchesQuery;
    });
  }, [desde, hasta, query, internalReplenishments]);

  return (
    <AppShell
      title="Histórico de solicitudes"
      subtitle="Solicitudes resueltas de meses anteriores"
      actions={
        <Button variant="outline" asChild>
          <Link to="/solicitudes">
            <ArrowLeft className="size-4" />
            Volver a solicitudes
          </Link>
        </Button>
      }
    >
      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-0">
          <div className="flex flex-wrap items-end gap-4 border-b border-border p-4">
            <div className="space-y-1.5">
              <Label htmlFor="desde" className="text-xs text-muted-foreground">
                Desde
              </Label>
              <Input
                id="desde"
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                max={hasta || undefined}
                className="w-40"
                aria-label="Filtrar desde fecha"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="hasta" className="text-xs text-muted-foreground">
                Hasta
              </Label>
              <Input
                id="hasta"
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                min={desde || undefined}
                className="w-40"
                aria-label="Filtrar hasta fecha"
              />
            </div>

            {(desde || hasta) && (
              <Button type="button" variant="ghost" size="sm"
                onClick={() => {setDesde("");setHasta("");}} >
                Limpiar fechas
              </Button>
            )}

            <div className="relative ml-auto w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por producto, solicitante o nº…"
                className="pl-9"
                aria-label="Buscar en el histórico"
                maxLength={80}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Nº solicitud</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead className="w-32">Departamento</TableHead>
                  <TableHead className="w-40 text-right">Cantidad solicitada</TableHead>
                  <TableHead className="w-44">Solicitante</TableHead>
                  <TableHead className="w-48">Estado</TableHead>
                  <TableHead className="w-32 text-right">Fecha</TableHead>
                  <TableHead className="w-32 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow
                    key={r.id}
                    onClick={() => setSelectedRequest(r)}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {r.id}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        {r.producto}
                        {r.productoLink && <ExternalLink className="size-3.5 text-muted-foreground" />}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.departamento ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.cantidad}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.solicitante}</TableCell>
                    <TableCell> 
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClasses[r.estado]}`}>
                        {r.estado}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {r.fecha}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate("/solicitudes/nueva", {
                            state: { producto: r.producto, cantidad: r.cantidad },
                          });
                        }}
                      >
                        <Repeat className="size-4" />
                        Repetir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                      No hay solicitudes en el histórico con esos criterios.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Reposiciones internas archivadas: reposición interna está oculta
          para el rol SOLICITANTE en toda la app (ver AppSidebar), así que
          tampoco se muestra aquí. */}
      {!isSolicitante && (
      <>
      <Card className="border-border/70 shadow-sm mt-6">
        <CardContent className="p-0">
          <div className="border-b border-border p-4">
            <h3 className="font-semibold text-foreground">Reposiciones internas anteriores</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Entregadas, o con más de un mes desde su creación
            </p>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Nº reposición</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead className="w-40 text-right">Cantidad requerida</TableHead>
                  <TableHead className="w-40">Ubicación</TableHead>
                  <TableHead className="w-48">Estado</TableHead>
                  <TableHead className="w-32 text-right">Fecha solicitud</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReplenishments.map((r) => (
                  <TableRow
                    key={r.id}
                    onClick={() => setSelectedReplenishment(r)}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {r.id}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {r.productoNombre}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.cantidadRequerir}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.ubicacion}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClasses[r.estado]}`}>
                        {r.estado}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {r.fechaSolicitud}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredReplenishments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      No hay reposiciones en el histórico con esos criterios.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de detalles de reposición */}
      <Dialog
        open={selectedReplenishment !== null}
        onOpenChange={(open) => !open && setSelectedReplenishment(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detalles de la reposición</DialogTitle>
            <DialogDescription>
              Información completa de la reposición {selectedReplenishment?.id}
            </DialogDescription>
          </DialogHeader>

          {selectedReplenishment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Nº Reposición</p>
                  <p className="text-sm font-semibold text-foreground">{selectedReplenishment.id}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Fecha solicitud</p>
                  <p className="text-sm text-foreground">{selectedReplenishment.fechaSolicitud}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Producto</p>
                <p className="text-sm text-foreground">{selectedReplenishment.productoNombre}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Cantidad requerida</p>
                  <p className="text-sm text-foreground">{selectedReplenishment.cantidadRequerir}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Ubicación</p>
                  <p className="text-sm text-foreground">{selectedReplenishment.ubicacion}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Estado</p>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClasses[selectedReplenishment.estado]}`}>
                  {selectedReplenishment.estado}
                </span>
              </div>

              {selectedReplenishment.numero_pedido && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Nº Pedido</p>
                  <p className="text-sm text-foreground">{selectedReplenishment.numero_pedido}</p>
                </div>
              )}

              {selectedReplenishment.numero_seguimiento && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Nº Seguimiento</p>
                  <p className="text-sm text-foreground">{selectedReplenishment.numero_seguimiento}</p>
                </div>
              )}

              {selectedReplenishment.fechaCompletada && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Fecha completada</p>
                  <p className="text-sm text-foreground">{selectedReplenishment.fechaCompletada}</p>
                </div>
              )}

              {selectedReplenishment.proveedores && selectedReplenishment.proveedores.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-blue-900 mb-2">Proveedores asignados:</p>
                  {selectedReplenishment.proveedores.map((prov, idx) => (
                    <p key={idx} className="text-xs text-blue-800">
                      📦 {prov.proveedorNombre}: {prov.cantidad} ud. x {prov.precioUnitario.toFixed(2)}€
                    </p>
                  ))}
                </div>
              )}

              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => setSelectedReplenishment(null)}>
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </>
      )}

      {/* Dialog de detalles */}
      <Dialog open={selectedRequest !== null} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detalles de la solicitud</DialogTitle>
            <DialogDescription>
              Información completa de la solicitud {selectedRequest?.id}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Nº Solicitud</p>
                  <p className="text-sm font-semibold text-foreground">{selectedRequest.id}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Fecha</p>
                  <p className="text-sm text-foreground">{selectedRequest.fecha}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Producto</p>
                <p className="text-sm text-foreground">{selectedRequest.producto}</p>
                {selectedRequest.productoLink && (
                  <a
                    href={selectedRequest.productoLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary underline underline-offset-4"
                  >
                    Ver enlace
                  </a>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Cantidad</p>
                  <p className="text-sm text-foreground">{selectedRequest.cantidad}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Solicitante</p>
                  <p className="text-sm text-foreground">{selectedRequest.solicitante}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Departamento</p>
                <p className="text-sm text-foreground">{selectedRequest.departamento ?? "—"}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Estado</p>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClasses[selectedRequest.estado]}`}>
                  {selectedRequest.estado}
                </span>
              </div>

              {selectedRequest.numero_pedido && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Nº Pedido</p>
                  <p className="text-sm text-foreground">{selectedRequest.numero_pedido}</p>
                </div>
              )}

              {selectedRequest.numero_seguimiento && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Nº Seguimiento</p>
                  <p className="text-sm text-foreground">{selectedRequest.numero_seguimiento}</p>
                </div>
              )}

              {selectedRequest.fecha_entrega && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Fecha Entrega</p>
                  <p className="text-sm text-foreground">{selectedRequest.fecha_entrega}</p>
                </div>
              )}

              {selectedRequest.numero_referencia_factura && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Ref. interna de factura</p>
                  <p className="text-sm text-foreground">{selectedRequest.numero_referencia_factura}</p>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}