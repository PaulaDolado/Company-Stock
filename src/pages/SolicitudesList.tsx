import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, History, Edit2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem,SelectTrigger, SelectValue,} from "@/components/ui/select";
import {  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent,DialogDescription, DialogHeader,DialogTitle,} from "@/components/ui/dialog";
import { SupplierAssignmentDialog, SupplierLinesSection } from "@/components/SupplierAssignmentDialog";
import { useSupplierAssignment } from "@/hooks/useSupplierAssignment";
import {useMaterialRequestsQuery,useUpdateMaterialRequest,useAddMaterialRequestSupplierLine, useRemoveMaterialRequestSupplierLine,} from "@/hooks/useMaterialRequests";
import {requestStatuses,statusClasses,MaterialRequest,REQUEST_REQUIRED_FIELDS,isRequestArchived,availableNextStates, validateStateTransition,} from "@/data/mock";
import { useAuth } from "@/lib/auth";

function validateTransition(
  from: MaterialRequest["estado"],
  to: MaterialRequest["estado"],
  data: MaterialRequest,
): string | null {
  const stateError = validateStateTransition(from, to);
  if (stateError) return stateError;

  const required = REQUEST_REQUIRED_FIELDS[to];
  if (required) {
    for (const field of required) {
      if (!data[field] || !data[field]!.trim()) {
        const labels: Record<string, string> = {
          numero_pedido: "el número de pedido",
          numero_seguimiento: "el número de seguimiento",
          fecha_entrega: "la fecha de entrega",
        };
        return `Para marcar "${to}" hace falta indicar ${labels[field] ?? field}.`;
      }
    }
  }
  return null;
}

export default function RequestsPage() {
  const { user } = useAuth();
  const isSolicitante = user?.role === "SOLICITANTE";

  const { data: requests = [], isLoading, isError } = useMaterialRequestsQuery();
  const updateRequest = useUpdateMaterialRequest();
  const addSupplierLine = useAddMaterialRequestSupplierLine();
  const removeSupplierLine = useRemoveMaterialRequestSupplierLine();

  const [statusFilter, setStatusFilter] = useState<string>("todas");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<MaterialRequest | null>(null);
  const [originalEstado, setOriginalEstado] = useState<MaterialRequest["estado"] | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const supplierAssignment = useSupplierAssignment({
    targetQuantity: editData?.cantidad ?? 0,
    onAddLine: async (line) => {
      if (!editData) throw new Error("No hay ninguna solicitud seleccionada");
      const saved = await addSupplierLine.mutateAsync({ requestId: editData.id, line });
      // El backend deriva la solicitud a compra en cuanto se asigna un
      // proveedor (si venía de "Aprobada") y genera su pedido; reflejamos
      // ese cambio de estado aquí mismo, sin esperar a "Guardar cambios".
      setEditData((prev) => {
        if (!prev) return prev;
        const nextEstado = prev.estado === "Aprobada" ? "Derivada a compra" : prev.estado;
        if (nextEstado !== prev.estado) {
          toast.success('La solicitud pasó a "Derivada a compra"');
        }
        return { ...prev, estado: nextEstado, proveedores: [...(prev.proveedores ?? []), saved] };
      });
      return saved;
    },
    onRemoveLine: async (line) => {
      if (!editData) return;
      await removeSupplierLine.mutateAsync({ requestId: editData.id, lineId: line.id });
      setEditData((prev) =>
        prev ? { ...prev, proveedores: (prev.proveedores ?? []).filter((p) => p.id !== line.id) } : prev
      );
    },
  });

  const filtered = useMemo(() => {
    const active = requests.filter((r) => !isRequestArchived(r));
    const ownOnly = isSolicitante
      ? active.filter((r) => r.solicitante === user?.nombre)
      : active;
    return statusFilter === "todas" ? ownOnly : ownOnly.filter((r) => r.estado === statusFilter);
  }, [statusFilter, requests, isSolicitante, user?.nombre]);

  const startEdit = (request: MaterialRequest) => {
    if (isSolicitante) return;
    setEditingId(request.id);
    setEditData({ ...request });
    setOriginalEstado(request.estado);
    setFormError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData(null);
    setOriginalEstado(null);
    setFormError(null);
    supplierAssignment.close();
  };

  const saveEdit = async () => {
    if (!editData || isSolicitante || !originalEstado) return;

    const error = validateTransition(originalEstado, editData.estado, editData);
    if (error) {
      setFormError(error);
      return;
    }

    try {
      await updateRequest.mutateAsync({
        id: editData.id,
        changes: {
          estado: editData.estado,
          numero_pedido: editData.numero_pedido,
          numero_seguimiento: editData.numero_seguimiento,
          numero_referencia_factura: editData.numero_referencia_factura,
          fecha_entrega: editData.fecha_entrega,
        },
      });
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "No se pudo guardar la solicitud");
      return;
    }

    // El aviso por email al derivar a compra ahora lo manda el backend
    // (deriveMaterialRequestToCompra), no el frontend: así se dispara
    // siempre, tanto al asignar un proveedor como al cambiar el estado a
    // mano aquí, sin depender de este botón concreto.
    setEditingId(null);
    setEditData(null);
    setOriginalEstado(null);
    setFormError(null);
    toast.success("Solicitud actualizada");
  };

  const handleFieldChange = (
    field: keyof MaterialRequest,
    value: string
  ) => {
    if (!editData) return;
    setFormError(null);

    let nextEstado = editData.estado;
    if (
      field === "numero_pedido" &&
      value.trim() &&
      editData.estado === "Derivada a compra"
    ) {
      nextEstado = "Enviado";
    }
    if (
      field === "numero_seguimiento" &&
      value.trim() &&
      editData.estado === "Enviado"
    ) {
      nextEstado = "En tránsito";
    }

    setEditData({ ...editData, [field]: value, estado: nextEstado });
  };

  const handleEstadoChange = (value: string) => {
    if (!editData) return;
    setFormError(null);
    setEditData({ ...editData, estado: value as MaterialRequest["estado"] });
  };

  return (
    <AppShell
      title="Solicitudes"
      subtitle="Peticiones de material del equipo"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to="/solicitudes/historico">
              <History className="size-4" />
              Solicitudes anteriores
            </Link>
          </Button>
          <Button asChild>
            <Link to="/solicitudes/nueva">
              <Plus className="size-4" />
              Nueva solicitud
            </Link>
          </Button>
        </div>
      }
    >
      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
            <span className="text-sm font-medium text-muted-foreground">
              Filtrar por estado
            </span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-56" aria-label="Filtrar por estado">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {requestStatuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="ml-auto text-sm text-muted-foreground">
              {filtered.length} solicitud{filtered.length === 1 ? "" : "es"}
            </span>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="w-32">Departamento</TableHead>
                  <TableHead className="w-40 text-right">
                    Cantidad solicitada
                  </TableHead>
                  <TableHead className="w-44">Solicitante</TableHead>
                  <TableHead className="w-48">Estado</TableHead>
                  <TableHead className="w-32 text-right">Fecha</TableHead>
                  {!isSolicitante && <TableHead className="w-32">Editar</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={isSolicitante ? 6 : 7} className="py-10 text-center text-sm text-muted-foreground">
                      Cargando solicitudes…
                    </TableCell>
                  </TableRow>
                )}
                {isError && (
                  <TableRow>
                    <TableCell colSpan={isSolicitante ? 6 : 7} className="py-10 text-center text-sm text-destructive">
                      No se pudieron cargar las solicitudes.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium text-foreground">
                      <div className="flex items-center gap-1.5">
                        <span>{r.producto}</span>
                        {r.productoLink && (
                          <a
                            href={r.productoLink}
                            target="_blank"
                            rel="noreferrer"
                            title="Ver producto"
                            aria-label={`Ver enlace de ${r.producto}`}
                            className="text-muted-foreground hover:text-primary"
                          >
                            <ExternalLink className="size-3.5" />
                          </a>
                        )}
                      </div>
                      {!r.productoId && (
                        <span className="mt-0.5 inline-flex items-center rounded-full bg-warning/20 px-2 py-0.5 text-[11px] font-medium text-warning-foreground">
                          No está en stock
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.departamento ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.cantidad}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.solicitante}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClasses[r.estado]}`}
                        >
                          {r.estado}
                        </span>
                        {r.numero_pedido && (
                          <p className="text-xs text-muted-foreground">
                            Pedido: {r.numero_pedido}
                          </p>
                        )}
                        {r.numero_seguimiento && (
                          <p className="text-xs text-muted-foreground">
                            Seguimiento: {r.numero_seguimiento}
                          </p>
                        )}
                        {r.fecha_entrega && (
                          <p className="text-xs text-muted-foreground">
                            Entrega: {r.fecha_entrega}
                          </p>
                        )}
                        {r.numero_referencia_factura && (
                          <p className="text-xs text-muted-foreground">
                            Ref. factura: {r.numero_referencia_factura}
                          </p>
                        )}
                        {r.proveedores && r.proveedores.length > 0 && (
                          <div className="text-xs text-muted-foreground mt-2 space-y-1">
                            {r.proveedores.map((prov) => (
                              <p key={prov.id}>
                                📦 {prov.proveedorNombre}: {prov.cantidad} ud.
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {r.fecha}
                    </TableCell>
                    {!isSolicitante && (
                      <TableCell className="py-2.5">
                        <Button size="sm" variant="outline" onClick={() => startEdit(r)}>
                          <Edit2 className="size-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {!isLoading && !isError && filtered.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={isSolicitante ? 6 : 7}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      No hay solicitudes con ese estado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de edición */}
      {!isSolicitante && (
        <Dialog open={editingId !== null} onOpenChange={(open) => !open && cancelEdit()}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Editar solicitud</DialogTitle>
              <DialogDescription>
                Actualiza los datos de seguimiento de la solicitud
              </DialogDescription>
            </DialogHeader>

            {editData && originalEstado && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">
                    Producto
                  </p>
                  <p className="text-sm text-muted-foreground">{editData.producto}</p>
                  {!editData.productoId && (
                    <p className="mt-1 text-xs font-medium text-warning-foreground">
                      No está en stock todavía
                      {editData.productoLink && (
                        <>
                          {" · "}
                          <a
                            href={editData.productoLink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary underline underline-offset-4"
                          >
                            Ver enlace
                          </a>
                        </>
                      )}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">
                      Cantidad
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {editData.cantidad}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">
                      Solicitante
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {editData.solicitante}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-foreground mb-2">
                    Departamento
                  </p>
                  <p className="text-sm text-muted-foreground">{editData.departamento ?? "—"}</p>
                </div>

                {editData.mensaje && (
                  <div className="rounded-lg bg-muted/50 p-3 border border-border">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Mensaje del solicitante
                    </p>
                    <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                      {editData.mensaje}
                    </p>
                  </div>
                )}       

                <SupplierLinesSection
                  canAssign={editData.estado === "Aprobada" || editData.estado === "Derivada a compra"}
                  lines={editData.proveedores}
                  onOpenAssignment={() => supplierAssignment.open(editData.proveedores || [])}
                />

                <div>
                  <Label htmlFor="numero_pedido" className="text-sm">
                    Nº Pedido
                  </Label>
                  <Input
                    id="numero_pedido"
                    placeholder="Ej: PED-4025"
                    value={editData.numero_pedido || ""}
                    onChange={(e) =>
                      handleFieldChange("numero_pedido", e.target.value)
                    }
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="numero_seguimiento" className="text-sm">
                    Nº Seguimiento
                  </Label>
                  <Input
                    id="numero_seguimiento"
                    placeholder="Ej: TRACK123456"
                    value={editData.numero_seguimiento || ""}
                    onChange={(e) =>
                      handleFieldChange("numero_seguimiento", e.target.value)
                    }
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="fecha_entrega" className="text-sm">
                    Fecha Entrega
                  </Label>
                  <Input
                    id="fecha_entrega"
                    type="date"
                    value={editData.fecha_entrega || ""}
                    onChange={(e) =>
                      handleFieldChange("fecha_entrega", e.target.value)
                    }
                    className="mt-1"
                  />
                </div>

                {editData.estado === "Entregado" && (
                  <div>
                    <Label htmlFor="numero_referencia_factura" className="text-sm">
                      Nº Referencia interna de factura (opcional)
                    </Label>
                    <Input
                      id="numero_referencia_factura"
                      placeholder="Ej: FACT-2026-0345"
                      value={editData.numero_referencia_factura || ""}
                      onChange={(e) =>
                        handleFieldChange("numero_referencia_factura", e.target.value)
                      }
                      className="mt-1"
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="estado" className="text-sm">
                    Estado
                  </Label>
                  <Select
                    value={editData.estado}
                    onValueChange={handleEstadoChange}
                  >
                    <SelectTrigger id="estado" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Incluye siempre el estado actual: si numero_pedido/numero_seguimiento
                          disparó una auto-transición (p.ej. a "Enviado"), puede no estar entre
                          los alcanzables desde originalEstado. */}
                      {Array.from(
                        new Set([
                          ...availableNextStates(originalEstado),
                          editData.estado,
                        ])
                      )
                        // "Derivada a compra" solo se alcanza asignando un proveedor
                        // (más abajo): eso genera el Pedido automáticamente y lo deja
                        // enlazado. Elegirlo a mano aquí dejaría la solicitud en ese
                        // estado sin ningún Pedido asociado, y nunca aparecería en la
                        // sección de Pedidos ni tendría seguimiento.
                        .filter((s) => s !== "Derivada a compra" || editData.estado === "Derivada a compra")
                        .map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {formError && (
                  <div className="bg-destructive/10 border border-destructive/30 rounded p-3 text-xs text-destructive">
                    {formError}
                  </div>
                )}
                <div className="flex gap-2 justify-end pt-4 border-t">
                  <Button variant="outline" onClick={cancelEdit}>
                    Cancelar
                  </Button>
                  <Button onClick={saveEdit} className="bg-primary">
                    Guardar cambios
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      <SupplierAssignmentDialog
        assignment={supplierAssignment}
        quantityLabel="Cantidad total solicitada"
        description="Distribuye la cantidad entre uno o más proveedores"
      />
    </AppShell>
  );
}
