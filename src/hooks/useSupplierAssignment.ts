import { useState } from "react";
import { MaterialRequestSupplierLine } from "@/data/mock";

type NewLineForm = {
  proveedorId: string;
  cantidad: number;
  precioUnitario: number;
};

const emptyNewLine: NewLineForm = { proveedorId: "", cantidad: 0, precioUnitario: 0 };

export interface UseSupplierAssignmentOptions {
  /** Cantidad total que debe quedar repartida entre las líneas de proveedor. */
  targetQuantity: number;
  /** Persiste la línea contra la API y devuelve la línea guardada (con su id real). */
  onAddLine: (input: {
    supplierId: string;
    quantity: number;
    unitPrice: number;
  }) => Promise<MaterialRequestSupplierLine>;
  /** Borra una línea ya persistida. */
  onRemoveLine: (line: MaterialRequestSupplierLine) => Promise<void>;
}

/**
 * Reparte una cantidad entre uno o más proveedores, cada uno con su propia
 * cantidad y precio por unidad. Cada línea se guarda en el momento de
 * añadirla (no al confirmar) — comparte la validación entre Solicitudes y
 * Reposición Interna, que tienen el mismo diálogo de "Asignar proveedores".
 */
export function useSupplierAssignment(options: UseSupplierAssignmentOptions) {
  const { targetQuantity, onAddLine, onRemoveLine } = options;

  const [isOpen, setIsOpen] = useState(false);
  const [lines, setLines] = useState<MaterialRequestSupplierLine[]>([]);
  const [newLine, setNewLineState] = useState<NewLineForm>(emptyNewLine);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalAsignado = lines.reduce((sum, l) => sum + l.cantidad, 0);
  const cantidadRestante = targetQuantity - totalAsignado;

  const open = (existing: MaterialRequestSupplierLine[] = []) => {
    setLines(existing);
    setNewLineState(emptyNewLine);
    setError(null);
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setLines([]);
    setNewLineState(emptyNewLine);
    setError(null);
  };

  const setNewLine = (patch: Partial<NewLineForm>) => {
    setNewLineState((prev) => ({ ...prev, ...patch }));
  };

  const addLine = async () => {
    if (!newLine.proveedorId) {
      setError("Selecciona un proveedor");
      return;
    }
    if (newLine.cantidad <= 0) {
      setError("La cantidad debe ser mayor a 0");
      return;
    }
    if (newLine.precioUnitario < 0) {
      setError("El precio unitario no puede ser negativo");
      return;
    }

    const totalActual = lines.reduce((sum, l) => sum + l.cantidad, 0);
    if (totalActual + newLine.cantidad > targetQuantity) {
      setError(
        `La cantidad total (${totalActual + newLine.cantidad}) excede lo requerido (${targetQuantity})`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const line = await onAddLine({
        supplierId: newLine.proveedorId,
        quantity: newLine.cantidad,
        unitPrice: newLine.precioUnitario,
      });
      setLines((prev) => [...prev, line]);
      setNewLineState(emptyNewLine);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo añadir el proveedor");
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeLine = async (index: number) => {
    const line = lines[index];
    if (!line) return;

    setIsSubmitting(true);
    try {
      await onRemoveLine(line);
      setLines((prev) => prev.filter((_, i) => i !== index));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo quitar el proveedor");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirm = () => {
    if (lines.length === 0) {
      setError("Debes asignar al menos un proveedor");
      return;
    }
    if (totalAsignado !== targetQuantity) {
      setError(
        `La cantidad asignada (${totalAsignado}) debe coincidir con la requerida (${targetQuantity})`
      );
      return;
    }
    setIsOpen(false);
  };

  return {
    isOpen,
    lines,
    newLine,
    error,
    isSubmitting,
    totalAsignado,
    cantidadRestante,
    open,
    close,
    setNewLine,
    addLine,
    removeLine,
    confirm,
  };
}

export type SupplierAssignment = ReturnType<typeof useSupplierAssignment>;
