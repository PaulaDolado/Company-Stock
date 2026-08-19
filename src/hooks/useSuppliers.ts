import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchSuppliers, createSupplier, updateSupplierApi, deleteSupplierApi } from "@/lib/api";

export function useSuppliersQuery() {
  return useQuery({ queryKey: ["suppliers"], queryFn: fetchSuppliers });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSupplier,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: Parameters<typeof updateSupplierApi>[1] }) =>
      updateSupplierApi(id, changes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      // El nombre del proveedor se muestra desnormalizado en Stock (Product.supplier.name).
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSupplierApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
  });
}
