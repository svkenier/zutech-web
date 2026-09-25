import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '@core/api/client';
import type { BaseRecord } from '@core/types/record';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

export interface CartRef {
  id: string;
  quantity: number;
}

export interface CartItem {
  id: string;
  title: string;
  price: number;
  brand: string;
  image: string;
  quantity: number;
  inStock: boolean;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity' | 'inStock'>, quantity?: number) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  removeUnavailableItems: () => void;
  totalItems: number;
  subtotal: number;
  canCheckout: boolean;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartRefs, setCartRefs] = useState<CartRef[]>(() => {
    try {
      const saved = localStorage.getItem('zutech_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Sincronizar con catálogo activo
  const { data: productsData } = useQuery<{ records: BaseRecord[] }>({
    queryKey: ['public-products'],
    queryFn: async () => {
      const res = await get<BaseRecord[] | { records: BaseRecord[] }>(`/public/products?t=${Date.now()}`);
      if (Array.isArray(res)) return { records: res };
      return res;
    },
    staleTime: 30000, // 30s
    enabled: cartRefs.length > 0 || isCartOpen, // Solo cargar si hay items o se abre el carrito
  });

  // Guardar refs en localStorage
  useEffect(() => {
    localStorage.setItem('zutech_cart', JSON.stringify(cartRefs));
  }, [cartRefs]);

  // Derivar estado enriquecido y limpiar eliminados
  const enrichedCartItems = useMemo(() => {
    if (!productsData?.records) {
      // Si aún no carga, retornamos un array vacío o podríamos retornar un placeholder
      // pero para evitar bugs visuales, simplemente filtramos si no hay data.
      return [];
    }

    const productsMap = new Map(productsData.records.map(p => [p.id, p]));
    const validItems: CartItem[] = [];
    let hasDeletedItems = false;

    for (const ref of cartRefs) {
      const product = productsMap.get(ref.id);
      if (product) {
        validItems.push({
          id: ref.id,
          title: product.title,
          price: Number(product.attributes?.price) || 0,
          brand: (product.attributes?.brand as string) || '',
          image: product.main_image || '',
          quantity: ref.quantity,
          inStock: Boolean(product.attributes?.in_stock)
        });
      } else {
        hasDeletedItems = true;
      }
    }

    // Limpieza silenciosa de IDs que ya no existen
    if (hasDeletedItems) {
      setTimeout(() => {
        setCartRefs(prev => prev.filter(r => productsMap.has(r.id)));
        setToastMsg('Algunos productos fueron retirados del catálogo.');
      }, 0);
    }

    return validItems;
  }, [cartRefs, productsData]);

  const addToCart = (item: Omit<CartItem, 'quantity' | 'inStock'>, quantity = 1) => {
    setCartRefs(prev => {
      const existing = prev.find(p => p.id === item.id);
      if (existing) {
        return prev.map(p => p.id === item.id ? { ...p, quantity: p.quantity + quantity } : p);
      }
      return [...prev, { id: item.id, quantity }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (id: string) => {
    setCartRefs(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    setCartRefs(prev => prev.map(item => item.id === id ? { ...item, quantity } : item));
  };

  const clearCart = () => {
    setCartRefs([]);
  };

  const removeUnavailableItems = () => {
    const availableIds = new Set(enrichedCartItems.filter(i => i.inStock).map(i => i.id));
    setCartRefs(prev => prev.filter(r => availableIds.has(r.id)));
  };

  const totalItems = enrichedCartItems.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = enrichedCartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const canCheckout = enrichedCartItems.length > 0 && enrichedCartItems.every(item => item.inStock);

  return (
    <CartContext.Provider value={{
      cartItems: enrichedCartItems, 
      addToCart, 
      removeFromCart, 
      updateQuantity, 
      clearCart, 
      removeUnavailableItems,
      totalItems, 
      subtotal, 
      canCheckout,
      isCartOpen, 
      setIsCartOpen
    }}>
      {children}
      <Snackbar open={!!toastMsg} autoHideDuration={5000} onClose={() => setToastMsg('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setToastMsg('')} severity="info" sx={{ width: '100%', borderRadius: 0, boxShadow: 3 }}>
          {toastMsg}
        </Alert>
      </Snackbar>
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
