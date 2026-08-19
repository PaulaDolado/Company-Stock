import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Check, ChevronsUpDown, AlertTriangle, PackageCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,} from "@/components/ui/command";
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue,} from "@/components/ui/select";
import { useProductsQuery } from "@/hooks/useProducts";
import { useCreateMaterialRequest } from "@/hooks/useMaterialRequests";
import { useAuth } from "@/lib/auth";
import { departments, type Department } from "@/data/mock";

const requestSchema = z
  .object({
    modoNuevo: z.boolean(),
    producto: z.string().trim(),
    nombreNuevo: z.string().trim().max(150, { message: "Máximo 150 caracteres" }),
    enlaceNuevo: z.string().trim(),
    departamento: z.string().trim().nonempty({ message: "Selecciona un departamento" }),
    cantidad: z.string().trim().nonempty({ message: "Indica la cantidad deseada" })
      .refine((v) => /^\d+$/.test(v) && Number(v) > 0, { message: "Introduce un número mayor que 0" })
      .refine((v) => Number(v) <= 100000, { message: "Máximo 100.000 unidades" }),
    mensaje: z.string().trim().max(500, { message: "Máximo 500 caracteres" }),
  })
  .superRefine((v, ctx) => {
    if (v.modoNuevo) {
      if (!v.nombreNuevo) {
        ctx.addIssue({ code: "custom", path: ["nombreNuevo"], message: "Indica el nombre del producto" });
      }
      if (!v.enlaceNuevo) {
        ctx.addIssue({
          code: "custom",
          path: ["enlaceNuevo"],
          message: "El producto no existe en stock: indica un enlace para localizarlo",
        });
      } else if (!/^https?:\/\/.+/i.test(v.enlaceNuevo)) {
        ctx.addIssue({
          code: "custom",
          path: ["enlaceNuevo"],
          message: "Introduce una URL válida (empezando por http:// o https://)",
        });
      }
    } else if (!v.producto) {
      ctx.addIssue({ code: "custom", path: ["producto"], message: "Selecciona un producto" });
    }
  });

type FormShape = {
  modoNuevo: boolean;
  producto: string;
  nombreNuevo: string;
  enlaceNuevo: string;
  departamento: string;
  cantidad: string;
  mensaje: string;
};

export default function NewRequestPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { data: products = [] } = useProductsQuery();
  const createRequest = useCreateMaterialRequest();
  const [open, setOpen] = useState(false);
  const [modoNuevo, setModoNuevo] = useState(false);
  const [producto, setProducto] = useState("");
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [enlaceNuevo, setEnlaceNuevo] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  useEffect(() => {
    if (products.length === 0) return;
    const repeat = location.state as { producto?: string; cantidad?: number } | null;
    if (!repeat?.producto) return;
    const match = products.find((p) => p.nombre === repeat.producto);
    setProducto(match ? match.id : "");
    if (repeat.cantidad) setCantidad(String(repeat.cantidad));
    if (!match) {
      toast.info(
        `«${repeat.producto}» ya no está en el inventario actual. Selecciona el producto manualmente.`,
      );
    }
  }, [location.state, products]);

  const selected = useMemo(() => products.find((p) => p.id === producto), [producto, products]);
  const requested = Number(cantidad);
  const insufficient = !!selected && /^\d+$/.test(cantidad) && requested > selected.cantidad;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const values: FormShape = { modoNuevo, producto, nombreNuevo, enlaceNuevo, departamento, cantidad, mensaje };
    const result = requestSchema.safeParse(values);
    if (!result.success || (!modoNuevo && !selected)) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error?.issues ?? []) {
        const key = String(issue.path[0]);
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      if (!modoNuevo && !selected && !fieldErrors.producto) {
        fieldErrors.producto = "Selecciona un producto";
      }
      setErrors(fieldErrors);
      toast.error("Revisa los campos marcados");
      return;
    }
    setErrors({});
    try {
      await createRequest.mutateAsync({
        productId: modoNuevo ? undefined : selected!.id,
        productoNombre: modoNuevo ? nombreNuevo.trim() : undefined,
        productoLink: modoNuevo ? enlaceNuevo.trim() : undefined,
        departamento: departamento as Department,
        cantidad: requested,
        mensaje: mensaje.trim() || undefined,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo enviar la solicitud");
      return;
    }
    toast.success(`Solicitud enviada a nombre de ${user?.nombre ?? "usuario"}`);
    navigate("/solicitudes");
  };

  return (
    <AppShell title="Nueva solicitud" subtitle="Solicita material del almacén central">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to="/solicitudes"><ArrowLeft className="size-4" />Volver a solicitudes</Link>
      </Button>

      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-6 lg:p-8">
          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-2">
                <Label>Solicitante</Label>
                <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-3 py-2">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {user?.iniciales}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{user?.nombre}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {user?.departamento} · {user?.email}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">La solicitud se registrará a nombre del usuario con la sesión iniciada.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="departamento">
                  Departamento <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={departamento}
                  onValueChange={(value) => {
                    setDepartamento(value);
                    setErrors((err) => ({ ...err, departamento: undefined }));
                  }}
                >
                  <SelectTrigger id="departamento" aria-invalid={!!errors.departamento}>
                    <SelectValue placeholder="Selecciona el departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.departamento && (
                  <p className="text-xs font-medium text-destructive">{errors.departamento}</p>
                )}
                <p className="text-xs text-muted-foreground">Para qué área es este material.</p>
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-border p-4">
              <Label>¿El producto ya existe en el inventario?</Label>
              <RadioGroup
                value={modoNuevo ? "nuevo" : "existente"}
                onValueChange={(value) => {
                  setModoNuevo(value === "nuevo");
                  setErrors({});
                }}
                className="grid gap-3 sm:grid-cols-2"
              >
                <label
                  htmlFor="modo-existente"
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors ${
                    !modoNuevo ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <RadioGroupItem value="existente" id="modo-existente" className="mt-0.5" />
                  <span>
                    <span className="block font-medium text-foreground">Sí, está en Stock</span>
                    <span className="block text-xs text-muted-foreground">
                      Elige el producto del inventario actual.
                    </span>
                  </span>
                </label>
                <label
                  htmlFor="modo-nuevo"
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors ${
                    modoNuevo ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <RadioGroupItem value="nuevo" id="modo-nuevo" className="mt-0.5" />
                  <span>
                    <span className="block font-medium text-foreground">No, es un producto nuevo</span>
                    <span className="block text-xs text-muted-foreground">
                      No existe todavía en el inventario. Indica su nombre y un enlace.
                    </span>
                  </span>
                </label>
              </RadioGroup>
            </div>

            {modoNuevo ? (
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nombreNuevo">
                    Nombre del producto <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="nombreNuevo"
                    value={nombreNuevo}
                    onChange={(e) => {
                      setNombreNuevo(e.target.value);
                      setErrors((err) => ({ ...err, nombreNuevo: undefined }));
                    }}
                    placeholder="Ej: Silla ergonómica de oficina"
                    maxLength={150}
                    aria-invalid={!!errors.nombreNuevo}
                  />
                  {errors.nombreNuevo && (
                    <p className="text-xs font-medium text-destructive">{errors.nombreNuevo}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="enlaceNuevo">
                    Enlace al producto <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="enlaceNuevo"
                    type="url"
                    value={enlaceNuevo}
                    onChange={(e) => {
                      setEnlaceNuevo(e.target.value);
                      setErrors((err) => ({ ...err, enlaceNuevo: undefined }));
                    }}
                    placeholder="https://proveedor.com/producto"
                    aria-invalid={!!errors.enlaceNuevo}
                  />
                  {errors.enlaceNuevo ? (
                    <p className="text-xs font-medium text-destructive">{errors.enlaceNuevo}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Al no existir en stock, gestión necesita un enlace para poder localizarlo.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="producto">
                  Producto <span className="text-destructive">*</span>
                </Label>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        id="producto"
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        aria-invalid={!!errors.producto}
                        className="flex-1 justify-between font-normal"
                      >
                        <span className="truncate">
                          {selected ? selected.nombre : "Buscar producto…"}
                        </span>
                        <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar por nombre o número…" />
                        <CommandList>
                          <CommandEmpty>No se encontraron productos.</CommandEmpty>
                          <CommandGroup>
                            {products.map((p) => (
                              <CommandItem
                                key={p.id}
                                value={`${p.numero} ${p.nombre}`}
                                onSelect={() => {
                                  setProducto(p.id);
                                  setErrors((e) => ({ ...e, producto: undefined }));
                                  setOpen(false);
                                }}
                              >
                                <Check
                                  className={`size-4 ${producto === p.id ? "opacity-100" : "opacity-0"}`}
                                />
                                <span className="flex-1 truncate">{p.nombre}</span>
                                <span className="font-mono text-xs text-muted-foreground">
                                  {p.numero}
                                </span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  <div
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium sm:w-56 ${
                      !selected
                        ? "bg-muted text-muted-foreground"
                        : insufficient
                          ? "bg-destructive/10 text-destructive"
                          : "bg-success/15 text-success"
                    }`}
                  >
                    {selected ? (
                      insufficient ? (
                        <AlertTriangle className="size-4 shrink-0" />
                      ) : (
                        <PackageCheck className="size-4 shrink-0" />
                      )
                    ) : (
                      <PackageCheck className="size-4 shrink-0" />
                    )}
                    <span>
                      {selected ? `Disponible: ${selected.cantidad} uds.` : "Stock disponible: —"}
                    </span>
                  </div>
                </div>
                {errors.producto && (
                  <p className="text-xs font-medium text-destructive">{errors.producto}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="cantidad">
                Cantidad deseada <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cantidad"
                type="number"
                min={1}
                step={1}
                value={cantidad}
                onChange={(e) => {
                  setCantidad(e.target.value);
                  setErrors((err) => ({ ...err, cantidad: undefined }));
                }}
                placeholder="1"
                className="sm:max-w-60"
                aria-invalid={!!errors.cantidad}
              />
              {errors.cantidad && (
                <p className="text-xs font-medium text-destructive">{errors.cantidad}</p>
              )}
              {!modoNuevo && insufficient && !errors.cantidad && (
                <p className="text-xs font-medium text-destructive">
                  No hay stock suficiente ({selected?.cantidad} uds. disponibles). La solicitud
                  puede derivarse a compra.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="mensaje">Mensaje (opcional)</Label>
              <Textarea
                id="mensaje"
                value={mensaje}
                onChange={(e) => {
                  setMensaje(e.target.value);
                  setErrors((err) => ({ ...err, mensaje: undefined }));
                }}
                maxLength={500}
                rows={4}
                placeholder="Indica para qué necesitas el material, urgencia, etc."
              />
              <p className="text-xs text-muted-foreground">{mensaje.length}/500</p>
              {errors.mensaje && (
                <p className="text-xs font-medium text-destructive">{errors.mensaje}</p>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-border pt-5">
              <Button type="button" variant="outline" onClick={() => navigate("/solicitudes")}>Cancelar</Button>
              <Button type="submit">Enviar solicitud</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </AppShell>
  );
}
