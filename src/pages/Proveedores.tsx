import { useMemo, useState } from "react";
import { Building2, Globe, Mail, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow,} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,} from "@/components/ui/dialog";
import { useSuppliersQuery, useCreateSupplier, useUpdateSupplier, useDeleteSupplier,} from "@/hooks/useSuppliers";
import { useProductsQuery } from "@/hooks/useProducts";

export default function SuppliersPage() {
  const { data: suppliers = [], isLoading, isError } = useSuppliersQuery();
  const { data: products = [] } = useProductsQuery();
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const deleteSupplier = useDeleteSupplier();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState({ nombre: "", telefono: "", web: "", email: "" });

  const selected = useMemo(
    () => suppliers.find((s) => s.id === selectedId) ?? suppliers[0],
    [suppliers, selectedId]
  );

  const productosDelProveedor = useMemo(
    () => products.filter((p) => p.proveedorId === selected?.id),
    [products, selected]
  );

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormError(null);
  };

  const handleOpenCreateDialog = () => {
    setEditingId(null);
    setFormData({ nombre: "", telefono: "", web: "", email: "" });
    setFormError(null);
    setOpenDialog(true);
  };

  const handleOpenEditDialog = () => {
    if (!selected) return;
    setEditingId(selected.id);
    setFormData({
      nombre: selected.nombre,
      telefono: selected.telefono,
      web: selected.web,
      email: selected.email,
    });
    setFormError(null);
    setOpenDialog(true);
  };

  const handleSaveSupplier = async () => {
    if (!formData.nombre.trim()) {
      setFormError("El nombre del proveedor es obligatorio");
      return;
    }

    try {
      if (editingId) {
        await updateSupplier.mutateAsync({
          id: editingId,
          changes: {
            nombre: formData.nombre,
            telefono: formData.telefono,
            web: formData.web,
            email: formData.email,
          },
        });
      } else {
        const nuevo = await createSupplier.mutateAsync({
          nombre: formData.nombre,
          telefono: formData.telefono || undefined,
          web: formData.web || undefined,
          email: formData.email || undefined,
        });
        setSelectedId(nuevo.id);
      }
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "No se pudo guardar el proveedor");
      return;
    }

    const mensaje = editingId ? "actualizado" : "agregado";
    setOpenDialog(false);
    setFormError(null);
    toast.success(`Proveedor «${formData.nombre}» ${mensaje} correctamente`);
    setFormData({ nombre: "", telefono: "", web: "", email: "" });
    setEditingId(null);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFormData({ nombre: "", telefono: "", web: "", email: "" });
    setFormError(null);
    setEditingId(null);
  };

  const handleDeleteSupplier = async () => {
    if (!selected) return;
    if (!window.confirm(`¿Eliminar el proveedor «${selected.nombre}»? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      await deleteSupplier.mutateAsync(selected.id);
      setSelectedId(null);
      toast.success(`Proveedor «${selected.nombre}» eliminado`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo eliminar el proveedor");
    }
  };

  const formatearPrecio = (precio: number) =>
    new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(precio);

  const webDisplay = selected?.web.replace(/^https?:\/\//, "");

  return (
    <AppShell title="Proveedores" subtitle="Directorio de suministradores">
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="h-fit border-border/70 shadow-sm">
          <CardContent className="p-0">
            <div className="border-b border-border p-4">
              <Button className="w-full" onClick={handleOpenCreateDialog}>
                <Plus className="size-4" />
                Nuevo proveedor
              </Button>
            </div>
            {isLoading && (
              <p className="p-4 text-sm text-muted-foreground">Cargando proveedores…</p>
            )}
            {isError && (
              <p className="p-4 text-sm text-destructive">No se pudieron cargar los proveedores.</p>
            )}
            <ul className="p-2">
              {suppliers.map((s) => {
                const active = s.id === selected?.id;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(s.id)}
                      aria-current={active}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                        active
                          ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <span
                        className={`flex size-8 shrink-0 items-center justify-center rounded-md ${
                          active
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Building2 className="size-4" />
                      </span>
                      {s.nombre}
                    </button>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-6">
            {!selected ? (
              <p className="text-sm text-muted-foreground">
                Todavía no hay proveedores. Crea el primero con «Nuevo proveedor».
              </p>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-xl font-semibold tracking-tight text-foreground">
                    {selected.nombre}
                  </h2>
                  <div className="flex shrink-0 gap-2">
                    <Button variant="outline" size="sm" onClick={handleOpenEditDialog}>
                      <Pencil className="size-4" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeleteSupplier}
                      disabled={deleteSupplier.isPending}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                      Eliminar
                    </Button>
                  </div>
                </div>

                <dl className="mt-5 grid gap-4 sm:grid-cols-3">
                  <div>
                    <dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <Phone className="size-3.5" />
                      Teléfono
                    </dt>
                    <dd className="mt-1 text-sm text-foreground">{selected.telefono || "—"}</dd>
                  </div>

                  <div>
                    <dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <Globe className="size-3.5" />
                      Web
                    </dt>
                    <dd className="mt-1 text-sm">
                      {selected.web ? (
                        <a
                          href={selected.web}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline underline-offset-4 hover:opacity-80"
                        >
                          {webDisplay}
                        </a>
                      ) : (
                        "—"
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <Mail className="size-3.5" />
                      Correo electrónico
                    </dt>
                    <dd className="mt-1 text-sm">
                      {selected.email ? (
                        <a
                          href={`mailto:${selected.email}`}
                          className="text-primary underline underline-offset-4 hover:opacity-80"
                        >
                          {selected.email}
                        </a>
                      ) : (
                        "—"
                      )}
                    </dd>
                  </div>
                </dl>

                <h3 className="mt-8 text-sm font-semibold text-foreground">
                  Productos que suministra
                </h3>
                <div className="mt-3 overflow-x-auto rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-32">Número</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead className="w-40 text-right">Rango de precio</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productosDelProveedor.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {p.numero}
                          </TableCell>
                          <TableCell className="font-medium text-foreground">
                            {p.nombre}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {p.precioMinimo != null && p.precioMaximo != null
                              ? `${formatearPrecio(p.precioMinimo)} – ${formatearPrecio(p.precioMaximo)}`
                              : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                      {productosDelProveedor.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="py-6 text-center text-sm text-muted-foreground">
                            Este proveedor todavía no tiene productos asignados en el inventario.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={openDialog} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar proveedor" : "Nuevo proveedor"}</DialogTitle>
            <DialogDescription>
              {editingId
                ? "Actualiza los datos de contacto de este proveedor."
                : "Completa los datos de contacto del nuevo proveedor. Los productos que suministra se asignan después desde Inventario → Nuevo producto."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="nombre" className="text-sm">
                Nombre del proveedor *
              </Label>
              <Input
                id="nombre"
                placeholder="Ej: Acme Corp"
                value={formData.nombre}
                onChange={(e) => handleInputChange("nombre", e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="telefono" className="text-sm">
                  Teléfono
                </Label>
                <Input
                  id="telefono"
                  placeholder="Ej: +34 912 345 678"
                  value={formData.telefono}
                  onChange={(e) => handleInputChange("telefono", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="email" className="text-sm">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Ej: info@acme.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="web" className="text-sm">
                Web
              </Label>
              <Input
                id="web"
                placeholder="Ej: https://www.acme.com"
                value={formData.web}
                onChange={(e) => handleInputChange("web", e.target.value)}
                className="mt-1"
              />
            </div>

            {formError && (
              <div className="bg-destructive/10 border border-destructive/30 rounded p-3 text-xs text-destructive">
                {formError}
              </div>
            )}

            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button
                onClick={handleSaveSupplier}
                className="bg-primary"
                disabled={createSupplier.isPending || updateSupplier.isPending}
              >
                {editingId ? "Guardar cambios" : "Guardar proveedor"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
