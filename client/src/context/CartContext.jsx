import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const CartContext = createContext(null);
const KEY = 'swiftcloud_cart';

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(raw) ? raw : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(items));
  }, [items]);

  function add(plan, quantity = 1) {
    setItems((prev) => {
      const existing = prev.find((i) => i.plan.id === plan.id);
      if (existing) {
        return prev.map((i) => (i.plan.id === plan.id ? { ...i, quantity: Math.min(5, i.quantity + quantity) } : i));
      }
      return [...prev, { plan, quantity: Math.min(5, Math.max(1, quantity)) }];
    });
  }

  function remove(planId) {
    setItems((prev) => prev.filter((i) => i.plan.id !== planId));
  }

  function setQuantity(planId, quantity) {
    const q = Math.min(5, Math.max(1, Number(quantity) || 1));
    setItems((prev) => prev.map((i) => (i.plan.id === planId ? { ...i, quantity: q } : i)));
  }

  function clear() { setItems([]); }

  const count = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);
  const subtotal = useMemo(() => items.reduce((sum, i) => sum + i.plan.price_cents * i.quantity, 0), [items]);

  return (
    <CartContext.Provider value={{ items, add, remove, setQuantity, clear, count, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
