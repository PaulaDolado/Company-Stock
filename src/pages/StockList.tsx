import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, AlertTriangle, Edit2, Trash2, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue,} from "@/components/ui/select";
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle,} from "@/components/ui/dialog";
import {Table,TableBody,TableCell,TableHead,TableHeader,TableRow,} from "@/components/ui/table";
import { Product, productPlaceholderImage } from "@/data/mock";
import { ProductImagePicker } from "@/components/ProductImagePicker";
import { useProductsQuery, useUpdateProduct, useDeleteProduct } from "@/hooks/useProducts";
import { useSuppliersQuery } from "@/hooks/useSuppliers";
import { cn } from "@/lib/utils";

// Radix Select no admite un SelectItem con value="": este sentinel
// representa "sin proveedor" en el Select del diálogo de edición.
const NO_SUPPLIER = "__none__";

type SortKey =
  | "numero"
  | "nombre"
  | "cantidad"
  | "minimo"
  | "precioMinimo"
  | "precioMaximo"
  | "diferencia"
  | "ubicacion"
  | "proveedor";

type SortConfig = { key: SortKey; direction: "asc" | "desc" };

function SortableHead({
  label,
  sortKey,
  sortConfig,
  onSort,
  align = "left",
  className,
}: {
  label: string;
  sortKey: SortKey;
  sortConfig: SortConfig | null;
  onSort: (key: SortKey) => void;
  align?: "left" | "right";
  className?: string;
}) {
  const active = sortConfig?.key === sortKey;
  const Icon = active ? (sortConfig!.direction === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex w-full items-center gap-1 hover:text-foreground",
          align === "right" ? "justify-end" : "justify-start",
        )}
        aria-label={`Ordenar por ${label}`}
      >
        <span>{label}</span>
        <Icon className={cn("size-3.5 shrink-0", active ? "text-foreground" : "text-muted-foreground/40")} />
      </button>
    </TableHead>
  );
}

export default function StockPage() {
  const [query, setQuery] = useState("");
  const { data: productList = [], isLoading, isError } = useProductsQuery();
  const { data: suppliers = [] } = useSuppliersQuery();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Product | null>(null);
  const [imagePreview, setImagePreview] = useState<string | undefined>(undefined);
  const [formError, setFormError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return productList;
    return productList.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        p.numero.toLowerCase().includes(q),
    );
  }, [query, productList]);

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => {
      if (!prev || prev.key !== key) return { key, direction: "asc" };
      if (prev.direction === "asc") return { key, direction: "desc" };
      return null;
    });
  };

  const getSortValue = (p: Product, key: SortKey): string | number => {
    switch (key) {
      case "precioMinimo":
        return p.precioMinimo || 0;
      case "precioMaximo":
        return p.precioMaximo || 0;
      case "diferencia":
        return (p.precioMaximo || 0) - (p.precioMinimo || 0);
      case "proveedor":
        return p.proveedor || "";
      default:
        return p[key];
    }
  };

  const sorted = useMemo(() => {
    if (!sortConfig) return filtered;
    const { key, direction } = sortConfig;
    const factor = direction === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const va = getSortValue(a, key);
      const vb = getSortValue(b, key);
      if (typeof va === "string" && typeof vb === "string") {
        return va.localeCompare(vb, "es", { sensitivity: "base" }) * factor;
      }
      return ((va as number) - (vb as number)) * factor;
    });
  }, [filtered, sortConfig]);

  const startEdit = (product: Product) => {
    setEditingId(product.id);
    setEditData({ ...product });
    // productPlaceholderImage es la genérica que se usa cuando no hay
    // foto propia (ver mapProduct en lib/api.ts): en ese caso el picker
    // empieza vacío, no mostrando la genérica como si fuera la real.
    setImagePreview(product.imagen === productPlaceholderImage ? undefined : product.imagen);
    setFormError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData(null);
    setImagePreview(undefined);
    setFormError(null);
  };

  const saveEdit = async () => {
    if (!editData || !editingId) return;

    if (!editData.nombre.trim()) {
      setFormError("El nombre es obligatorio");
      return;
    }
    if (
      editData.numero.trim() &&
      editData.numero !== productList.find((p) => p.id === editingId)?.numero &&
      productList.some((p) => p.id !== editingId && p.numero === editData.numero)
    ) {
      setFormError(`Ya existe un producto con el número «${editData.numero}»`);
      return;
    }
    if (editData.cantidad < 0 || editData.minimo < 0) {
      setFormError("La cantidad y el stock mínimo no pueden ser negativos");
      return;
    }
    if (!editData.ubicacion.trim()) {
      setFormError("Indica la ubicación");
      return;
    }

    try {
      await updateProduct.mutateAsync({
        id: editingId,
        changes: {
          numero: editData.numero,
          nombre: editData.nombre,
          descripcion: editData.descripcion,
          cantidad: editData.cantidad,
          minimo: editData.minimo,
          proveedorId: editData.proveedorId,
          ubicacion: editData.ubicacion,
          precioMinimo: editData.precioMinimo,
          precioMaximo: editData.precioMaximo,
          imagen: imagePreview ?? "",
        },
      });
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "No se pudo guardar el producto");
      return;
    }

    toast.success(`Producto «${editData.nombre}» actualizado`);
    cancelEdit();
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!window.confirm(`¿Eliminar el producto «${product.nombre}»? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      await deleteProduct.mutateAsync(product.id);
      toast.success(`Producto «${product.nombre}» eliminado`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo eliminar el producto");
    }
  };

  const calcularDiferencia = (precioMin: number, precioMax: number) => {
    return precioMax - precioMin;
  };

  const formatearPrecio = (precio: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(precio);
  };

  return (
    <AppShell
      title="Inventario"
      subtitle="Listado completo de productos en almacén"
      actions={
        <Button asChild>
          <Link to="/stock/nuevo">
            <Plus className="size-4" />
            Nuevo producto
          </Link>
        </Button>
      }
    >
      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-0">
          <div className="border-b border-border p-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre o número de producto…"
                className="pl-9"
                aria-label="Buscar productos"
                maxLength={80}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Imagen</TableHead>
                  <SortableHead
                    label="Nº producto"
                    sortKey="numero"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    className="w-32"
                  />
                  <SortableHead label="Nombre" sortKey="nombre" sortConfig={sortConfig} onSort={handleSort} />
                  <SortableHead
                    label="Cantidad"
                    sortKey="cantidad"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    align="right"
                    className="w-28 text-right"
                  />
                  <SortableHead
                    label="Stock mínimo"
                    sortKey="minimo"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    align="right"
                    className="w-32 text-right"
                  />
                  <SortableHead
                    label="Precio mínimo"
                    sortKey="precioMinimo"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    align="right"
                    className="w-32 text-right"
                  />
                  <SortableHead
                    label="Precio máximo"
                    sortKey="precioMaximo"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    align="right"
                    className="w-32 text-right"
                  />
                  <SortableHead
                    label="Diferencia"
                    sortKey="diferencia"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    align="right"
                    className="w-32 text-right"
                  />
                  <SortableHead
                    label="Ubicación"
                    sortKey="ubicacion"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    className="w-40"
                  />
                  <SortableHead
                    label="Proveedor"
                    sortKey="proveedor"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    className="w-52"
                  />
                  <TableHead className="w-24 text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={11} className="py-10 text-center text-sm text-muted-foreground">
                      Cargando inventario…
                    </TableCell>
                  </TableRow>
                )}
                {isError && (
                  <TableRow>
                    <TableCell colSpan={11} className="py-10 text-center text-sm text-destructive">
                      No se pudo cargar el inventario.
                    </TableCell>
                  </TableRow>
                )}
                {sorted.map((p) => {
                  const low = p.cantidad < p.minimo;
                  const diferencia = calcularDiferencia(
                    p.precioMinimo || 0,
                    p.precioMaximo || 0
                  );
                  return (
                    <TableRow
                      key={p.id}
                      className={low ? "bg-destructive/5" : undefined}
                    >
                      <TableCell>
                        <img
                          src={p.imagen}
                          alt={p.nombre}
                          loading="lazy"
                          width={512}
                          height={512}
                          className="size-11 rounded-md border border-border object-cover"
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {p.numero}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        <div>{p.nombre}</div>
                        {p.descripcion && (
                          <p className="mt-0.5 text-xs font-normal text-muted-foreground line-clamp-2">
                            {p.descripcion}
                          </p>
                        )}
                      </TableCell>
                      <TableCell
                        className={`text-right font-semibold tabular-nums ${
                          low ? "text-destructive" : "text-foreground"
                        }`}
                      >
                        <span className="inline-flex items-center justify-end gap-1.5">
                          {low && <AlertTriangle className="size-3.5" />}
                          {p.cantidad}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {p.minimo}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatearPrecio(p.precioMinimo || 0)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatearPrecio(p.precioMaximo || 0)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium text-foreground">
                        {formatearPrecio(diferencia)}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-foreground">
                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-300/50">
                          {p.ubicacion}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {p.proveedor || "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => startEdit(p)}>
                            <Edit2 className="size-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteProduct(p)}
                            disabled={deleteProduct.isPending}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!isLoading && !isError && filtered.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={11}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      No se encontraron productos para «{query}».
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de edición manual */}
      <Dialog open={editingId !== null} onOpenChange={(open) => !open && cancelEdit()}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Editar producto</DialogTitle>
            <DialogDescription>
              Corrige manualmente los datos del producto en el inventario
            </DialogDescription>
          </DialogHeader>

          {editData && (
            <div className="space-y-4">
              <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
                <ProductImagePicker value={imagePreview} onChange={setImagePreview} />

                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="edit-numero" className="text-sm">
                        Número de producto{" "}
                        <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
                      </Label>
                      <Input
                        id="edit-numero"
                        value={editData.numero}
                        onChange={(e) =>
                          setEditData({ ...editData, numero: e.target.value })
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-nombre" className="text-sm">
                        Nombre
                      </Label>
                      <Input
                        id="edit-nombre"
                        value={editData.nombre}
                        onChange={(e) =>
                          setEditData({ ...editData, nombre: e.target.value })
                        }
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="edit-descripcion" className="text-sm">
                      Descripción <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
                    </Label>
                    <Textarea
                      id="edit-descripcion"
                      value={editData.descripcion}
                      onChange={(e) =>
                        setEditData({ ...editData, descripcion: e.target.value })
                      }
                      placeholder="Detalles del producto: material, tallas disponibles, uso recomendado…"
                      maxLength={500}
                      rows={3}
                      className="mt-1"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="edit-cantidad" className="text-sm">
                        Cantidad
                      </Label>
                      <Input
                        id="edit-cantidad"
                        type="number"
                        min="0"
                        value={editData.cantidad}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            cantidad: parseInt(e.target.value) || 0,
                          })
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-minimo" className="text-sm">
                        Stock mínimo
                      </Label>
                      <Input
                        id="edit-minimo"
                        type="number"
                        min="0"
                        value={editData.minimo}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            minimo: parseInt(e.target.value) || 0,
                          })
                        }
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="edit-precio-min" className="text-sm">
                        Precio mínimo (€)
                      </Label>
                      <Input
                        id="edit-precio-min"
                        type="number"
                        min="0"
                        step="0.01"
                        value={editData.precioMinimo ?? ""}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            precioMinimo: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-precio-max" className="text-sm">
                        Precio máximo (€)
                      </Label>
                      <Input
                        id="edit-precio-max"
                        type="number"
                        min="0"
                        step="0.01"
                        value={editData.precioMaximo ?? ""}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            precioMaximo: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="edit-ubicacion" className="text-sm">
                        Ubicación
                      </Label>
                      <Input
                        id="edit-ubicacion"
                        value={editData.ubicacion}
                        onChange={(e) =>
                          setEditData({ ...editData, ubicacion: e.target.value })
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-proveedor" className="text-sm">
                        Proveedor
                      </Label>
                      <Select
                        value={editData.proveedorId || NO_SUPPLIER}
                        onValueChange={(value) => {
                          if (value === NO_SUPPLIER) {
                            setEditData({ ...editData, proveedorId: "", proveedor: "" });
                            return;
                          }
                          const supplier = suppliers.find((s) => s.id === value);
                          setEditData({
                            ...editData,
                            proveedorId: value,
                            proveedor: supplier?.nombre ?? editData.proveedor,
                          });
                        }}
                      >
                        <SelectTrigger id="edit-proveedor" className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_SUPPLIER}>Sin proveedor</SelectItem>
                          {suppliers.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
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
    </AppShell>
  );
}
