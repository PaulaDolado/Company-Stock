import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3 MB

/**
 * Selector de imagen de producto, compartido entre "Nuevo producto" y la
 * edición de Stock. `value` es undefined cuando no hay imagen (se
 * mostrará la genérica); onChange recibe la nueva imagen como data URI,
 * o undefined al quitarla.
 */
export function ProductImagePicker({
  value,
  onChange,
  label = "Imagen del producto",
}: {
  value: string | undefined;
  onChange: (next: string | undefined) => void;
  label?: string;
}) {
  const [error, setError] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Selecciona un archivo de imagen válido");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("La imagen no puede superar los 3 MB");
      return;
    }

    setError(undefined);
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  };

  const clear = () => {
    onChange(undefined);
    setError(undefined);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex aspect-square w-full max-w-60 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 p-4 lg:max-w-none">
        {value ? (
          <div className="relative size-full">
            <img
              src={value}
              alt="Vista previa del producto"
              className="size-full rounded-md object-cover"
            />
            <button
              type="button"
              onClick={clear}
              aria-label="Quitar imagen"
              className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm ring-1 ring-border transition-colors hover:bg-destructive hover:text-destructive-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <>
            <ImagePlus className="size-8 text-muted-foreground" />
            <p className="text-center text-xs text-muted-foreground">
              PNG, JPG o WEBP · máx. 3 MB
            </p>
          </>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full max-w-60 lg:max-w-none"
        onClick={() => fileInputRef.current?.click()}
      >
        {value ? "Cambiar imagen" : "Subir imagen"}
      </Button>
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
      {!value && !error && (
        <p className="text-xs text-muted-foreground">
          Opcional. Si no subes ninguna, se usará una imagen genérica.
        </p>
      )}
    </div>
  );
}
