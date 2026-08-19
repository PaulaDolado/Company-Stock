// ---------------------------------------------------------------------------
// "Backend" local para la demo de portfolio: no hay servidor ni base de
// datos real. Todo el estado vive aquí, en memoria y persistido en
// localStorage, y las funciones de este módulo reproducen las mismas reglas
// de negocio que en la app original tenía el backend Express (derivar a
// compra, generar pedidos, sincronizar estados, notificar a gestión...).
//
// `src/lib/api.ts` es el único consumidor de este módulo: expone las mismas
// funciones que antes hacían fetch() a un backend real, así que el resto de
// la app (hooks, páginas) no sabe ni le importa que los datos son locales.
// ---------------------------------------------------------------------------

import gloves from "@/assets/products/p-1001.jpg";
import paper from "@/assets/products/p-1002.jpg";
import toner from "@/assets/products/p-1003.jpg";
import masks from "@/assets/products/p-1004.jpg";
import gel from "@/assets/products/p-1005.jpg";
import tape from "@/assets/products/p-1006.jpg";
import box from "@/assets/products/p-1007.jpg";
import pens from "@/assets/products/p-1008.jpg";
import labels from "@/assets/products/p-1009.jpg";
import helmet from "@/assets/products/p-1010.jpg";

export type Role = "SOLICITANTE" | "GESTION" | "ADMIN";
export type RequestStatusApi =
  | "PENDIENTE"
  | "APROBADA"
  | "ENTREGADO"
  | "DERIVADA_COMPRA"
  | "RECHAZADO"
  | "ENVIADO"
  | "EN_TRANSITO"
  | "CANCELADO";
export type OrderStatusApi = "PENDIENTE" | "ENVIADO" | "EN_TRANSITO" | "ENTREGADO" | "CANCELADO";
export type DepartmentApi = "PACKAGING" | "OFICINAS" | "PRODUCCION";
export type NotificationTypeApi = "SOLICITUD_MATERIAL" | "SOLICITUD_COMPRA" | "PEDIDO_ACTUALIZADO";

export interface DbUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  createdAt: string;
}

export interface DbSupplier {
  id: string;
  name: string;
  phone: string | null;
  website: string | null;
  email: string | null;
  createdAt: string;
}

export interface DbProduct {
  id: string;
  productNumber: string | null;
  name: string;
  description: string | null;
  quantity: number;
  minimumStock: number;
  location: string | null;
  imageUrl: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  supplierId: string | null;
  createdAt: string;
}

export interface DbMaterialRequestSupplierLine {
  id: string;
  materialRequestId: string;
  supplierId: string;
  quantity: number;
  unitPrice: number;
  numeroPedido: string | null;
  numeroSeguimiento: string | null;
  orderId: string | null;
  createdAt: string;
}

export interface DbMaterialRequest {
  id: string;
  productId: string | null;
  productName: string | null;
  productLink: string | null;
  department: DepartmentApi | null;
  requesterId: string;
  quantity: number;
  status: RequestStatusApi;
  message: string | null;
  handledById: string | null;
  numeroPedido: string | null;
  numeroSeguimiento: string | null;
  numeroReferenciaFactura: string | null;
  approvedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DbReplenishmentSupplierLine {
  id: string;
  replenishmentId: string;
  supplierId: string;
  quantity: number;
  unitPrice: number;
  orderId: string | null;
  createdAt: string;
}

export interface DbInternalReplenishment {
  id: string;
  productId: string;
  quantityRequired: number;
  location: string;
  status: RequestStatusApi;
  currentQuantitySnapshot: number;
  minimumQuantitySnapshot: number;
  numeroPedido: string | null;
  numeroSeguimiento: string | null;
  requestedAt: string;
  completedAt: string | null;
}

export interface DbOrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantityOrdered: number;
  quantityReceived: number;
}

export interface DbOrder {
  id: string;
  orderNumber: string;
  trackingNumber: string | null;
  supplierId: string;
  status: OrderStatusApi;
  estimatedDeliveryDate: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DbNotification {
  id: string;
  userId: string;
  type: NotificationTypeApi;
  referenceId: string;
  message: string;
  read: boolean;
  createdAt: string;
}

interface Store {
  users: DbUser[];
  suppliers: DbSupplier[];
  products: DbProduct[];
  materialRequests: DbMaterialRequest[];
  materialRequestSupplierLines: DbMaterialRequestSupplierLine[];
  internalReplenishments: DbInternalReplenishment[];
  replenishmentSupplierLines: DbReplenishmentSupplierLine[];
  orders: DbOrder[];
  orderItems: DbOrderItem[];
  notifications: DbNotification[];
}

const DB_KEY = "company-stock-demo-db-v1";
const SESSION_KEY = "company-stock-demo-session-v1";
const STAFF: Role[] = ["GESTION", "ADMIN"];

// ---------------------------------------------------------
// Fechas relativas a "hoy", para que la demo no se quede con datos
// clavados en una fecha pasada: se recalculan cada vez que arranca la app.
// ---------------------------------------------------------
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

// ---------------------------------------------------------
// Datos de muestra: proveedores, productos y personas totalmente
// ficticios, pensados solo para mostrar el funcionamiento de la app.
// ---------------------------------------------------------
function seed(): Store {
  const users: DbUser[] = [
    {
      id: "u-admin",
      name: "Marta Ibáñez",
      email: "admin@companystock.demo",
      password: "demo1234",
      role: "ADMIN",
      createdAt: daysAgo(200),
    },
    {
      id: "u-gestion",
      name: "Diego Salas",
      email: "gestion@companystock.demo",
      password: "demo1234",
      role: "GESTION",
      createdAt: daysAgo(180),
    },
    {
      id: "u-solicitante",
      name: "Laura Campos",
      email: "solicitante@companystock.demo",
      password: "demo1234",
      role: "SOLICITANTE",
      createdAt: daysAgo(150),
    },
    {
      id: "u-solicitante-2",
      name: "Javier Ortega",
      email: "jortega@companystock.demo",
      password: "demo1234",
      role: "SOLICITANTE",
      createdAt: daysAgo(120),
    },
  ];

  const suppliers: DbSupplier[] = [
    {
      id: "sup-epi",
      name: "EPI Protec",
      phone: "912 345 001",
      website: "https://epiprotec.example.com",
      email: "pedidos@epiprotec.example.com",
      createdAt: daysAgo(200),
    },
    {
      id: "sup-papeleria",
      name: "Papelería Montserrat",
      phone: "912 345 002",
      website: "https://papeleriamontserrat.example.com",
      email: "ventas@papeleriamontserrat.example.com",
      createdAt: daysAgo(190),
    },
    {
      id: "sup-logipack",
      name: "LogiPack Iberia",
      phone: "912 345 003",
      website: "https://logipackiberia.example.com",
      email: "comercial@logipackiberia.example.com",
      createdAt: daysAgo(170),
    },
    {
      id: "sup-ebro",
      name: "Suministros del Ebro S.L.",
      phone: "912 345 004",
      website: "https://suministrosebro.example.com",
      email: "info@suministrosebro.example.com",
      createdAt: daysAgo(160),
    },
  ];

  const products: DbProduct[] = [
    {
      id: "prod-1001",
      productNumber: "PROD-1001",
      name: "Guantes de nitrilo (caja 100 uds)",
      description: "Guantes de nitrilo sin polvo, talla M, caja de 100 unidades.",
      quantity: 320,
      minimumStock: 100,
      location: "Almacén A - Estante 3",
      imageUrl: gloves,
      minPrice: 6.5,
      maxPrice: 8.2,
      supplierId: "sup-epi",
      createdAt: daysAgo(150),
    },
    {
      id: "prod-1002",
      productNumber: "PROD-1002",
      name: "Papel A4 80g (paquete 500 hojas)",
      description: "Papel blanco multiuso 80g/m², paquete de 500 hojas.",
      quantity: 150,
      minimumStock: 50,
      location: "Almacén B - Estante 1",
      imageUrl: paper,
      minPrice: 3.9,
      maxPrice: 4.6,
      supplierId: "sup-papeleria",
      createdAt: daysAgo(150),
    },
    {
      id: "prod-1003",
      productNumber: "PROD-1003",
      name: "Tóner de impresora (negro)",
      description: "Cartucho de tóner negro compatible, alto rendimiento.",
      quantity: 18,
      minimumStock: 10,
      location: "Almacén B - Estante 2",
      imageUrl: toner,
      minPrice: 42,
      maxPrice: 55,
      supplierId: "sup-papeleria",
      createdAt: daysAgo(140),
    },
    {
      id: "prod-1004",
      productNumber: "PROD-1004",
      name: "Mascarillas quirúrgicas (caja 50 uds)",
      description: "Mascarillas quirúrgicas tipo IIR, caja de 50 unidades.",
      quantity: 60,
      minimumStock: 80,
      location: "Almacén A - Estante 1",
      imageUrl: masks,
      minPrice: 5.2,
      maxPrice: 6.8,
      supplierId: "sup-epi",
      createdAt: daysAgo(150),
    },
    {
      id: "prod-1005",
      productNumber: "PROD-1005",
      name: "Gel hidroalcohólico (500 ml)",
      description: "Gel hidroalcohólico desinfectante con dosificador, 500 ml.",
      quantity: 40,
      minimumStock: 30,
      location: "Almacén A - Estante 2",
      imageUrl: gel,
      minPrice: 2.1,
      maxPrice: 2.9,
      supplierId: "sup-epi",
      createdAt: daysAgo(130),
    },
    {
      id: "prod-1006",
      productNumber: "PROD-1006",
      name: "Cinta adhesiva de embalaje (rollo 66m)",
      description: "Cinta adhesiva transparente para embalaje, rollo de 66 metros.",
      quantity: 200,
      minimumStock: 60,
      location: "Almacén C - Estante 1",
      imageUrl: tape,
      minPrice: 1.1,
      maxPrice: 1.6,
      supplierId: "sup-logipack",
      createdAt: daysAgo(120),
    },
    {
      id: "prod-1007",
      productNumber: "PROD-1007",
      name: "Caja de cartón para embalaje (40x30x30)",
      description: "Caja de cartón doble canal, 40x30x30 cm.",
      quantity: 90,
      minimumStock: 40,
      location: "Almacén C - Estante 2",
      imageUrl: box,
      minPrice: 0.8,
      maxPrice: 1.3,
      supplierId: "sup-logipack",
      createdAt: daysAgo(120),
    },
    {
      id: "prod-1008",
      productNumber: "PROD-1008",
      name: "Bolígrafos azules (pack 6 uds)",
      description: "Bolígrafos de tinta azul, punta 1mm, pack de 6 unidades.",
      quantity: 75,
      minimumStock: 20,
      location: "Almacén B - Estante 3",
      imageUrl: pens,
      minPrice: 2.5,
      maxPrice: 3.2,
      supplierId: "sup-papeleria",
      createdAt: daysAgo(100),
    },
    {
      id: "prod-1009",
      productNumber: "PROD-1009",
      name: "Rollo de etiquetas adhesivas",
      description: "Rollo de etiquetas adhesivas blancas para impresora de etiquetas.",
      quantity: 25,
      minimumStock: 15,
      location: "Almacén B - Estante 1",
      imageUrl: labels,
      minPrice: 8.5,
      maxPrice: 10.2,
      supplierId: "sup-ebro",
      createdAt: daysAgo(100),
    },
    {
      id: "prod-1010",
      productNumber: "PROD-1010",
      name: "Casco de seguridad (EPI)",
      description: "Casco de seguridad homologado, ajuste con rueda dentada.",
      quantity: 12,
      minimumStock: 15,
      location: "Almacén A - Estante 4",
      imageUrl: helmet,
      minPrice: 9.9,
      maxPrice: 13.5,
      supplierId: "sup-epi",
      createdAt: daysAgo(90),
    },
  ];

  const materialRequests: DbMaterialRequest[] = [
    {
      id: "req-1",
      productId: "prod-1004",
      productName: null,
      productLink: null,
      department: "PRODUCCION",
      requesterId: "u-solicitante",
      quantity: 5,
      status: "PENDIENTE",
      message: "Se están agotando en la línea 2.",
      handledById: null,
      numeroPedido: null,
      numeroSeguimiento: null,
      numeroReferenciaFactura: null,
      approvedAt: null,
      deliveredAt: null,
      createdAt: daysAgo(2),
      updatedAt: daysAgo(2),
    },
    {
      id: "req-2",
      productId: "prod-1010",
      productName: null,
      productLink: null,
      department: "PRODUCCION",
      requesterId: "u-solicitante-2",
      quantity: 8,
      status: "APROBADA",
      message: null,
      handledById: "u-gestion",
      numeroPedido: null,
      numeroSeguimiento: null,
      numeroReferenciaFactura: null,
      approvedAt: daysAgo(4),
      deliveredAt: null,
      createdAt: daysAgo(5),
      updatedAt: daysAgo(4),
    },
    {
      id: "req-3",
      productId: null,
      productName: "Monitor 24'' para puesto de oficina",
      productLink: "https://tienda-ejemplo.demo/monitor-24",
      department: "OFICINAS",
      requesterId: "u-solicitante",
      quantity: 1,
      status: "PENDIENTE",
      message: null,
      handledById: null,
      numeroPedido: null,
      numeroSeguimiento: null,
      numeroReferenciaFactura: null,
      approvedAt: null,
      deliveredAt: null,
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
    },
    {
      id: "req-4",
      productId: "prod-1001",
      productName: null,
      productLink: null,
      department: "PACKAGING",
      requesterId: "u-solicitante-2",
      quantity: 10,
      status: "DERIVADA_COMPRA",
      message: null,
      handledById: "u-gestion",
      numeroPedido: null,
      numeroSeguimiento: null,
      numeroReferenciaFactura: null,
      approvedAt: daysAgo(9),
      deliveredAt: null,
      createdAt: daysAgo(10),
      updatedAt: daysAgo(8),
    },
    {
      id: "req-5",
      productId: "prod-1003",
      productName: null,
      productLink: null,
      department: "OFICINAS",
      requesterId: "u-solicitante",
      quantity: 3,
      status: "ENVIADO",
      message: null,
      handledById: "u-gestion",
      numeroPedido: "PED-DEMO-0005",
      numeroSeguimiento: "SEG-000123",
      numeroReferenciaFactura: null,
      approvedAt: daysAgo(19),
      deliveredAt: null,
      createdAt: daysAgo(20),
      updatedAt: daysAgo(16),
    },
    {
      id: "req-6",
      productId: "prod-1006",
      productName: null,
      productLink: null,
      department: "PACKAGING",
      requesterId: "u-solicitante-2",
      quantity: 20,
      status: "EN_TRANSITO",
      message: null,
      handledById: "u-gestion",
      numeroPedido: "PED-DEMO-0006",
      numeroSeguimiento: "SEG-000456",
      numeroReferenciaFactura: null,
      approvedAt: daysAgo(24),
      deliveredAt: null,
      createdAt: daysAgo(25),
      updatedAt: daysAgo(19),
    },
    {
      id: "req-7",
      productId: "prod-1002",
      productName: null,
      productLink: null,
      department: "OFICINAS",
      requesterId: "u-solicitante",
      quantity: 15,
      status: "ENTREGADO",
      message: null,
      handledById: "u-gestion",
      numeroPedido: "PED-DEMO-0007",
      numeroSeguimiento: "SEG-000789",
      numeroReferenciaFactura: "FAC-2026-0442",
      approvedAt: daysAgo(14),
      deliveredAt: daysAgo(2),
      createdAt: daysAgo(15),
      updatedAt: daysAgo(2),
    },
    {
      id: "req-8",
      productId: "prod-1008",
      productName: null,
      productLink: null,
      department: "OFICINAS",
      requesterId: "u-solicitante-2",
      quantity: 5,
      status: "RECHAZADO",
      message: "Ya hay stock suficiente en el almacén de oficinas.",
      handledById: "u-admin",
      numeroPedido: null,
      numeroSeguimiento: null,
      numeroReferenciaFactura: null,
      approvedAt: null,
      deliveredAt: null,
      createdAt: daysAgo(8),
      updatedAt: daysAgo(7),
    },
    {
      id: "req-9",
      productId: "prod-1009",
      productName: null,
      productLink: null,
      department: "PACKAGING",
      requesterId: "u-solicitante",
      quantity: 4,
      status: "CANCELADO",
      message: null,
      handledById: "u-gestion",
      numeroPedido: null,
      numeroSeguimiento: null,
      numeroReferenciaFactura: null,
      approvedAt: daysAgo(39),
      deliveredAt: null,
      createdAt: daysAgo(40),
      updatedAt: daysAgo(35),
    },
    {
      id: "req-10",
      productId: "prod-1007",
      productName: null,
      productLink: null,
      department: "PACKAGING",
      requesterId: "u-solicitante-2",
      quantity: 30,
      status: "APROBADA",
      message: null,
      handledById: "u-gestion",
      numeroPedido: null,
      numeroSeguimiento: null,
      numeroReferenciaFactura: null,
      approvedAt: daysAgo(44),
      deliveredAt: null,
      createdAt: daysAgo(45),
      updatedAt: daysAgo(44),
    },
  ];

  const materialRequestSupplierLines: DbMaterialRequestSupplierLine[] = [
    {
      id: "mrsl-1",
      materialRequestId: "req-4",
      supplierId: "sup-epi",
      quantity: 10,
      unitPrice: 7.1,
      numeroPedido: null,
      numeroSeguimiento: null,
      orderId: "order-1",
      createdAt: daysAgo(8),
    },
    {
      id: "mrsl-2",
      materialRequestId: "req-5",
      supplierId: "sup-papeleria",
      quantity: 3,
      unitPrice: 48,
      numeroPedido: "PED-DEMO-0005",
      numeroSeguimiento: "SEG-000123",
      orderId: "order-2",
      createdAt: daysAgo(19),
    },
    {
      id: "mrsl-3",
      materialRequestId: "req-6",
      supplierId: "sup-logipack",
      quantity: 20,
      unitPrice: 1.3,
      numeroPedido: "PED-DEMO-0006",
      numeroSeguimiento: "SEG-000456",
      orderId: "order-3",
      createdAt: daysAgo(24),
    },
    {
      id: "mrsl-4",
      materialRequestId: "req-7",
      supplierId: "sup-papeleria",
      quantity: 15,
      unitPrice: 4.2,
      numeroPedido: "PED-DEMO-0007",
      numeroSeguimiento: "SEG-000789",
      orderId: "order-4",
      createdAt: daysAgo(14),
    },
    {
      id: "mrsl-5",
      materialRequestId: "req-9",
      supplierId: "sup-ebro",
      quantity: 4,
      unitPrice: 9.5,
      numeroPedido: null,
      numeroSeguimiento: null,
      orderId: "order-5",
      createdAt: daysAgo(39),
    },
  ];

  const internalReplenishments: DbInternalReplenishment[] = [
    {
      id: "ir-1",
      productId: "prod-1004",
      quantityRequired: 100,
      location: "Almacén A - Estante 1",
      status: "APROBADA",
      currentQuantitySnapshot: 60,
      minimumQuantitySnapshot: 80,
      numeroPedido: null,
      numeroSeguimiento: null,
      requestedAt: daysAgo(3),
      completedAt: null,
    },
    {
      id: "ir-2",
      productId: "prod-1010",
      quantityRequired: 20,
      location: "Almacén A - Estante 4",
      status: "DERIVADA_COMPRA",
      currentQuantitySnapshot: 12,
      minimumQuantitySnapshot: 15,
      numeroPedido: null,
      numeroSeguimiento: null,
      requestedAt: daysAgo(12),
      completedAt: null,
    },
    {
      id: "ir-3",
      productId: "prod-1009",
      quantityRequired: 30,
      location: "Almacén B - Estante 1",
      status: "ENTREGADO",
      currentQuantitySnapshot: 25,
      minimumQuantitySnapshot: 15,
      numeroPedido: "PED-DEMO-0009",
      numeroSeguimiento: "SEG-000999",
      requestedAt: daysAgo(18),
      completedAt: daysAgo(1),
    },
  ];

  const replenishmentSupplierLines: DbReplenishmentSupplierLine[] = [
    {
      id: "rsl-1",
      replenishmentId: "ir-2",
      supplierId: "sup-epi",
      quantity: 20,
      unitPrice: 11.4,
      orderId: "order-6",
      createdAt: daysAgo(12),
    },
    {
      id: "rsl-2",
      replenishmentId: "ir-3",
      supplierId: "sup-ebro",
      quantity: 30,
      unitPrice: 9.1,
      orderId: "order-7",
      createdAt: daysAgo(18),
    },
  ];

  const orders: DbOrder[] = [
    {
      id: "order-1",
      orderNumber: "PED-DEMO-0004",
      trackingNumber: null,
      supplierId: "sup-epi",
      status: "PENDIENTE",
      estimatedDeliveryDate: null,
      deliveredAt: null,
      createdAt: daysAgo(8),
      updatedAt: daysAgo(8),
    },
    {
      id: "order-2",
      orderNumber: "PED-DEMO-0005",
      trackingNumber: "SEG-000123",
      supplierId: "sup-papeleria",
      status: "ENVIADO",
      estimatedDeliveryDate: daysAgo(-3),
      deliveredAt: null,
      createdAt: daysAgo(19),
      updatedAt: daysAgo(16),
    },
    {
      id: "order-3",
      orderNumber: "PED-DEMO-0006",
      trackingNumber: "SEG-000456",
      supplierId: "sup-logipack",
      status: "EN_TRANSITO",
      estimatedDeliveryDate: daysAgo(-1),
      deliveredAt: null,
      createdAt: daysAgo(24),
      updatedAt: daysAgo(19),
    },
    {
      id: "order-4",
      orderNumber: "PED-DEMO-0007",
      trackingNumber: "SEG-000789",
      supplierId: "sup-papeleria",
      status: "ENTREGADO",
      estimatedDeliveryDate: daysAgo(3),
      deliveredAt: daysAgo(2),
      createdAt: daysAgo(14),
      updatedAt: daysAgo(2),
    },
    {
      id: "order-5",
      orderNumber: "PED-DEMO-0008",
      trackingNumber: null,
      supplierId: "sup-ebro",
      status: "CANCELADO",
      estimatedDeliveryDate: null,
      deliveredAt: null,
      createdAt: daysAgo(39),
      updatedAt: daysAgo(35),
    },
    {
      id: "order-6",
      orderNumber: "PED-DEMO-0010",
      trackingNumber: null,
      supplierId: "sup-epi",
      status: "PENDIENTE",
      estimatedDeliveryDate: null,
      deliveredAt: null,
      createdAt: daysAgo(12),
      updatedAt: daysAgo(12),
    },
    {
      id: "order-7",
      orderNumber: "PED-DEMO-0009",
      trackingNumber: "SEG-000999",
      supplierId: "sup-ebro",
      status: "ENTREGADO",
      estimatedDeliveryDate: daysAgo(2),
      deliveredAt: daysAgo(1),
      createdAt: daysAgo(18),
      updatedAt: daysAgo(1),
    },
  ];

  const orderItems: DbOrderItem[] = [
    {
      id: "oi-1",
      orderId: "order-1",
      productId: "prod-1001",
      quantityOrdered: 10,
      quantityReceived: 0,
    },
    {
      id: "oi-2",
      orderId: "order-2",
      productId: "prod-1003",
      quantityOrdered: 3,
      quantityReceived: 0,
    },
    {
      id: "oi-3",
      orderId: "order-3",
      productId: "prod-1006",
      quantityOrdered: 20,
      quantityReceived: 0,
    },
    {
      id: "oi-4",
      orderId: "order-4",
      productId: "prod-1002",
      quantityOrdered: 15,
      quantityReceived: 15,
    },
    {
      id: "oi-5",
      orderId: "order-5",
      productId: "prod-1009",
      quantityOrdered: 4,
      quantityReceived: 0,
    },
    {
      id: "oi-6",
      orderId: "order-6",
      productId: "prod-1010",
      quantityOrdered: 20,
      quantityReceived: 0,
    },
    {
      id: "oi-7",
      orderId: "order-7",
      productId: "prod-1009",
      quantityOrdered: 30,
      quantityReceived: 30,
    },
  ];

  const notifications: DbNotification[] = [
    {
      id: "notif-1",
      userId: "u-gestion",
      type: "SOLICITUD_MATERIAL",
      referenceId: "req-1",
      message: 'Nueva solicitud de "Mascarillas quirúrgicas (caja 50 uds)" (x5) de Laura Campos',
      read: false,
      createdAt: daysAgo(2),
    },
    {
      id: "notif-2",
      userId: "u-admin",
      type: "SOLICITUD_MATERIAL",
      referenceId: "req-1",
      message: 'Nueva solicitud de "Mascarillas quirúrgicas (caja 50 uds)" (x5) de Laura Campos',
      read: false,
      createdAt: daysAgo(2),
    },
    {
      id: "notif-3",
      userId: "u-gestion",
      type: "SOLICITUD_MATERIAL",
      referenceId: "req-3",
      message: "Nueva solicitud de \"Monitor 24'' para puesto de oficina\" (x1) de Laura Campos",
      read: false,
      createdAt: daysAgo(1),
    },
    {
      id: "notif-4",
      userId: "u-admin",
      type: "SOLICITUD_MATERIAL",
      referenceId: "req-3",
      message: "Nueva solicitud de \"Monitor 24'' para puesto de oficina\" (x1) de Laura Campos",
      read: true,
      createdAt: daysAgo(1),
    },
    {
      id: "notif-5",
      userId: "u-gestion",
      type: "SOLICITUD_COMPRA",
      referenceId: "req-4",
      message: 'Solicitud de "Guantes de nitrilo (caja 100 uds)" derivada a compra',
      read: true,
      createdAt: daysAgo(8),
    },
    {
      id: "notif-6",
      userId: "u-admin",
      type: "SOLICITUD_COMPRA",
      referenceId: "ir-2",
      message: 'Reposición interna de "Casco de seguridad (EPI)" derivada a compra',
      read: true,
      createdAt: daysAgo(12),
    },
  ];

  return {
    users,
    suppliers,
    products,
    materialRequests,
    materialRequestSupplierLines,
    internalReplenishments,
    replenishmentSupplierLines,
    orders,
    orderItems,
    notifications,
  };
}

// ---------------------------------------------------------
// Persistencia en localStorage
// ---------------------------------------------------------

let store: Store = load();

function load(): Store {
  try {
    const raw = window.localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw) as Store;
  } catch {
    // localStorage corrupto o inaccesible: se sigue con datos de fábrica.
  }
  return seed();
}

function persist() {
  try {
    window.localStorage.setItem(DB_KEY, JSON.stringify(store));
  } catch {
    // Almacenamiento lleno o no disponible (modo privado, etc.): la demo
    // sigue funcionando en memoria durante la sesión aunque no persista.
  }
}

/** Restaura los datos de fábrica de la demo (botón "Restablecer datos"). */
export function resetDemoData() {
  store = seed();
  persist();
  clearSession();
}

// Simula la latencia de una llamada de red real, para que los estados de
// carga de TanStack Query se vean igual que en la app original.
function delay<T>(value: T, ms = 250): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export class NotFoundError extends Error {}
export class ConflictError extends Error {}
export class ValidationError extends Error {}

// ---------------------------------------------------------
// Sesión (sustituye a Supabase Auth)
// ---------------------------------------------------------

export function findUserByCredentials(email: string, password: string): DbUser | null {
  const normalized = email.trim().toLowerCase();
  const user = store.users.find((u) => u.email.toLowerCase() === normalized);
  if (!user || user.password !== password) return null;
  return user;
}

export function getUserById(id: string): DbUser | null {
  return store.users.find((u) => u.id === id) ?? null;
}

export function getSession(): DbUser | null {
  try {
    const id = window.localStorage.getItem(SESSION_KEY);
    return id ? getUserById(id) : null;
  } catch {
    return null;
  }
}

export function setSession(userId: string) {
  try {
    window.localStorage.setItem(SESSION_KEY, userId);
  } catch {
    // Sin persistencia disponible, la sesión solo dura lo que dure la pestaña.
  }
}

export function clearSession() {
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    /* noop */
  }
}

function requireCurrentUser(): DbUser {
  const user = getSession();
  if (!user) throw new Error("No hay sesión activa");
  return user;
}

function isStaff(role: Role): boolean {
  return STAFF.includes(role);
}

// ---------------------------------------------------------
// Proveedores
// ---------------------------------------------------------

export async function listSuppliers(): Promise<DbSupplier[]> {
  return delay([...store.suppliers].sort((a, b) => a.name.localeCompare(b.name)));
}

export async function createSupplierRow(input: {
  name: string;
  phone?: string;
  website?: string;
  email?: string;
}): Promise<DbSupplier> {
  if (!input.name) throw new ValidationError("name es obligatorio");
  const row: DbSupplier = {
    id: uid("sup"),
    name: input.name,
    phone: input.phone ?? null,
    website: input.website ?? null,
    email: input.email ?? null,
    createdAt: new Date().toISOString(),
  };
  store.suppliers.push(row);
  persist();
  return delay(row);
}

export async function updateSupplierRow(
  id: string,
  changes: Partial<{ name: string; phone: string; website: string; email: string }>,
): Promise<DbSupplier> {
  const row = store.suppliers.find((s) => s.id === id);
  if (!row) throw new NotFoundError("Proveedor no encontrado");
  if (changes.name !== undefined) row.name = changes.name;
  if (changes.phone !== undefined) row.phone = changes.phone;
  if (changes.website !== undefined) row.website = changes.website;
  if (changes.email !== undefined) row.email = changes.email;
  persist();
  return delay(row);
}

export async function deleteSupplierRow(id: string): Promise<void> {
  const referenced =
    store.products.some((p) => p.supplierId === id) ||
    store.materialRequestSupplierLines.some((l) => l.supplierId === id) ||
    store.replenishmentSupplierLines.some((l) => l.supplierId === id) ||
    store.orders.some((o) => o.supplierId === id);
  if (referenced) {
    throw new ConflictError(
      "No se puede eliminar: este proveedor tiene productos, solicitudes o pedidos asociados",
    );
  }
  const before = store.suppliers.length;
  store.suppliers = store.suppliers.filter((s) => s.id !== id);
  if (store.suppliers.length === before) throw new NotFoundError("Proveedor no encontrado");
  persist();
  return delay(undefined);
}

// ---------------------------------------------------------
// Productos / Stock
// ---------------------------------------------------------

function syncProductPriceRange(productId: string, unitPrice: number) {
  const product = store.products.find((p) => p.id === productId);
  if (!product) return;

  const nextMin =
    product.minPrice === null || unitPrice < product.minPrice ? unitPrice : product.minPrice;
  const nextMax =
    product.maxPrice === null || unitPrice > product.maxPrice ? unitPrice : product.maxPrice;

  if (nextMin !== product.minPrice || nextMax !== product.maxPrice) {
    product.minPrice = nextMin;
    product.maxPrice = nextMax;
  }
}

export async function listProducts(): Promise<DbProduct[]> {
  return delay([...store.products].sort((a, b) => a.name.localeCompare(b.name)));
}

export async function createProductRow(input: {
  productNumber?: string | null;
  name: string;
  description?: string | null;
  quantity?: number;
  minimumStock?: number;
  supplierId?: string | null;
  location?: string | null;
  imageUrl?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
}): Promise<DbProduct> {
  if (!input.name) throw new ValidationError("name es obligatorio");
  const row: DbProduct = {
    id: uid("prod"),
    productNumber: input.productNumber || null,
    name: input.name,
    description: input.description || null,
    quantity: input.quantity ?? 0,
    minimumStock: input.minimumStock ?? 0,
    location: input.location ?? null,
    imageUrl: input.imageUrl ?? null,
    minPrice: input.minPrice ?? null,
    maxPrice: input.maxPrice ?? null,
    supplierId: input.supplierId || null,
    createdAt: new Date().toISOString(),
  };
  store.products.push(row);
  persist();
  return delay(row);
}

export async function updateProductRow(
  id: string,
  changes: Partial<Omit<DbProduct, "id" | "createdAt">>,
): Promise<DbProduct> {
  const row = store.products.find((p) => p.id === id);
  if (!row) throw new NotFoundError("Producto no encontrado");
  Object.assign(row, changes);
  persist();
  return delay(row);
}

export async function deleteProductRow(id: string): Promise<void> {
  const referenced =
    store.materialRequests.some((r) => r.productId === id) ||
    store.internalReplenishments.some((r) => r.productId === id) ||
    store.orderItems.some((i) => i.productId === id);
  if (referenced) {
    throw new ConflictError(
      "No se puede eliminar: este producto tiene solicitudes, reposiciones o pedidos asociados",
    );
  }
  const before = store.products.length;
  store.products = store.products.filter((p) => p.id !== id);
  if (store.products.length === before) throw new NotFoundError("Producto no encontrado");
  persist();
  return delay(undefined);
}

// ---------------------------------------------------------
// Notificaciones (helper interno, usado al crear/derivar solicitudes)
// ---------------------------------------------------------

function notifyStaff(type: NotificationTypeApi, referenceId: string, message: string) {
  const staffUsers = store.users.filter((u) => isStaff(u.role));
  for (const u of staffUsers) {
    store.notifications.push({
      id: uid("notif"),
      userId: u.id,
      type,
      referenceId,
      message,
      read: false,
      createdAt: new Date().toISOString(),
    });
  }
}

function nextOrderNumber(lineId: string): string {
  return `PED-${Date.now()}-${lineId.slice(0, 4).toUpperCase()}`;
}

// ---------------------------------------------------------
// Solicitudes de material
// ---------------------------------------------------------

function materialRequestProductLabel(request: DbMaterialRequest): string {
  const product = request.productId ? store.products.find((p) => p.id === request.productId) : null;
  return product?.name ?? request.productName ?? "producto";
}

const ORDER_MIRROR_STATUSES = new Set<RequestStatusApi>([
  "ENVIADO",
  "EN_TRANSITO",
  "ENTREGADO",
  "CANCELADO",
]);

function syncLinkedOrdersStatus(
  orderIds: (string | null)[],
  status: RequestStatusApi,
  deliveredAt?: string,
) {
  if (!ORDER_MIRROR_STATUSES.has(status)) return;
  const ids = orderIds.filter((id): id is string => Boolean(id));
  if (ids.length === 0) return;
  for (const order of store.orders) {
    if (!ids.includes(order.id)) continue;
    order.status = status as OrderStatusApi;
    order.updatedAt = new Date().toISOString();
    if (status === "ENTREGADO") order.deliveredAt = deliveredAt ?? new Date().toISOString();
  }
}

/**
 * Deriva una solicitud a compra: la pasa a DERIVADA_COMPRA (solo si venía de
 * APROBADA) y genera un pedido por cada línea de proveedor que aún no
 * tenga uno. El aviso a gestión solo se dispara la primera vez.
 */
function deriveMaterialRequestToCompra(requestId: string, actorId: string) {
  const request = store.materialRequests.find((r) => r.id === requestId);
  if (!request) return;
  if (request.status !== "APROBADA" && request.status !== "DERIVADA_COMPRA") return;

  const isFirstDerivation = request.status === "APROBADA";
  if (isFirstDerivation) {
    request.status = "DERIVADA_COMPRA";
    request.handledById = actorId;
    request.updatedAt = new Date().toISOString();
  }

  if (request.productId) {
    const lines = store.materialRequestSupplierLines.filter(
      (l) => l.materialRequestId === requestId,
    );
    for (const line of lines) {
      if (line.orderId) continue;
      const order: DbOrder = {
        id: uid("order"),
        orderNumber: nextOrderNumber(line.id),
        trackingNumber: null,
        supplierId: line.supplierId,
        status: "PENDIENTE",
        estimatedDeliveryDate: null,
        deliveredAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      store.orders.push(order);
      store.orderItems.push({
        id: uid("oi"),
        orderId: order.id,
        productId: request.productId,
        quantityOrdered: line.quantity,
        quantityReceived: 0,
      });
      line.orderId = order.id;
    }
  }

  if (isFirstDerivation) {
    const label = materialRequestProductLabel(request);
    notifyStaff("SOLICITUD_COMPRA", request.id, `Solicitud de "${label}" derivada a compra`);
  }
}

export interface HydratedSupplierLine extends DbMaterialRequestSupplierLine {
  supplier: DbSupplier;
}

export interface HydratedMaterialRequest extends DbMaterialRequest {
  product: DbProduct | null;
  requester: DbUser;
  supplierLines: HydratedSupplierLine[];
}

function hydrateSupplierLine(line: DbMaterialRequestSupplierLine): HydratedSupplierLine {
  const supplier = store.suppliers.find((s) => s.id === line.supplierId);
  if (!supplier) throw new Error("Proveedor de la línea no encontrado");
  return { ...line, supplier };
}

function hydrateReplenishmentLine(
  line: DbReplenishmentSupplierLine,
): DbReplenishmentSupplierLine & { supplier: DbSupplier } {
  const supplier = store.suppliers.find((s) => s.id === line.supplierId);
  if (!supplier) throw new Error("Proveedor de la línea no encontrado");
  return { ...line, supplier };
}

function hydrateMaterialRequest(request: DbMaterialRequest): HydratedMaterialRequest {
  const product = request.productId
    ? (store.products.find((p) => p.id === request.productId) ?? null)
    : null;
  const requester = store.users.find((u) => u.id === request.requesterId);
  if (!requester) throw new Error("Solicitante no encontrado");
  const supplierLines = store.materialRequestSupplierLines
    .filter((l) => l.materialRequestId === request.id)
    .map(hydrateSupplierLine);
  return { ...request, product, requester, supplierLines };
}

/** Un SOLICITANTE solo ve sus propias solicitudes; GESTION/ADMIN las ve todas. */
export async function listMaterialRequests(): Promise<HydratedMaterialRequest[]> {
  const user = requireCurrentUser();
  const rows = isStaff(user.role)
    ? store.materialRequests
    : store.materialRequests.filter((r) => r.requesterId === user.id);
  const sorted = [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return delay(sorted.map(hydrateMaterialRequest));
}

export async function createMaterialRequestRow(input: {
  productId?: string;
  productName?: string;
  productLink?: string;
  department: DepartmentApi;
  quantity: number;
  message?: string;
}): Promise<HydratedMaterialRequest> {
  const user = requireCurrentUser();
  if (!input.quantity || !input.department) {
    throw new ValidationError("quantity y department son obligatorios");
  }
  if (!input.productId && !input.productName) {
    throw new ValidationError("Indica un producto existente o el nombre de uno nuevo");
  }
  if (!input.productId && !input.productLink) {
    throw new ValidationError("Si el producto no existe en stock, indica un enlace");
  }

  const now = new Date().toISOString();
  const row: DbMaterialRequest = {
    id: uid("req"),
    productId: input.productId || null,
    productName: input.productId ? null : (input.productName ?? null),
    productLink: input.productId ? null : (input.productLink ?? null),
    department: input.department,
    requesterId: user.id,
    quantity: input.quantity,
    status: "PENDIENTE",
    message: input.message ?? null,
    handledById: null,
    numeroPedido: null,
    numeroSeguimiento: null,
    numeroReferenciaFactura: null,
    approvedAt: null,
    deliveredAt: null,
    createdAt: now,
    updatedAt: now,
  };
  store.materialRequests.push(row);
  persist();

  const label = materialRequestProductLabel(row);
  notifyStaff(
    "SOLICITUD_MATERIAL",
    row.id,
    `Nueva solicitud de "${label}" (x${row.quantity}) de ${user.name}`,
  );
  persist();

  return delay(hydrateMaterialRequest(row));
}

export async function updateMaterialRequestRow(
  id: string,
  changes: Partial<{
    status: RequestStatusApi;
    numeroPedido: string;
    numeroSeguimiento: string;
    numeroReferenciaFactura: string;
    deliveredAt: string;
  }>,
): Promise<HydratedMaterialRequest> {
  const user = requireCurrentUser();
  const row = store.materialRequests.find((r) => r.id === id);
  if (!row) throw new NotFoundError("Solicitud no encontrada");

  let effectiveDeliveredAt: string | undefined;
  if (changes.status !== undefined) {
    row.status = changes.status;
    row.handledById = user.id;
    if (changes.status === "APROBADA") row.approvedAt = new Date().toISOString();
    if (changes.status === "ENTREGADO") {
      effectiveDeliveredAt = changes.deliveredAt
        ? new Date(changes.deliveredAt).toISOString()
        : new Date().toISOString();
      row.deliveredAt = effectiveDeliveredAt;
    }
  }
  if (changes.numeroPedido !== undefined) row.numeroPedido = changes.numeroPedido;
  if (changes.numeroSeguimiento !== undefined) row.numeroSeguimiento = changes.numeroSeguimiento;
  if (changes.numeroReferenciaFactura !== undefined)
    row.numeroReferenciaFactura = changes.numeroReferenciaFactura;
  row.updatedAt = new Date().toISOString();

  if (changes.status === "DERIVADA_COMPRA") {
    deriveMaterialRequestToCompra(id, user.id);
  }

  const lineOrderIds = store.materialRequestSupplierLines
    .filter((l) => l.materialRequestId === id)
    .map((l) => l.orderId);
  if (changes.status) syncLinkedOrdersStatus(lineOrderIds, changes.status, effectiveDeliveredAt);

  persist();
  return delay(hydrateMaterialRequest(row));
}

export async function addMaterialRequestSupplierLineRow(
  requestId: string,
  line: { supplierId: string; quantity: number; unitPrice: number },
): Promise<HydratedSupplierLine> {
  const user = requireCurrentUser();
  if (!line.supplierId || !line.quantity || line.unitPrice === undefined) {
    throw new ValidationError("supplierId, quantity y unitPrice son obligatorios");
  }
  const request = store.materialRequests.find((r) => r.id === requestId);
  if (!request) throw new NotFoundError("Solicitud no encontrada");

  const row: DbMaterialRequestSupplierLine = {
    id: uid("mrsl"),
    materialRequestId: requestId,
    supplierId: line.supplierId,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    numeroPedido: null,
    numeroSeguimiento: null,
    orderId: null,
    createdAt: new Date().toISOString(),
  };
  store.materialRequestSupplierLines.push(row);

  if (request.productId) syncProductPriceRange(request.productId, line.unitPrice);
  deriveMaterialRequestToCompra(requestId, user.id);
  persist();

  return delay(hydrateSupplierLine(row));
}

export async function removeMaterialRequestSupplierLineRow(lineId: string): Promise<void> {
  const before = store.materialRequestSupplierLines.length;
  store.materialRequestSupplierLines = store.materialRequestSupplierLines.filter(
    (l) => l.id !== lineId,
  );
  if (store.materialRequestSupplierLines.length === before)
    throw new NotFoundError("Línea no encontrada");
  persist();
  return delay(undefined);
}

// ---------------------------------------------------------
// Reposición interna
// ---------------------------------------------------------

export interface HydratedInternalReplenishment extends DbInternalReplenishment {
  product: DbProduct;
  supplierLines: (DbReplenishmentSupplierLine & { supplier: DbSupplier })[];
}

function hydrateReplenishment(row: DbInternalReplenishment): HydratedInternalReplenishment {
  const product = store.products.find((p) => p.id === row.productId);
  if (!product) throw new Error("Producto de la reposición no encontrado");
  const supplierLines = store.replenishmentSupplierLines
    .filter((l) => l.replenishmentId === row.id)
    .map(hydrateReplenishmentLine);
  return { ...row, product, supplierLines };
}

function deriveReplenishmentToCompra(replenishmentId: string) {
  const replenishment = store.internalReplenishments.find((r) => r.id === replenishmentId);
  if (!replenishment) return;
  if (replenishment.status !== "APROBADA" && replenishment.status !== "DERIVADA_COMPRA") return;

  const isFirstDerivation = replenishment.status === "APROBADA";
  if (isFirstDerivation) replenishment.status = "DERIVADA_COMPRA";

  const lines = store.replenishmentSupplierLines.filter(
    (l) => l.replenishmentId === replenishmentId,
  );
  for (const line of lines) {
    if (line.orderId) continue;
    const order: DbOrder = {
      id: uid("order"),
      orderNumber: nextOrderNumber(line.id),
      trackingNumber: null,
      supplierId: line.supplierId,
      status: "PENDIENTE",
      estimatedDeliveryDate: null,
      deliveredAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.orders.push(order);
    store.orderItems.push({
      id: uid("oi"),
      orderId: order.id,
      productId: replenishment.productId,
      quantityOrdered: line.quantity,
      quantityReceived: 0,
    });
    line.orderId = order.id;
  }

  if (isFirstDerivation) {
    const product = store.products.find((p) => p.id === replenishment.productId);
    notifyStaff(
      "SOLICITUD_COMPRA",
      replenishment.id,
      `Reposición interna de "${product?.name ?? "producto"}" derivada a compra`,
    );
  }
}

export async function listInternalReplenishments(): Promise<HydratedInternalReplenishment[]> {
  const sorted = [...store.internalReplenishments].sort((a, b) =>
    b.requestedAt.localeCompare(a.requestedAt),
  );
  return delay(sorted.map(hydrateReplenishment));
}

export async function createInternalReplenishmentRow(input: {
  productId: string;
  quantityRequired: number;
  location: string;
}): Promise<HydratedInternalReplenishment> {
  if (!input.productId || !input.quantityRequired || !input.location) {
    throw new ValidationError("productId, quantityRequired y location son obligatorios");
  }
  const product = store.products.find((p) => p.id === input.productId);
  if (!product) throw new NotFoundError("Producto no encontrado");

  const row: DbInternalReplenishment = {
    id: uid("ir"),
    productId: input.productId,
    quantityRequired: input.quantityRequired,
    location: input.location,
    currentQuantitySnapshot: product.quantity,
    minimumQuantitySnapshot: product.minimumStock,
    status: "APROBADA",
    numeroPedido: null,
    numeroSeguimiento: null,
    requestedAt: new Date().toISOString(),
    completedAt: null,
  };
  store.internalReplenishments.push(row);
  persist();
  return delay(hydrateReplenishment(row));
}

export async function updateInternalReplenishmentRow(
  id: string,
  changes: Partial<{ status: RequestStatusApi; numeroPedido: string; numeroSeguimiento: string }>,
): Promise<HydratedInternalReplenishment> {
  const row = store.internalReplenishments.find((r) => r.id === id);
  if (!row) throw new NotFoundError("Reposición no encontrada");

  let effectiveCompletedAt: string | undefined;
  if (changes.status !== undefined) {
    row.status = changes.status;
    if (changes.status === "ENTREGADO") {
      effectiveCompletedAt = new Date().toISOString();
      row.completedAt = effectiveCompletedAt;
    }
  }
  if (changes.numeroPedido !== undefined) row.numeroPedido = changes.numeroPedido;
  if (changes.numeroSeguimiento !== undefined) row.numeroSeguimiento = changes.numeroSeguimiento;

  if (changes.status === "DERIVADA_COMPRA") deriveReplenishmentToCompra(id);

  const lineOrderIds = store.replenishmentSupplierLines
    .filter((l) => l.replenishmentId === id)
    .map((l) => l.orderId);
  if (changes.status) syncLinkedOrdersStatus(lineOrderIds, changes.status, effectiveCompletedAt);

  persist();
  return delay(hydrateReplenishment(row));
}

export async function deleteInternalReplenishmentRow(id: string): Promise<void> {
  const before = store.internalReplenishments.length;
  store.internalReplenishments = store.internalReplenishments.filter((r) => r.id !== id);
  store.replenishmentSupplierLines = store.replenishmentSupplierLines.filter(
    (l) => l.replenishmentId !== id,
  );
  if (store.internalReplenishments.length === before)
    throw new NotFoundError("Reposición no encontrada");
  persist();
  return delay(undefined);
}

export async function addReplenishmentSupplierLineRow(
  replenishmentId: string,
  line: { supplierId: string; quantity: number; unitPrice: number },
): Promise<DbReplenishmentSupplierLine & { supplier: DbSupplier }> {
  if (!line.supplierId || !line.quantity || line.unitPrice === undefined) {
    throw new ValidationError("supplierId, quantity y unitPrice son obligatorios");
  }
  const replenishment = store.internalReplenishments.find((r) => r.id === replenishmentId);
  if (!replenishment) throw new NotFoundError("Reposición no encontrada");

  const row: DbReplenishmentSupplierLine = {
    id: uid("rsl"),
    replenishmentId,
    supplierId: line.supplierId,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    orderId: null,
    createdAt: new Date().toISOString(),
  };
  store.replenishmentSupplierLines.push(row);

  syncProductPriceRange(replenishment.productId, line.unitPrice);
  deriveReplenishmentToCompra(replenishmentId);
  persist();

  return delay(hydrateReplenishmentLine(row));
}

export async function removeReplenishmentSupplierLineRow(lineId: string): Promise<void> {
  const before = store.replenishmentSupplierLines.length;
  store.replenishmentSupplierLines = store.replenishmentSupplierLines.filter(
    (l) => l.id !== lineId,
  );
  if (store.replenishmentSupplierLines.length === before)
    throw new NotFoundError("Línea no encontrada");
  persist();
  return delay(undefined);
}

// ---------------------------------------------------------
// Pedidos
// ---------------------------------------------------------

export interface HydratedOrder extends DbOrder {
  supplier: DbSupplier;
  items: (DbOrderItem & { product: DbProduct })[];
}

function hydrateOrder(row: DbOrder): HydratedOrder {
  const supplier = store.suppliers.find((s) => s.id === row.supplierId);
  if (!supplier) throw new Error("Proveedor del pedido no encontrado");
  const items = store.orderItems
    .filter((i) => i.orderId === row.id)
    .map((i) => {
      const product = store.products.find((p) => p.id === i.productId);
      if (!product) throw new Error("Producto del pedido no encontrado");
      return { ...i, product };
    });
  return { ...row, supplier, items };
}

export async function listOrders(): Promise<HydratedOrder[]> {
  const sorted = [...store.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return delay(sorted.map(hydrateOrder));
}

// ---------------------------------------------------------
// Notificaciones
// ---------------------------------------------------------

export async function listNotifications(): Promise<DbNotification[]> {
  const user = requireCurrentUser();
  const sorted = store.notifications
    .filter((n) => n.userId === user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return delay(sorted);
}

export async function markNotificationReadRow(id: string): Promise<DbNotification> {
  const user = requireCurrentUser();
  const row = store.notifications.find((n) => n.id === id && n.userId === user.id);
  if (!row) throw new NotFoundError("Notificación no encontrada");
  row.read = true;
  persist();
  return delay(row);
}

export async function markAllNotificationsReadRow(): Promise<void> {
  const user = requireCurrentUser();
  for (const n of store.notifications) {
    if (n.userId === user.id) n.read = true;
  }
  persist();
  return delay(undefined);
}
