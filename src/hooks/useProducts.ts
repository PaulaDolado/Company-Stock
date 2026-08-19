import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchProducts, createProduct, updateProductApi, deleteProductApi } from "@/lib/api";

export function useProductsQuery() {
  return useQuery({ queryKey: ["products"], queryFn: fetchProducts });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: Parameters<typeof updateProductApi>[1] }) =>
      updateProductApi(id, changes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteProductApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });
}
