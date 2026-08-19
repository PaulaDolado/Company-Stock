import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MaterialRequestSupplierLine } from "@/data/mock";
import { useSuppliersQuery } from "@/hooks/useSuppliers";
import type { SupplierAssignment } from "@/hooks/useSupplierAssignment";

/**
 * Botón para abrir el reparto de proveedores (solo cuando el estado lo
 * permite) y resumen de las líneas ya asignadas. Se muestra dentro del
 * diálogo de edición de una solicitud o reposición.
 */
export function SupplierLinesSection({
  canAssign,
  lines,
  onOpenAssignment,
}: {
  canAssign: boolean;
  lines?: MaterialRequestSupplierLine[];
  onOpenAssignment: () => void;
}) {
  return (
    <>
      {canAssign && (
        <Button onClick={onOpenAssignment} className="w-full bg-blue-600 hover:bg-blue-700">
          📦 Asignar proveedores
        </Button>
      )}

      {lines && lines.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-blue-900 mb-2">Proveedores asignados:</p>
          {lines.map((prov, idx) => (
            <div
              key={idx}
              className="text-xs text-blue-800 flex justify-between items-center py-1"
            >
              <span>
                {prov.proveedorNombre}: {prov.cantidad} ud. x {prov.precioUnitario.toFixed(2)}€
              </span>
              <span className="font-semibold">
                {(prov.cantidad * prov.precioUnitario).toFixed(2)}€
              </span>
            </div>
          ))}
          <div className="text-xs font-bold text-blue-900 border-t border-blue-200 pt-2 mt-2 flex justify-between">
            <span>Total:</span>
            <span>
              {lines.reduce((sum, p) => sum + p.cantidad * p.precioUnitario, 0).toFixed(2)}€
            </span>
          </div>
        </div>
      )}
    </>
  );
}

export function SupplierAssignmentDialog({
  assignment,
  quantityLabel,
  description,
}: {
  assignment: SupplierAssignment;
  /** Ej: "Cantidad total solicitada" o "Cantidad total requerida". */
  quantityLabel: string;
  description: string;
}) {
  const {
    isOpen,
    lines,
    newLine,
    error,
    isSubmitting,
    totalAsignado,
    cantidadRestante,
    close,
    setNewLine,
    addLine,
    removeLine,
    confirm,
  } = assignment;

  const { data: suppliers = [] } = useSuppliersQuery();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Asignar proveedores</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-slate-50 p-3 rounded-lg text-sm">
            <div className="flex justify-between mb-1">
              <span className="font-medium">{quantityLabel}:</span>
              <span className="font-bold">{totalAsignado + cantidadRestante} ud.</span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="font-medium">Ya asignados:</span>
              <span className="font-bold">{totalAsignado} ud.</span>
            </div>
            <div className="flex justify-between border-t pt-1 mt-1">
              <span className="font-medium">Pendiente asignar:</span>
              <span
                className={`font-bold ${
                  cantidadRestante === 0 ? "text-green-600" : "text-orange-600"
                }`}
              >
                {cantidadRestante} ud.
              </span>
            </div>
          </div>

          {lines.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Proveedores asignados:</Label>
              {lines.map((prov, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-green-50 border border-green-200 p-3 rounded"
                >
                  <div className="text-sm">
                    <p className="font-medium">{prov.proveedorNombre}</p>
                    <p className="text-xs text-muted-foreground">
                      {prov.cantidad} ud. x {prov.precioUnitario.toFixed(2)}€ ={" "}
                      <span className="font-semibold">
                        {(prov.cantidad * prov.precioUnitario).toFixed(2)}€
                      </span>
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeLine(idx)}
                    disabled={isSubmitting}
                    className="text-destructive"
                  >
                    ✕
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="border-t pt-4">
            <Label className="text-sm font-semibold mb-3 block">Agregar nuevo proveedor:</Label>

            <div className="space-y-3">
              <div>
                <Label htmlFor="supplier-assignment-proveedor" className="text-xs">
                  Proveedor *
                </Label>
                <Select
                  value={newLine.proveedorId}
                  onValueChange={(value) => setNewLine({ proveedorId: value })}
                >
                  <SelectTrigger id="supplier-assignment-proveedor" className="mt-1">
                    <SelectValue placeholder="Selecciona un proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="supplier-assignment-cantidad" className="text-xs">
                    Cantidad *
                  </Label>
                  <Input
                    id="supplier-assignment-cantidad"
                    type="number"
                    min="1"
                    max={cantidadRestante}
                    value={newLine.cantidad || ""}
                    onChange={(e) =>
                      setNewLine({ cantidad: parseInt(e.target.value) || 0 })
                    }
                    placeholder="0"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="supplier-assignment-precio" className="text-xs">
                    Precio unitario (€) *
                  </Label>
                  <Input
                    id="supplier-assignment-precio"
                    type="number"
                    min="0"
                    step="0.01"
                    value={newLine.precioUnitario || ""}
                    onChange={(e) =>
                      setNewLine({ precioUnitario: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0.00"
                    className="mt-1"
                  />
                </div>
              </div>

              <Button onClick={addLine} disabled={isSubmitting} className="w-full" variant="outline">
                + Agregar proveedor
              </Button>
            </div>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded p-3 text-xs text-destructive">
              {error}
            </div>
          )}

          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button variant="outline" onClick={close}>
              Cancelar
            </Button>
            <Button onClick={confirm} disabled={cantidadRestante !== 0} className="bg-primary">
              Confirmar asignación
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
