export interface OrderItem {
  id: string;
  title: string;
  quantity: number;
  price: number;
}

export interface OrderClient {
  name: string;
  phone: string;
}

export interface AdminOrderRecord {
  id: string;
  status: 'pending' | 'approved' | 'discarded' | string;
  created_at: string;
  delivery_type?: 'pickup' | 'delivery' | string;
  delivery?: { method?: string };
  payment_method: string;
  totalUSD: number;
  client: OrderClient;
  customer_name?: string;
  customer_phone?: string;
  items: OrderItem[];
  [key: string]: unknown;
}

export type OrderStatusFilter = 'all' | 'pending' | 'approved';
export type OrderDeliveryFilter = 'all' | 'pickup' | 'delivery';
export type OrderDateFilter = 'today' | 'last_7_days' | 'all';

export interface BoxSummary {
  total: number;
  count: number;
  pago_movil: number;
  transferencia: number;
  zelle: number;
  binance: number;
  efectivo: number;
  [key: string]: number;
}
