import { useQuery } from "@tanstack/react-query";
import { fetchOrders } from "@/lib/api";

// Los pedidos son solo lectura desde el frontend: se generan
// automáticamente en el backend al derivar una solicitud a compra.
export function useOrdersQuery() {
  return useQuery({ queryKey: ["orders"], queryFn: fetchOrders });
}
