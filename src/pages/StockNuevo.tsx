import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue,} from "@/components/ui/select";
import { ProductImagePicker } from "@/components/ProductImagePicker";
import { useSuppliersQuery } from "@/hooks/useSuppliers";
import { useCreateProduct } from "@/hooks/useProducts";

// El proveedor es opcional: Radix Select no admite un SelectItem con
// value="", así que usamos este sentinel para representar "sin
// proveedor" en el propio Select (se traduce a undefined al enviar).
const NO_SUPPLIER = "__none__";

const precioField = z.string().trim()
  .refine((v) => v === "" || /^\d+(\.\d{1,2})?$/.test(v), { message: "Introduce un precio válido" })
  .refine((v) => v === "" || Number(v) <= 1_000_000, { message: "Máximo 1.000.000" });

const productSchema = z
  .object({
    numero: z.string().trim()
      .max(20, { message: "Máximo 20 caracteres" }),
    nombre: z.string() .trim()
      .nonempty({ message: "El nombre es obligatorio" })
      .max(100, { message: "Máximo 100 caracteres" }),
    descripcion: z.string().trim()
      .max(500, { message: "Máximo 500 caracteres" }),
    cantidad: z.string().trim()
      .nonempty({ message: "La cantidad inicial es obligatoria" })
      .refine((v) => /^\d+$/.test(v), { message: "Introduce un número entero válido" })
      .refine((v) => Number(v) <= 1_000_000, { message: "Máximo 1.000.000" }),
    minimo: z.string().trim()
      .nonempty({ message: "El stock mínimo es obligatorio" })
      .refine((v) => /^\d+$/.test(v), { message: "Introduce un número entero válido" })
      .refine((v) => Number(v) <= 1_000_000, { message: "Máximo 1.000.000" }),
    proveedor: z.string().trim(),
    ubicacion: z.string().trim()
      .nonempty({ message: "La ubicación es obligatoria" })
      .max(100, { message: "Máximo 100 caracteres" }),
    precioMinimo: precioField,
    precioMaximo: precioField,
  })
  .refine(
    (v) => v.precioMinimo === "" || v.precioMaximo === "" || Number(v.precioMaximo) >= Number(v.precioMinimo),
    { message: "El precio máximo no puede ser menor que el mínimo", path: ["precioMaximo"] }
  );

type FormValues = z.infer<typeof productSchema>;
const emptyForm: FormValues = {
  numero: "",
  nombre: "",
  descripcion: "",
  cantidad: "",
  minimo: "",
  proveedor: "",
  ubicacion: "",
  precioMinimo: "",
  precioMaximo: "",
};

export default function NewProductPage() {
  const navigate = useNavigate();
  const { data: suppliers = [] } = useSuppliersQuery();
  const createProduct = useCreateProduct();
  const [values, setValues] = useState<FormValues>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const [imagePreview, setImagePreview] = useState<string | undefined>(undefined);

  const setField = (field: keyof FormValues, value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = productSchema.safeParse(values);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof FormValues, string>> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof FormValues;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      toast.error("Revisa los campos marcados");
      return;
    }
    setErrors({});
    try {
      await createProduct.mutateAsync({
        numero: result.data.numero || undefined,
        nombre: result.data.nombre,
        descripcion: result.data.descripcion || undefined,
        cantidad: Number(result.data.cantidad),
        minimo: Number(result.data.minimo),
        proveedorId: result.data.proveedor && result.data.proveedor !== NO_SUPPLIER ? result.data.proveedor : undefined,
        ubicacion: result.data.ubicacion,
        imagen: imagePreview,
        precioMinimo: result.data.precioMinimo ? Number(result.data.precioMinimo) : undefined,
        precioMaximo: result.data.precioMaximo ? Number(result.data.precioMaximo) : undefined,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar el producto");
      return;
    }
    toast.success(`Producto «${result.data.nombre}» guardado`);
    navigate("/stock");
  };

  return (
    <AppShell title="Nuevo producto" subtitle="Alta de un artículo en el inventario">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to="/stock">
          <ArrowLeft className="size-4" />
          Volver al inventario
        </Link>
      </Button>

      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-6 lg:p-8">
          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
              <ProductImagePicker value={imagePreview} onChange={setImagePreview} />

              <div className="space-y-6">
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  <Field label="Número de producto" error={errors.numero} htmlFor="numero" optional>
                    <Input
                      id="numero"
                      value={values.numero}
                      onChange={(e) => setField("numero", e.target.value)}
                      placeholder="P-1011"
                      maxLength={20}
                      aria-invalid={!!errors.numero}
                    />
                  </Field>

                  <Field
                    label="Nombre"
                    error={errors.nombre}
                    htmlFor="nombre"
                    className="sm:col-span-2 xl:col-span-1"
                  >
                    <Input
                      id="nombre"
                      value={values.nombre}
                      onChange={(e) => setField("nombre", e.target.value)}
                      placeholder="Guantes de nitrilo talla L"
                      maxLength={100}
                      aria-invalid={!!errors.nombre}
                    />
                  </Field>

                  <Field label="Proveedor" error={errors.proveedor} htmlFor="proveedor" optional>
                    <Select
                      value={values.proveedor}
                      onValueChange={(value) => setField("proveedor", value)}
                    >
                      <SelectTrigger
                        id="proveedor"
                        aria-invalid={!!errors.proveedor}
                        className="w-full"
                      >
                        <SelectValue placeholder="Sin proveedor asignado" />
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
                  </Field>

                  <Field label="Cantidad inicial" error={errors.cantidad} htmlFor="cantidad">
                    <Input
                      id="cantidad"
                      type="number"
                      min={0}
                      step={1}
                      value={values.cantidad}
                      onChange={(e) => setField("cantidad", e.target.value)}
                      placeholder="0"
                      aria-invalid={!!errors.cantidad}
                    />
                  </Field>

                  <Field label="Stock mínimo" error={errors.minimo} htmlFor="minimo">
                    <Input
                      id="minimo"
                      type="number"
                      min={0}
                      step={1}
                      value={values.minimo}
                      onChange={(e) => setField("minimo", e.target.value)}
                      placeholder="0"
                      aria-invalid={!!errors.minimo}
                    />
                  </Field>

                  <Field label="Ubicación" error={errors.ubicacion} htmlFor="ubicacion">
                    <Input
                      id="ubicacion"
                      value={values.ubicacion}
                      onChange={(e) => setField("ubicacion", e.target.value)}
                      placeholder="Ej: Estante A-3"
                      maxLength={100}
                      aria-invalid={!!errors.ubicacion}
                    />
                  </Field>
                </div>

                <Field label="Descripción" error={errors.descripcion} htmlFor="descripcion" optional>
                  <Textarea
                    id="descripcion"
                    value={values.descripcion}
                    onChange={(e) => setField("descripcion", e.target.value)}
                    placeholder="Detalles del producto: material, tallas disponibles, uso recomendado…"
                    maxLength={500}
                    rows={3}
                    aria-invalid={!!errors.descripcion}
                  />
                </Field>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    label="Precio mínimo (€)"
                    error={errors.precioMinimo}
                    htmlFor="precioMinimo"
                    optional
                  >
                    <Input
                      id="precioMinimo"
                      type="number"
                      min={0}
                      step="0.01"
                      value={values.precioMinimo}
                      onChange={(e) => setField("precioMinimo", e.target.value)}
                      placeholder="0.00"
                      aria-invalid={!!errors.precioMinimo}
                    />
                  </Field>

                  <Field
                    label="Precio máximo (€)"
                    error={errors.precioMaximo}
                    htmlFor="precioMaximo"
                    optional
                  >
                    <Input
                      id="precioMaximo"
                      type="number"
                      min={0}
                      step="0.01"
                      value={values.precioMaximo}
                      onChange={(e) => setField("precioMaximo", e.target.value)}
                      placeholder="0.00"
                      aria-invalid={!!errors.precioMaximo}
                    />
                  </Field>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-border pt-5">
              <Button type="button" variant="outline" onClick={() => navigate("/stock")}>
                Cancelar
              </Button>
              <Button type="submit">Guardar</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </AppShell>
  );
}

function Field({
  label,
  error,
  htmlFor,
  className,
  optional,
  children,
}: {
  label: string;
  error?: string;
  htmlFor: string;
  className?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label htmlFor={htmlFor}>
        {label}{" "}
        {optional ? (
          <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
        ) : (
          <span className="text-destructive">*</span>
        )}
      </Label>
      {children}
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}
