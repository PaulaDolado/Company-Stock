# Company Stock

Dashboard de gestión de stock: usuarios, solicitudes de material, reposición
interna, proveedores y pedidos.

🔗 **Demo en vivo:** https://pauladolado.github.io/Company-Stock/

> **Proyecto de portfolio.** Es una adaptación de una aplicación real que
> desarrollé para gestionar el almacén de una empresa, con el nombre y los
> datos completamente sustituidos por una empresa y un catálogo ficticios.
> No tiene backend: toda la persistencia es local (`localStorage`) y los
> datos de partida (proveedores, productos, solicitudes, pedidos...) son
> de muestra.

## Demo

```sh
npm install
npm run dev
```

En el login hay tres cuentas de prueba (contraseña `demo1234` para las tres):

| Rol | Correo |
|---|---|
| Administración | `admin@companystock.demo` |
| Gestión | `gestion@companystock.demo` |
| Solicitante | `solicitante@companystock.demo` |

Desde el menú lateral (icono junto a "Cerrar sesión") se pueden restablecer
los datos de la demo a su estado inicial en cualquier momento.

## Qué muestra esta demo

- **Stock**: catálogo de productos con proveedor, ubicación, stock mínimo y
  rango de precio.
- **Solicitudes de material**: flujo completo con máquina de estados
  (Pendiente → Aprobada → Derivada a compra → Enviado → En tránsito →
  Entregado, con Rechazado/Cancelado como salidas alternativas), reparto
  entre varios proveedores y generación automática de pedidos.
- **Reposición interna**: mismo flujo que las solicitudes, pensado para que
  el propio almacén reponga stock por debajo del mínimo.
- **Proveedores** y **Pedidos**: CRUD de proveedores y seguimiento de los
  pedidos generados a partir de solicitudes/reposiciones.
- **Notificaciones** y **roles**: el rol `SOLICITANTE` solo ve sus propias
  solicitudes; `GESTION`/`ADMIN` gestionan todo lo demás y reciben
  notificaciones al entrar nuevas solicitudes o derivarse a compra.

## Stack

React 19 + Vite + React Router + TanStack Query + Tailwind CSS v4 +
shadcn/ui (Radix) + React Hook Form + Zod.

## Sobre los datos y la "API" local

No hay servidor: [`src/lib/mock-db.ts`](src/lib/mock-db.ts) hace de base de
datos en memoria (persistida en `localStorage`) y reproduce las reglas de
negocio que en el proyecto original vivían en un backend real (derivar una
solicitud a compra, generar pedidos, sincronizar estados, notificar a
gestión...). [`src/lib/api.ts`](src/lib/api.ts) expone exactamente las
mismas funciones que antes hacían `fetch` a ese backend, así que el resto de
la app (hooks en `src/hooks/`, páginas en `src/pages/`) no sabe ni le
importa que los datos son locales.

La autenticación ([`src/lib/auth.tsx`](src/lib/auth.tsx)) sigue el mismo
patrón: sustituye a lo que en el proyecto original era un proveedor de
autenticación externo por una sesión local simple, con las cuentas de
prueba de más arriba.

## Build de producción

```sh
npm run build
npm run preview
```

`npm run build` genera un `dist/` con `index.html` + assets estáticos,
desplegable en cualquier hosting estático (Netlify, Vercel, GitHub Pages,
etc.). Al ser una SPA con rutas de cliente, configura el hosting para
servir `index.html` en cualquier ruta no encontrada (fallback SPA /
"rewrite a index.html").

### GitHub Pages

El repo se despliega solo, vía [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):
cada push a `main` compila el proyecto y publica `dist/` en GitHub Pages.
`npm run build:pages` (el script que usa ese workflow, no `npm run build`)
hace dos ajustes que solo hacen falta para Pages, no para el resto de
hostings:

- Fija la ruta base de Vite a `/Company-Stock/` (variable `GITHUB_PAGES`,
  ver [`vite.config.ts`](vite.config.ts)), porque Pages sirve el proyecto en
  una subruta del dominio, no en la raíz.
- Copia `index.html` a `404.html` tras el build: GitHub Pages no soporta
  rewrites de servidor, así que cualquier ruta de React Router que no
  exista como archivo real (p. ej. `/stock` al recargar la página) cae en
  su `404.html`, que al ser una copia de `index.html` deja que React
  Router monte la ruta correcta en el cliente.

## Estructura

- `src/main.tsx` — punto de entrada: monta React, `BrowserRouter`,
  `QueryClientProvider`, `AuthProvider` y el `Toaster`.
- `src/AppRoutes.tsx` — árbol de rutas con `react-router-dom`.
- `src/pages/` — una página por ruta (Dashboard, Login, Stock, Solicitudes,
  Reposición Interna, Proveedores, Pedidos, Notificaciones).
- `src/components/` — `AppShell`, `AppSidebar` y componentes de UI
  (shadcn/ui).
- `src/data/mock.ts` — tipos de dominio compartidos y lógica de la máquina
  de estados (no contiene datos de muestra, solo tipos/funciones puras).
- `src/lib/mock-db.ts` — "base de datos" local con los datos de muestra y
  las reglas de negocio.
- `src/lib/api.ts` — capa de datos que consumen los hooks, sobre
  `mock-db.ts`.
- `src/lib/auth.tsx` — autenticación de ejemplo (usuarios y contraseña
  fijos, sesión en `localStorage`).
