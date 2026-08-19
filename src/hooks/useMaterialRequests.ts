import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchMaterialRequests,
  createMaterialRequest,
  updateMaterialRequestApi,
  addMaterialRequestSupplierLine,
  removeMaterialRequestSupplierLine,
} from "@/lib/api";

export function useMaterialRequestsQuery() {
  return useQuery({ queryKey: ["material-requests"], queryFn: fetchMaterialRequests });
}

export function useCreateMaterialRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createMaterialRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material-requests"] });
      // El backend avisa a gestión con una notificación al crear la solicitud.
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useUpdateMaterialRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: Parameters<typeof updateMaterialRequestApi>[1] }) =>
      updateMaterialRequestApi(id, changes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material-requests"] });
      // Al pasar a "Derivada a compra" el backend genera pedidos y avisa
      // a gestión; refrescamos ambas por si el cambio de estado fue ese.
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useAddMaterialRequestSupplierLine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      requestId,
      line,
    }: {
      requestId: string;
      line: Parameters<typeof addMaterialRequestSupplierLine>[1];
    }) => addMaterialRequestSupplierLine(requestId, line),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material-requests"] });
      // El backend amplía minPrice/maxPrice del producto al registrar la línea.
      queryClient.invalidateQueries({ queryKey: ["products"] });
      // Asignar un proveedor deriva la solicitud a compra y genera su
      // pedido automáticamente (ver deriveMaterialRequestToCompra en el backend).
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useRemoveMaterialRequestSupplierLine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, lineId }: { requestId: string; lineId: string }) =>
      removeMaterialRequestSupplierLine(requestId, lineId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["material-requests"] }),
  });
}
