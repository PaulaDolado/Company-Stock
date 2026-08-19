import {
  listSuppliers,
  createSupplierRow,
  updateSupplierRow,
  deleteSupplierRow,
  listProducts,
  createProductRow,
  updateProductRow,
  deleteProductRow,
  listMaterialRequests,
  createMaterialRequestRow,
  updateMaterialRequestRow,
  addMaterialRequestSupplierLineRow,
  removeMaterialRequestSupplierLineRow,
  listInternalReplenishments,
  createInternalReplenishmentRow,
  updateInternalReplenishmentRow,
  deleteInternalReplenishmentRow,
  addReplenishmentSupplierLineRow,
  removeReplenishmentSupplierLineRow,
  listOrders,
  listNotifications,
  markNotificationReadRow,
  markAllNotificationsReadRow,
  type DbSupplier,
  type DbProduct,
  type HydratedMaterialRequest,
  type HydratedInternalReplenishment,
  type HydratedOrder,
  type DbNotification,
  type RequestStatusApi,
  type DepartmentApi,
} from "@/lib/mock-db";
import {
  RequestStatus,
  MaterialRequest,
  MaterialRequestSupplierLine,
  InternalReplenishment,
  Product,
  productPlaceholderImage,
  Order,
  OrderStatus,
  AppNotification,
  NotificationType,
  Department,
} from "@/data/mock";

// ---------------------------------------------------------
// Esta app no tiene backend real: todo vive en el navegador (ver
// src/lib/mock-db.ts). Este módulo conserva exactamente las mismas
// funciones y formas de datos que en la versión conectada a un backend
// real, para que hooks y páginas no necesiten saber que los datos son
// locales.
// ---------------------------------------------------------

// ---------------------------------------------------------
// Mapeo de estados: el "backend" local usa MAYUSCULAS_CON_GUION, el
// frontend usa las etiquetas en español que ya se muestran en la UI.
// ---------------------------------------------------------

const STATUS_TO_FRONTEND: Record<RequestStatusApi, RequestStatus> = {
  PENDIENTE: "Pendiente",
  APROBADA: "Aprobada",
  ENTREGADO: "Entregado",
  DERIVADA_COMPRA: "Derivada a compra",
  RECHAZADO: "Rechazado",
  ENVIADO: "Enviado",
  EN_TRANSITO: "En tránsito",
  CANCELADO: "Cancelado",
};

const STATUS_TO_API: Record<RequestStatus, RequestStatusApi> = {
  Pendiente: "PENDIENTE",
  Aprobada: "APROBADA",
  Entregado: "ENTREGADO",
  "Derivada a compra": "DERIVADA_COMPRA",
  Rechazado: "RECHAZADO",
  Enviado: "ENVIADO",
  "En tránsito": "EN_TRANSITO",
  Cancelado: "CANCELADO",
};

const DEPARTMENT_TO_FRONTEND: Record<DepartmentApi, Department> = {
  PACKAGING: "Packaging",
  OFICINAS: "Oficinas",
  PRODUCCION: "Producción",
};

const DEPARTMENT_TO_API: Record<Department, DepartmentApi> = {
  Packaging: "PACKAGING",
  Oficinas: "OFICINAS",
  Producción: "PRODUCCION",
};

function formatFechaEs(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function formatFechaHoraEs(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${formatFechaEs(iso)} ${hh}:${min}`;
}

const ORDER_STATUS_TO_FRONTEND: Record<string, OrderStatus> = {
  PENDIENTE: "Pendiente",
  ENVIADO: "Enviado",
  EN_TRANSITO: "En tránsito",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
};

const NOTIFICATION_TYPE_TO_FRONTEND: Record<string, NotificationType> = {
  SOLICITUD_MATERIAL: "Solicitud de material",
  SOLICITUD_COMPRA: "Solicitud de compra",
  PEDIDO_ACTUALIZADO: "Pedido actualizado",
};

// ---------------------------------------------------------
// Mapeadores modelo local -> modelo de vista del frontend
// ---------------------------------------------------------

export type Supplier = {
  id: string;
  nombre: string;
  telefono: string;
  web: string;
  email: string;
};

function mapSupplier(s: DbSupplier): Supplier {
  return {
    id: s.id,
    nombre: s.name,
    telefono: s.phone ?? "",
    web: s.website ?? "",
    email: s.email ?? "",
  };
}

function mapProduct(p: DbProduct & { supplier?: DbSupplier | null }): Product {
  return {
    id: p.id,
    numero: p.productNumber ?? "",
    nombre: p.name,
    descripcion: p.description ?? "",
    cantidad: p.quantity,
    minimo: p.minimumStock,
    proveedor: p.supplier?.name ?? "",
    proveedorId: p.supplierId ?? "",
    imagen: p.imageUrl || productPlaceholderImage,
    precioMinimo: p.minPrice != null ? Number(p.minPrice) : undefined,
    precioMaximo: p.maxPrice != null ? Number(p.maxPrice) : undefined,
    ubicacion: p.location ?? "",
  };
}

// Compartido por líneas de solicitudes de material (llevan numeroPedido/
// numeroSeguimiento propios) y de reposición interna (no los tienen): se
// tipa de forma estructural para aceptar ambas formas sin duplicar el mapeo.
type SupplierLineLike = {
  id: string;
  supplierId: string;
  supplier: DbSupplier;
  quantity: number;
  unitPrice: number;
  numeroPedido?: string | null;
  numeroSeguimiento?: string | null;
};

function mapSupplierLine(l: SupplierLineLike): MaterialRequestSupplierLine {
  return {
    id: l.id,
    proveedorId: l.supplierId,
    proveedorNombre: l.supplier?.name ?? "",
    cantidad: l.quantity,
    precioUnitario: Number(l.unitPrice),
    numeroPedido: l.numeroPedido ?? undefined,
    numeroSeguimiento: l.numeroSeguimiento ?? undefined,
  };
}

function mapMaterialRequest(r: HydratedMaterialRequest): MaterialRequest {
  return {
    id: r.id,
    // Si el producto ya existe en Stock se muestra su nombre real; si no,
    // el nombre libre que se indicó al pedirlo.
    producto: r.product?.name ?? r.productName ?? "",
    productoId: r.productId ?? undefined,
    productoLink: r.productLink ?? undefined,
    departamento: r.department ? DEPARTMENT_TO_FRONTEND[r.department] : undefined,
    cantidad: r.quantity,
    solicitante: r.requester?.name ?? "",
    estado: STATUS_TO_FRONTEND[r.status],
    fecha: formatFechaEs(r.createdAt),
    mensaje: r.message ?? undefined,
    numero_pedido: r.numeroPedido ?? undefined,
    numero_seguimiento: r.numeroSeguimiento ?? undefined,
    fecha_entrega: r.deliveredAt ? formatFechaEs(r.deliveredAt) : undefined,
    numero_referencia_factura: r.numeroReferenciaFactura ?? undefined,
    proveedores: r.supplierLines?.map(mapSupplierLine) ?? [],
  };
}

function mapInternalReplenishment(r: HydratedInternalReplenishment): InternalReplenishment {
  return {
    id: r.id,
    productoNumero: r.product?.productNumber ?? "",
    productoNombre: r.product?.name ?? "",
    cantidadActual: r.currentQuantitySnapshot,
    cantidadMinima: r.minimumQuantitySnapshot,
    cantidadRequerir: r.quantityRequired,
    estado: STATUS_TO_FRONTEND[r.status],
    ubicacion: r.location,
    fechaSolicitud: r.requestedAt.slice(0, 10),
    fechaCompletada: r.completedAt ? r.completedAt.slice(0, 10) : undefined,
    numero_pedido: r.numeroPedido ?? undefined,
    numero_seguimiento: r.numeroSeguimiento ?? undefined,
    proveedores: r.supplierLines?.map(mapSupplierLine) ?? [],
  };
}

function mapOrder(o: HydratedOrder): Order {
  return {
    id: o.id,
    numero: o.orderNumber,
    proveedor: o.supplier?.name ?? "",
    estado: ORDER_STATUS_TO_FRONTEND[o.status],
    fecha: formatFechaEs(o.createdAt),
    lineas: o.items.map((item) => ({
      numero: item.product?.productNumber ?? "",
      nombre: item.product?.name ?? "",
      pedida: item.quantityOrdered,
      recibida: item.quantityReceived,
    })),
  };
}

function mapNotification(n: DbNotification): AppNotification {
  return {
    id: n.id,
    tipo: NOTIFICATION_TYPE_TO_FRONTEND[n.type],
    mensaje: n.message,
    fecha: formatFechaHoraEs(n.createdAt),
    leida: n.read,
  };
}

// ---------------------------------------------------------
// Proveedores
// ---------------------------------------------------------

export async function fetchSuppliers(): Promise<Supplier[]> {
  const raw = await listSuppliers();
  return raw.map(mapSupplier);
}

export async function createSupplier(input: {
  nombre: string;
  telefono?: string;
  web?: string;
  email?: string;
}): Promise<Supplier> {
  const raw = await createSupplierRow({
    name: input.nombre,
    phone: input.telefono,
    website: input.web,
    email: input.email,
  });
  return mapSupplier(raw);
}

export async function updateSupplierApi(
  id: string,
  changes: Partial<{ nombre: string; telefono: string; web: string; email: string }>,
): Promise<Supplier> {
  const body: Record<string, unknown> = {};
  if (changes.nombre !== undefined) body.name = changes.nombre;
  if (changes.telefono !== undefined) body.phone = changes.telefono;
  if (changes.web !== undefined) body.website = changes.web;
  if (changes.email !== undefined) body.email = changes.email;

  const raw = await updateSupplierRow(id, body);
  return mapSupplier(raw);
}

export async function deleteSupplierApi(id: string): Promise<void> {
  await deleteSupplierRow(id);
}

// ---------------------------------------------------------
// Productos / Stock
// ---------------------------------------------------------

function withSupplier(
  product: DbProduct,
  suppliers: DbSupplier[],
): DbProduct & { supplier: DbSupplier | null } {
  return { ...product, supplier: suppliers.find((s) => s.id === product.supplierId) ?? null };
}

export async function fetchProducts(): Promise<Product[]> {
  const [products, suppliers] = await Promise.all([listProducts(), listSuppliers()]);
  return products.map((p) => mapProduct(withSupplier(p, suppliers)));
}

export async function createProduct(input: {
  numero?: string;
  nombre: string;
  descripcion?: string;
  cantidad: number;
  minimo: number;
  proveedorId?: string;
  ubicacion?: string;
  imagen?: string;
  precioMinimo?: number;
  precioMaximo?: number;
}): Promise<Product> {
  const raw = await createProductRow({
    productNumber: input.numero || undefined,
    name: input.nombre,
    description: input.descripcion || undefined,
    quantity: input.cantidad,
    minimumStock: input.minimo,
    supplierId: input.proveedorId || undefined,
    location: input.ubicacion,
    imageUrl: input.imagen,
    minPrice: input.precioMinimo,
    maxPrice: input.precioMaximo,
  });
  const suppliers = await listSuppliers();
  return mapProduct(withSupplier(raw, suppliers));
}

export async function deleteProductApi(id: string): Promise<void> {
  await deleteProductRow(id);
}

export async function updateProductApi(
  id: string,
  changes: Partial<{
    numero: string;
    nombre: string;
    descripcion: string;
    cantidad: number;
    minimo: number;
    proveedorId: string;
    ubicacion: string;
    precioMinimo: number;
    precioMaximo: number;
    imagen: string;
  }>,
): Promise<Product> {
  const body: Record<string, unknown> = {};
  // "" significa "sin número"/"sin proveedor"/"sin descripción"/"sin
  // imagen": se manda null explícito para poder quitar lo que ya
  // tuviera asignado (no solo para no tocarlo).
  if (changes.numero !== undefined) body.productNumber = changes.numero || null;
  if (changes.nombre !== undefined) body.name = changes.nombre;
  if (changes.descripcion !== undefined) body.description = changes.descripcion || null;
  if (changes.cantidad !== undefined) body.quantity = changes.cantidad;
  if (changes.minimo !== undefined) body.minimumStock = changes.minimo;
  if (changes.proveedorId !== undefined) body.supplierId = changes.proveedorId || null;
  if (changes.ubicacion !== undefined) body.location = changes.ubicacion;
  if (changes.precioMinimo !== undefined) body.minPrice = changes.precioMinimo;
  if (changes.precioMaximo !== undefined) body.maxPrice = changes.precioMaximo;
  if (changes.imagen !== undefined) body.imageUrl = changes.imagen || null;

  const raw = await updateProductRow(id, body);
  const suppliers = await listSuppliers();
  return mapProduct(withSupplier(raw, suppliers));
}

// ---------------------------------------------------------
// Solicitudes de material
// ---------------------------------------------------------

export async function fetchMaterialRequests(): Promise<MaterialRequest[]> {
  const raw = await listMaterialRequests();
  return raw.map(mapMaterialRequest);
}

export async function createMaterialRequest(input: {
  // O bien productId (producto ya existente en Stock), o bien
  // productoNombre (+ productoLink) para uno que todavía no existe.
  productId?: string;
  productoNombre?: string;
  productoLink?: string;
  departamento: Department;
  cantidad: number;
  mensaje?: string;
}): Promise<MaterialRequest> {
  const raw = await createMaterialRequestRow({
    productId: input.productId,
    productName: input.productId ? undefined : input.productoNombre,
    productLink: input.productId ? undefined : input.productoLink,
    department: DEPARTMENT_TO_API[input.departamento],
    quantity: input.cantidad,
    message: input.mensaje,
  });
  return mapMaterialRequest(raw);
}

export async function updateMaterialRequestApi(
  id: string,
  changes: Partial<{
    estado: RequestStatus;
    numero_pedido: string;
    numero_seguimiento: string;
    numero_referencia_factura: string;
    fecha_entrega: string;
  }>,
): Promise<MaterialRequest> {
  const body: Record<string, unknown> = {};
  if (changes.estado !== undefined) body.status = STATUS_TO_API[changes.estado];
  if (changes.numero_pedido !== undefined) body.numeroPedido = changes.numero_pedido;
  if (changes.numero_seguimiento !== undefined) body.numeroSeguimiento = changes.numero_seguimiento;
  if (changes.numero_referencia_factura !== undefined) {
    body.numeroReferenciaFactura = changes.numero_referencia_factura;
  }
  if (changes.fecha_entrega !== undefined) body.deliveredAt = changes.fecha_entrega;

  const raw = await updateMaterialRequestRow(id, body);
  return mapMaterialRequest(raw);
}

export async function addMaterialRequestSupplierLine(
  requestId: string,
  line: { supplierId: string; quantity: number; unitPrice: number },
): Promise<MaterialRequestSupplierLine> {
  const raw = await addMaterialRequestSupplierLineRow(requestId, line);
  return mapSupplierLine(raw);
}

export async function removeMaterialRequestSupplierLine(
  requestId: string,
  lineId: string,
): Promise<void> {
  void requestId;
  await removeMaterialRequestSupplierLineRow(lineId);
}

// ---------------------------------------------------------
// Reposición interna
// ---------------------------------------------------------

export async function fetchInternalReplenishments(): Promise<InternalReplenishment[]> {
  const raw = await listInternalReplenishments();
  return raw.map(mapInternalReplenishment);
}

export async function createInternalReplenishment(input: {
  productId: string;
  cantidadRequerir: number;
  ubicacion: string;
}): Promise<InternalReplenishment> {
  const raw = await createInternalReplenishmentRow({
    productId: input.productId,
    quantityRequired: input.cantidadRequerir,
    location: input.ubicacion,
  });
  return mapInternalReplenishment(raw);
}

export async function updateInternalReplenishmentApi(
  id: string,
  changes: Partial<{ estado: RequestStatus; numero_pedido: string; numero_seguimiento: string }>,
): Promise<InternalReplenishment> {
  const body: Record<string, unknown> = {};
  if (changes.estado !== undefined) body.status = STATUS_TO_API[changes.estado];
  if (changes.numero_pedido !== undefined) body.numeroPedido = changes.numero_pedido;
  if (changes.numero_seguimiento !== undefined) body.numeroSeguimiento = changes.numero_seguimiento;

  const raw = await updateInternalReplenishmentRow(id, body);
  return mapInternalReplenishment(raw);
}

export async function deleteInternalReplenishment(id: string): Promise<void> {
  await deleteInternalReplenishmentRow(id);
}

export async function addReplenishmentSupplierLine(
  replenishmentId: string,
  line: { supplierId: string; quantity: number; unitPrice: number },
): Promise<MaterialRequestSupplierLine> {
  const raw = await addReplenishmentSupplierLineRow(replenishmentId, line);
  return mapSupplierLine(raw);
}

export async function removeReplenishmentSupplierLine(
  replenishmentId: string,
  lineId: string,
): Promise<void> {
  void replenishmentId;
  await removeReplenishmentSupplierLineRow(lineId);
}

// ---------------------------------------------------------
// Pedidos
// ---------------------------------------------------------
// Los pedidos se generan automáticamente al derivar una solicitud a
// compra; aquí solo se leen.

export async function fetchOrders(): Promise<Order[]> {
  const raw = await listOrders();
  return raw.map(mapOrder);
}

// ---------------------------------------------------------
// Notificaciones
// ---------------------------------------------------------

export async function fetchNotifications(): Promise<AppNotification[]> {
  const raw = await listNotifications();
  return raw.map(mapNotification);
}

export async function markNotificationRead(id: string): Promise<AppNotification> {
  const raw = await markNotificationReadRow(id);
  return mapNotification(raw);
}

export async function markAllNotificationsRead(): Promise<void> {
  await markAllNotificationsReadRow();
}
