import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchInternalReplenishments,
  createInternalReplenishment,
  updateInternalReplenishmentApi,
  deleteInternalReplenishment,
  addReplenishmentSupplierLine,
  removeReplenishmentSupplierLine,
} from "@/lib/api";

export function useInternalReplenishmentsQuery() {
  return useQuery({ queryKey: ["internal-replenishments"], queryFn: fetchInternalReplenishments });
}

export function useCreateInternalReplenishment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createInternalReplenishment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["internal-replenishments"] }),
  });
}

export function useUpdateInternalReplenishment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changes,
    }: {
      id: string;
      changes: Parameters<typeof updateInternalReplenishmentApi>[1];
    }) => updateInternalReplenishmentApi(id, changes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["internal-replenishments"] });
      // Al pasar a "Derivada a compra" el backend genera pedidos y avisa
      // a gestión; refrescamos ambas por si el cambio de estado fue ese.
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useDeleteInternalReplenishment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteInternalReplenishment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["internal-replenishments"] }),
  });
}

export function useAddReplenishmentSupplierLine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      replenishmentId,
      line,
    }: {
      replenishmentId: string;
      line: Parameters<typeof addReplenishmentSupplierLine>[1];
    }) => addReplenishmentSupplierLine(replenishmentId, line),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["internal-replenishments"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      // Asignar un proveedor deriva la reposición a compra y genera su
      // pedido automáticamente (ver deriveReplenishmentToCompra en el backend).
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useRemoveReplenishmentSupplierLine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ replenishmentId, lineId }: { replenishmentId: string; lineId: string }) =>
      removeReplenishmentSupplierLine(replenishmentId, lineId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["internal-replenishments"] }),
  });
}
