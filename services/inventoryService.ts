import { supabase } from './supabase';
import { InventoryItem, Warehouse } from '../types';

export const inventoryService = {
    // Get all warehouses
    async getWarehouses(): Promise<Warehouse[]> {
        const { data, error } = await supabase
            .from('bodegas')
            .select('*')
            .order('nombre');

        if (error) throw error;
        return data || [];
    },

    // Get inventory with details (Client, DO, Product)
    async getInventory(filters?: { clientId?: string; warehouseId?: string, search?: string }) {
        let query = supabase
            .from('inventario')
            .select(`
        *,
        bodega:bodegas(nombre),
        d_orden:d_ordenes(
          do_code,
          producto,
          bl_no,
          cliente:client_id_entidad(nombre)
        )
      `)
            .gt('cantidad_bultos', 0); // Only show positive stock by default

        if (filters?.warehouseId) {
            query = query.eq('bodega_id', filters.warehouseId);
        }

        // Note: Deep filtering on related tables (like d_orden.client_id_entidad) is complex in simple query builders.
        // For this MVP, we might filter client client-side or use a more specific RPC later if needed.
        // However, if we need strict filtering, we can check if PostgREST supports it (it does with !inner).
        // Let's try to filter by client ID if provided.

        const { data, error } = await query;
        if (error) throw error;

        // Client-side filtering for search/client (if deep filter fails or is too complex for now)
        let result = data as any[];

        if (filters?.clientId) {
            result = result.filter(item => item.d_orden?.cliente?.id === filters.clientId);
        }

        if (filters?.search) {
            const search = filters.search.toLowerCase();
            result = result.filter(item =>
                item.d_orden?.do_code?.toLowerCase().includes(search) ||
                item.d_orden?.producto?.toLowerCase().includes(search) ||
                item.d_orden?.cliente?.nombre?.toLowerCase().includes(search)
            );
        }

        return result;
    }
};
