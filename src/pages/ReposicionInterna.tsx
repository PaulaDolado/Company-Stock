import { useMemo, useState } from "react";
import { Plus, Trash2, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue,} from "@/components/ui/select";
import {Table,TableBody,TableCell,TableHead,TableHeader,TableRow,} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle,} from "@/components/ui/dialog";
import { SupplierAssignmentDialog, SupplierLinesSection } from "@/components/SupplierAssignmentDialog";
import { useSupplierAssignment } from "@/hooks/useSupplierAssignment";
import { useInternalReplenishmentsQuery, useCreateInternalReplenishment, useUpdateInternalReplenishment, useDeleteInternalReplenishment, useAddReplenishmentSupplierLine, useRemoveReplenishmentSupplierLine,} from "@/hooks/useInternalReplenishments";
import { useProductsQuery } from "@/hooks/useProducts";
import {replenishmentStatuses,replenishmentStatusClasses,RequestStatus,InternalReplenishment,isReplenishmentArchived,availableNextStates,validateStateTransition,} from "@/data/mock";

export default function ReposicionInternaPage() {
  const { data: replenishments = [], isLoading, isError } = useInternalReplenishmentsQuery();
  const { data: products = [] } = useProductsQuery();
  const createReplenishment = useCreateInternalReplenishment();
  const updateReplenishment = useUpdateInternalReplenishment();
  const deleteReplenishment = useDeleteInternalReplenishment();
  const addSupplierLine = useAddReplenishmentSupplierLine();
  const removeSupplierLine = useRemoveReplenishmentSupplierLine();

  const [statusFilter, setStatusFilter] = useState<string>("todas");
  const [openDialog, setOpenDialog] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    productoId: "",
    cantidadRequerir: 0,
    ubicacion: "",
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<InternalReplenishment | null>(null);
  const [originalEstado, setOriginalEstado] =
    useState<InternalReplenishment["estado"] | null>(null);

  const supplierAssignment = useSupplierAssignment({
    targetQuantity: editData?.cantidadRequerir ?? 0,
    onAddLine: async (line) => {
      if (!editData) throw new Error("No hay ninguna reposición seleccionada");
      const saved = await addSupplierLine.mutateAsync({ replenishmentId: editData.id, line });
      // El backend deriva la reposición a compra en cuanto se asigna un
      // proveedor (si venía de "Aprobada") y genera su pedido; reflejamos
      // ese cambio de estado aquí mismo, sin esperar a "Guardar cambios".
      setEditData((prev) => {
        if (!prev) return prev;
        const nextEstado = prev.estado === "Aprobada" ? "Derivada a compra" : prev.estado;
        if (nextEstado !== prev.estado) {
          toast.success('La reposición pasó a "Derivada a compra"');
        }
        return { ...prev, estado: nextEstado, proveedores: [...(prev.proveedores ?? []), saved] };
      });
      return saved;
    },
    onRemoveLine: async (line) => {
      if (!editData) return;
      await removeSupplierLine.mutateAsync({ replenishmentId: editData.id, lineId: line.id });
      setEditData((prev) =>
        prev ? { ...prev, proveedores: (prev.proveedores ?? []).filter((p) => p.id !== line.id) } : prev
      );
    },
  });

  // Las reposiciones entregadas, o con más de un mes desde su creación,
  // pasan a verse en Solicitudes anteriores en lugar de aquí.
  const active = useMemo(
    () => replenishments.filter((r) => !isReplenishmentArchived(r)),
    [replenishments]
  );

  const filtered = useMemo(() => {
    return statusFilter === "todas"
      ? active
      : active.filter((r) => r.estado === statusFilter);
  }, [statusFilter, active]);

  // Obtener productos con stock bajo
  const productsWithLowStock = useMemo(() => {
    return products.filter((p) => p.cantidad < p.minimo);
  }, [products]);

  const handleCreateReplenishment = async () => {
    if (!formData.productoId.trim()) {
      setFormError("Selecciona un producto");
      return;
    }
    if (formData.cantidadRequerir <= 0) {
      setFormError("La cantidad debe ser mayor a 0");
      return;
    }
    if (!formData.ubicacion.trim()) {
      setFormError("Indica la ubicación");
      return;
    }

    const selectedProduct = products.find((p) => p.id === formData.productoId);
    if (!selectedProduct) {
      setFormError("Producto no encontrado");
      return;
    }

    try {
      await createReplenishment.mutateAsync({
        productId: selectedProduct.id,
        cantidadRequerir: formData.cantidadRequerir,
        ubicacion: formData.ubicacion,
      });
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "No se pudo crear la reposición");
      return;
    }

    setFormData({ productoId: "", cantidadRequerir: 0, ubicacion: "" });
    setOpenDialog(false);
    setFormError(null);

    toast.success(`Reposición interna creada para ${selectedProduct.nombre}`);
  };

  const handleDeleteReplenishment = async (id: string) => {
    try {
      await deleteReplenishment.mutateAsync(id);
      toast.success("Reposición eliminada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo eliminar la reposición");
    }
  };

  const startEdit = (replenishment: InternalReplenishment) => {
    setEditingId(replenishment.id);
    setEditData({ ...replenishment });
    setOriginalEstado(replenishment.estado);
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
    if (!editData || !originalEstado) return;

    const error = validateStateTransition(originalEstado, editData.estado);
    if (error) {
      setFormError(error);
      return;
    }

    try {
      await updateReplenishment.mutateAsync({
        id: editData.id,
        changes: {
          estado: editData.estado,
          numero_pedido: editData.numero_pedido,
          numero_seguimiento: editData.numero_seguimiento,
        },
      });
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "No se pudo guardar la reposición");
      return;
    }

    cancelEdit();
    toast.success("Reposición actualizada");
  };

  const handleFieldChange = (
    field: "numero_pedido" | "numero_seguimiento",
    value: string
  ) => {
    if (!editData) return;
    setFormError(null);

    let nextEstado = editData.estado;
    if (field === "numero_pedido" && value.trim()) {
      nextEstado = "Enviado";
    }
    if (field === "numero_seguimiento" && value.trim()) {
      nextEstado = "En tránsito";
    }

    setEditData({ ...editData, [field]: value, estado: nextEstado });
  };

  const handleEstadoChange = (value: string) => {
    if (!editData) return;
    setFormError(null);
    setEditData({ ...editData, estado: value as RequestStatus });
  };

  return (
    <AppShell
      title="Reposición Interna"
      subtitle="Gestión de stock bajo en almacén"
      actions={
        <Button onClick={() => setOpenDialog(true)}>
          <Plus className="size-4" />
          Nueva reposición
        </Button>
      }
    >
      {/* Cards de resumen */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">
              {active.length}
            </div>
            <p className="text-xs text-muted-foreground">Total reposiciones</p>
          </CardContent>
        </Card>
        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {active.filter((r) => r.estado === "Pendiente").length}
            </div>
            <p className="text-xs text-muted-foreground">Pendientes</p>
          </CardContent>
        </Card>
        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {active.filter((r) => r.estado === "Aprobada").length}
            </div>
            <p className="text-xs text-muted-foreground">Aprobadas</p>
          </CardContent>
        </Card>
        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {active.filter((r) => r.estado === "Derivada a compra").length}
            </div>
            <p className="text-xs text-muted-foreground">Derivadas a compra</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de reposiciones */}
      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
            <span className="text-sm font-medium text-muted-foreground">
              Filtrar por estado
            </span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {replenishmentStatuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="ml-auto text-sm text-muted-foreground">
              {filtered.length} reposición{filtered.length === 1 ? "" : "es"}
            </span>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">ID</TableHead>
                  <TableHead className="w-32">Nº Producto</TableHead>
                  <TableHead>Nombre del producto</TableHead>
                  <TableHead className="w-20 text-right">Stock</TableHead>
                  <TableHead className="w-20 text-right">Mínimo</TableHead>
                  <TableHead className="w-20 text-right">Requerir</TableHead>
                  <TableHead className="w-28">Ubicación</TableHead>
                  <TableHead className="w-32">Estado</TableHead>
                  <TableHead className="w-32 text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                      Cargando reposiciones…
                    </TableCell>
                  </TableRow>
                )}
                {isError && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-10 text-center text-sm text-destructive">
                      No se pudieron cargar las reposiciones.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {r.id}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {r.productoNumero}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {r.productoNombre}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-destructive font-semibold">
                      {r.cantidadActual}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {r.cantidadMinima}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {r.cantidadRequerir}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.ubicacion}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${replenishmentStatusClasses[r.estado]}`}
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
                        {r.proveedores && r.proveedores.length > 0 && (
                          <div className="text-xs text-muted-foreground mt-1 space-y-1">
                            {r.proveedores.map((prov) => (
                              <p key={prov.id}>
                                📦 {prov.proveedorNombre}: {prov.cantidad} ud.
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => startEdit(r)}>
                          <Edit2 className="size-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteReplenishment(r.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && !isError && filtered.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      No hay reposiciones con ese estado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Productos con stock bajo */}
      {productsWithLowStock.length > 0 && (
        <Card className="border-border/70 shadow-sm mt-6">
          <CardContent className="p-0">
            <div className="border-b border-border p-4 bg-yellow-50">
              <h3 className="font-semibold text-foreground">
                ⚠️ Productos con stock bajo
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {productsWithLowStock.length} producto
                {productsWithLowStock.length === 1 ? "" : "s"} por debajo del
                stock mínimo
              </p>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Nº Producto</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="w-20 text-right">Stock</TableHead>
                    <TableHead className="w-20 text-right">Mínimo</TableHead>
                    <TableHead className="w-28">Diferencia</TableHead>
                    <TableHead className="w-32 text-center">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productsWithLowStock.map((p) => {
                    const diferencia = p.minimo - p.cantidad;
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {p.numero}
                        </TableCell>
                        <TableCell className="font-medium">
                          {p.nombre}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-destructive font-bold">
                          {p.cantidad}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {p.minimo}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                            Faltan {diferencia}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            onClick={() => {
                              setFormData({
                                productoId: p.id,
                                cantidadRequerir: diferencia,
                                ubicacion: "",
                              });
                              setOpenDialog(true);
                            }}
                          >
                            <Plus className="size-4" />
                            Crear
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog para crear reposición */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva reposición interna</DialogTitle>
            <DialogDescription>
              Crea una solicitud de reposición para cualquier producto del inventario
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="producto" className="text-sm">
                Producto *
              </Label>
              <Select
                value={formData.productoId}
                onValueChange={(value) =>
                  setFormData({ ...formData, productoId: value })
                }
              >
                <SelectTrigger id="producto" className="mt-1">
                  <SelectValue placeholder="Selecciona un producto" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre} ({p.numero}) - Stock: {p.cantidad}/{p.minimo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="cantidad" className="text-sm">
                Cantidad a requerir *
              </Label>
              <Input
                id="cantidad"
                type="number"
                min="1"
                value={formData.cantidadRequerir || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    cantidadRequerir: parseInt(e.target.value) || 0,
                  })
                }
                placeholder="Ej: 15"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="ubicacion" className="text-sm">
                Ubicación en almacén *
              </Label>
              <Input
                id="ubicacion"
                placeholder="Ej: Estante A-3"
                value={formData.ubicacion}
                onChange={(e) =>
                  setFormData({ ...formData, ubicacion: e.target.value })
                }
                className="mt-1"
              />
            </div>

            {formError && (
              <div className="bg-destructive/10 border border-destructive/30 rounded p-3 text-xs text-destructive">
                {formError}
              </div>
            )}

            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setOpenDialog(false);
                  setFormError(null);
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleCreateReplenishment} className="bg-primary">
                Crear reposición
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de edición */}
      <Dialog open={editingId !== null} onOpenChange={(open) => !open && cancelEdit()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar reposición</DialogTitle>
            <DialogDescription>
              Actualiza los datos de seguimiento de la reposición interna
            </DialogDescription>
          </DialogHeader>

          {editData && originalEstado && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Producto</p>
                <p className="text-sm text-muted-foreground">{editData.productoNombre}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Cantidad requerida</p>
                  <p className="text-sm text-muted-foreground">{editData.cantidadRequerir}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Ubicación</p>
                  <p className="text-sm text-muted-foreground">{editData.ubicacion}</p>
                </div>
              </div>

              <SupplierLinesSection
                canAssign={editData.estado === "Aprobada" || editData.estado === "Derivada a compra"}
                lines={editData.proveedores}
                onOpenAssignment={() => supplierAssignment.open(editData.proveedores || [])}
              />

              <div>
                <Label htmlFor="rep-numero-pedido" className="text-sm">
                  Nº Pedido
                </Label>
                <Input
                  id="rep-numero-pedido"
                  placeholder="Ej: PED-4025"
                  value={editData.numero_pedido || ""}
                  onChange={(e) => handleFieldChange("numero_pedido", e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="rep-numero-seguimiento" className="text-sm">
                  Nº Seguimiento
                </Label>
                <Input
                  id="rep-numero-seguimiento"
                  placeholder="Ej: TRACK123456"
                  value={editData.numero_seguimiento || ""}
                  onChange={(e) => handleFieldChange("numero_seguimiento", e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="rep-estado" className="text-sm">
                  Estado
                </Label>
                <Select value={editData.estado} onValueChange={handleEstadoChange}>
                  <SelectTrigger id="rep-estado" className="mt-1">
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
                      // enlazado. Elegirlo a mano aquí dejaría la reposición en ese
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

      <SupplierAssignmentDialog
        assignment={supplierAssignment}
        quantityLabel="Cantidad total requerida"
        description="Distribuye la cantidad requerida entre uno o más proveedores"
      />
    </AppShell>
  );
}
