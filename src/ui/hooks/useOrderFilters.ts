import { useState, useMemo } from 'react';
import type { 
  AdminOrderRecord, 
  OrderStatusFilter, 
  OrderDeliveryFilter, 
  OrderDateFilter 
} from '@ui/pages/admin/orders/orderTypes';

export function useOrderFilters(orders: AdminOrderRecord[], pendingApproval: string | null) {
  const [filter, setFilter] = useState<OrderStatusFilter>('all');
  const [filterDelivery, setFilterDelivery] = useState<OrderDeliveryFilter>('all');
  const [filterDate, setFilterDate] = useState<OrderDateFilter>('today');
  const [searchQuery, setSearchQuery] = useState('');

  const visibleOrders = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    
    return orders.filter(o => {
      // 1. Status Filter
      if (filter === 'pending') {
        if (o.status !== 'pending' || pendingApproval === o.id) return false;
      } else if (filter === 'approved') {
        if (o.status !== 'approved' && pendingApproval !== o.id) return false;
      }

      // 2. Delivery Filter
      const delivery = o.delivery_type || o.delivery?.method;
      if (filterDelivery !== 'all' && delivery !== filterDelivery) return false;

      // 3. Date Filter
      if (filterDate !== 'all') {
        const orderDate = new Date(o.created_at);
        const today = new Date();
        if (filterDate === 'today') {
          if (orderDate.toDateString() !== today.toDateString()) return false;
        } else if (filterDate === 'last_7_days') {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(today.getDate() - 7);
          if (orderDate < sevenDaysAgo) return false;
        }
      }

      // 4. Search Query
      if (term) {
        const idLower = o.id.toLowerCase();
        const nameLower = (o.customer_name || o.client?.name || '').toLowerCase();
        const phoneLower = (o.customer_phone || o.client?.phone || '').toLowerCase();
        
        if (!idLower.includes(term) && !nameLower.includes(term) && !phoneLower.includes(term)) {
          return false;
        }
      }

      return true;
    });
  }, [orders, filter, filterDelivery, filterDate, searchQuery, pendingApproval]);

  return {
    filter,
    setFilter,
    filterDelivery,
    setFilterDelivery,
    filterDate,
    setFilterDate,
    searchQuery,
    setSearchQuery,
    visibleOrders,
  };
}
