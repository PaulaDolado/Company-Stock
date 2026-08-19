export type Product = {
  id: string;
  numero: string;
  nombre: string;
  descripcion: string;
  cantidad: number;
  minimo: number;
  proveedor: string;
  proveedorId: string;
  imagen: string;
  precioMinimo?: number;
  precioMaximo?: number;
  ubicacion: string;
};

export const requestStatuses = [
  "Pendiente",
  "Aprobada",
  "Entregado",
  "Derivada a compra",
  "Rechazado",
  "Enviado",
  "En tránsito",
  "Cancelado",
] as const;

export type RequestStatus = (typeof requestStatuses)[number];

/**
 * Máquina de estados del flujo de solicitudes.
 * Cada clave lista los estados a los que se puede avanzar directamente desde ese estado.
 * Los arrays vacíos son estados terminales (no se puede salir de ahí).
 *
 * Flujo soportado:
 *  Pendiente -> Aprobada -> Entregado
 *  Pendiente -> Rechazado
 *  Pendiente -> Aprobada -> Derivada a compra
 *  Pendiente -> Aprobada -> Derivada a compra -> Enviado (requiere nº pedido)
 *  ... -> Enviado -> En tránsito (requiere nº seguimiento)
 *  ... -> En tránsito -> Entregado (requiere fecha de entrega)
 *  Pendiente -> Aprobada -> Derivada a compra -> Cancelado
 *
 * Nota: una vez que existe nº de pedido (estado "Enviado" o posterior), ya no se
 * puede cancelar: la compra ya está en marcha. Cancelar solo es posible mientras
 * la solicitud está "Derivada a compra" (antes de generar el pedido).
 */
export const REQUEST_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  Pendiente: ["Aprobada", "Rechazado"],
  Aprobada: ["Derivada a compra"],
  "Derivada a compra": ["Enviado", "Cancelado"],
  Enviado: ["En tránsito"],
  "En tránsito": ["Entregado"],
  Entregado: [],
  Rechazado: [],
  Cancelado: [],
};

/** Campos obligatorios que deben tener valor para poder avanzar a cada estado. */
export const REQUEST_REQUIRED_FIELDS: Partial<
  Record<RequestStatus, Array<"numero_pedido" | "numero_seguimiento" | "fecha_entrega">>
> = {
  Enviado: ["numero_pedido"],
  "En tránsito": ["numero_seguimiento"],
  Entregado: ["fecha_entrega"],
};

// Compartido por solicitudes de material y reposición interna: ambas
// siguen exactamente el mismo ciclo de estados (RequestStatus).

/** Estados a los que se puede avanzar directamente desde `current`, incluyéndolo. */
export function availableNextStates(current: RequestStatus): RequestStatus[] {
  if (current === "Aprobada") {
    return ["Aprobada", "Derivada a compra", "Entregado"];
  }
  const next = REQUEST_TRANSITIONS[current] ?? [];
  return [current, ...next];
}

/**
 * Dentro de una misma edición, el nº de pedido / nº de seguimiento puede
 * encadenar varios saltos de estado (Aprobada -> Derivada a compra -> Enviado
 * -> En tránsito). Por eso la comprobación es de alcanzabilidad (BFS) y no de
 * un único salto: un único salto rechazaría esas cadenas legítimas.
 */
export function isStateReachable(from: RequestStatus, to: RequestStatus): boolean {
  if (from === to) return true;
  const visited = new Set<RequestStatus>([from]);
  const queue: RequestStatus[] = [from];
  while (queue.length > 0) {
    const current = queue.shift() as RequestStatus;
    for (const next of availableNextStates(current)) {
      if (next === current) continue;
      if (next === to) return true;
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  return false;
}

export function validateStateTransition(from: RequestStatus, to: RequestStatus): string | null {
  if (to !== from && !isStateReachable(from, to)) {
    return `No se puede pasar de "${from}" a "${to}" directamente.`;
  }
  return null;
}

// Agregar después de MaterialRequest
export type MaterialRequestSupplierLine = {
  id: string;
  proveedorId: string;
  proveedorNombre: string;
  cantidad: number;
  precioUnitario: number;
  numeroPedido?: string;
  numeroSeguimiento?: string;
};

export const departments = ["Packaging", "Oficinas", "Producción"] as const;
export type Department = (typeof departments)[number];

export type MaterialRequest = {
  id: string;
  producto: string;
  /** Solo si el producto ya existe en Stock; si es uno nuevo, no hay id. */
  productoId?: string;
  /** Solo si el producto no existe en Stock: enlace para localizarlo. */
  productoLink?: string;
  departamento?: Department;
  cantidad: number;
  solicitante: string;
  estado: RequestStatus;
  fecha: string;
  mensaje?: string;
  numero_pedido?: string;
  numero_seguimiento?: string;
  fecha_entrega?: string;
  proveedores?: MaterialRequestSupplierLine[];
  numero_referencia_factura?: string;
};

/** Convierte una fecha en formato "DD/MM/YYYY" (el que usa MaterialRequest.fecha) a Date. */
export function parseSolicitudFecha(fecha: string): Date | null {
  const [d, m, y] = fecha.split("/").map(Number);
  if (!d || !m || !y) return null;
  return new Date(y, m - 1, d);
}

// Estados terminales que archivan de inmediato, sin esperar al mes de
// antigüedad: una vez entregada, rechazada o cancelada, ya no hay nada
// más que hacer con la solicitud/reposición.
const IMMEDIATE_ARCHIVE_STATUSES: RequestStatus[] = ["Entregado", "Rechazado", "Cancelado"];

/**
 * Una solicitud pasa a "Solicitudes anteriores" cuando ya se entregó, se
 * rechazó o se canceló, o cuando ha pasado más de un mes desde que se
 * creó — lo que ocurra primero. Hasta que se cumpla alguna de las dos,
 * sigue viéndose en Solicitudes.
 */
export function isRequestArchived(request: MaterialRequest, now: Date = new Date()): boolean {
  if (IMMEDIATE_ARCHIVE_STATUSES.includes(request.estado)) return true;

  const fecha = parseSolicitudFecha(request.fecha);
  if (!fecha) return false;

  const unMesAtras = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  return fecha < unMesAtras;
}

export const productPlaceholderImage =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%23e5e7eb'/%3E%3Cpath d='M20 40l8-10 6 7 5-6 9 9v4H20z' fill='%23a1a1aa'/%3E%3Ccircle cx='25' cy='22' r='5' fill='%23a1a1aa'/%3E%3C/svg%3E";

export const statusClasses: Record<RequestStatus, string> = {
  Pendiente: "bg-warning/20 text-warning-foreground ring-1 ring-warning/40",
  Aprobada: "bg-primary/10 text-primary ring-1 ring-primary/30",
  Entregado: "bg-success/15 text-success ring-1 ring-success/30",
  "Derivada a compra": "bg-accent text-accent-foreground ring-1 ring-border",
  Rechazado: "bg-destructive/10 text-destructive ring-1 ring-destructive/30",
  Enviado: "bg-blue-500/20 text-blue-700 ring-1 ring-blue-500/30",
  "En tránsito": "bg-orange-500/20 text-orange-700 ring-1 ring-orange-500/30",
  Cancelado: "bg-zinc-500/20 text-zinc-600 ring-1 ring-zinc-500/30",
};

/* ---------------- Pedidos ---------------- */

export const orderStatuses = [
  "Pendiente",
  "Enviado",
  "En tránsito",
  "Entregado",
  "Cancelado",
] as const;
export type OrderStatus = (typeof orderStatuses)[number];

export type Order = {
  id: string;
  numero: string;
  proveedor: string;
  estado: OrderStatus;
  fecha: string;
  lineas: { numero: string; nombre: string; pedida: number; recibida: number }[];
};

export const orderStatusClasses: Record<OrderStatus, string> = {
  Pendiente: "bg-warning/20 text-warning-foreground ring-1 ring-warning/40",
  Enviado: "bg-primary/10 text-primary ring-1 ring-primary/30",
  "En tránsito": "bg-accent text-accent-foreground ring-1 ring-border",
  Entregado: "bg-success/15 text-success ring-1 ring-success/30",
  Cancelado: "bg-zinc-500/20 text-zinc-600 ring-1 ring-zinc-500/30",
};

/* ---------------- Notificaciones ---------------- */

export type NotificationType =
  "Solicitud de material" | "Solicitud de compra" | "Pedido actualizado";

export type AppNotification = {
  id: string;
  tipo: NotificationType;
  mensaje: string;
  fecha: string;
  leida: boolean;
};

/* ---------------- Reposición Interna ---------------- */
export interface InternalReplenishment {
  id: string;
  productoNumero: string;
  productoNombre: string;
  cantidadActual: number;
  cantidadMinima: number;
  cantidadRequerir: number;
  estado: RequestStatus;
  ubicacion: string;
  fechaSolicitud: string;
  fechaCompletada?: string;
  numero_pedido?: string;
  numero_seguimiento?: string;
  proveedores?: MaterialRequestSupplierLine[];
}

export const replenishmentStatuses = requestStatuses;

export const replenishmentStatusClasses: Record<RequestStatus, string> = statusClasses;

/**
 * Igual que isRequestArchived pero para reposición interna: pasa a
 * "Solicitudes anteriores" al entregarse, rechazarse o cancelarse, o al
 * pasar más de un mes desde que se creó, lo que ocurra primero.
 */
export function isReplenishmentArchived(
  replenishment: InternalReplenishment,
  now: Date = new Date(),
): boolean {
  if (IMMEDIATE_ARCHIVE_STATUSES.includes(replenishment.estado)) return true;

  const fecha = new Date(replenishment.fechaSolicitud);
  if (Number.isNaN(fecha.getTime())) return false;

  const unMesAtras = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  return fecha < unMesAtras;
}
