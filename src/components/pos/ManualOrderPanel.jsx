import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import FullMenu from '../customer/FullMenu';
import CartDrawer from '../customer/CartDrawer';
import { ShoppingCart } from 'lucide-react';

const ManualOrderPanel = ({ preselectedTable, existingOrder, onOrderCompleted }) => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [globalSettings, setGlobalSettings] = useState({});
  const [loading, setLoading] = useState(true);
  
  const [cart, setCart] = useState([]);
  // No need for isCartOpen state as cart will be permanently visible inline
  
  // Set default orderType based on props
  const [orderType, setOrderType] = useState(preselectedTable || existingOrder ? 'dine_in' : 'dine_in');

  // Load existing order items into cart if editing
  useEffect(() => {
    if (existingOrder && existingOrder.items) {
      setCart(existingOrder.items.map((item, index) => ({
        ...item,
        id: item.productId || item.id,
        cartItemId: item.cartItemId || `existing_${index}_${Date.now()}`
      })));
      setOrderType(existingOrder.orderType || 'dine_in');
    }
  }, [existingOrder]);

  useEffect(() => {
    setLoading(true);
    
    const unsubProducts = onSnapshot(collection(db, 'products'), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a,b) => (a.order || 0) - (b.order || 0));
      setProducts(data);
    });

    const unsubCategories = onSnapshot(collection(db, 'categories'), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a,b) => (a.order || 0) - (b.order || 0));
      setCategories(data);
    });

    const unsubSettings = onSnapshot(collection(db, 'settings'), (snap) => {
      const settingsData = snap.docs.find(d => d.id === 'general')?.data() || {};
      setGlobalSettings(settingsData);
      setLoading(false);
    });

    return () => {
      unsubProducts();
      unsubCategories();
      unsubSettings();
    };
  }, []);

  const addToCart = (productToAdd, openCart = true) => {
    setCart((prev) => {
      const existing = prev.find(item => item.cartItemId === productToAdd.cartItemId);
      if (existing) {
        return prev.map(item => 
          item.cartItemId === productToAdd.cartItemId ? { ...item, quantity: item.quantity + productToAdd.quantity } : item
        );
      }
      return [...prev, productToAdd];
    });
    // Removed openCart logic as cart is always visible
  };

  const updateQuantity = (cartItemId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.cartItemId === cartItemId) {
        const newQuantity = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const emptyCart = () => setCart([]);

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-gray-500">Cargando menú...</div>;
  }

  return (
    <div className="flex h-full overflow-hidden bg-gray-50 rounded-2xl border border-gray-200">
      {/* Columna Central: Menú con Categorías */}
      <div className="flex-1 h-full relative">
        <FullMenu 
          categories={categories} 
          products={products} 
          onAdd={addToCart}
          isPosMode={true}
          isTableMode={!!preselectedTable || !!existingOrder}
        />
      </div>

      {/* Columna Derecha: Ticket / Carrito */}
      <div className="w-[450px] flex-shrink-0 h-full border-l border-gray-200 bg-white">
        <CartDrawer 
          isOpen={true} 
          isInline={true}
          onClose={() => {}} // No-op since it's always open
          cart={cart}
          onUpdateQuantity={updateQuantity}
          onEmptyCart={emptyCart}
          globalSettings={globalSettings}
          orderType={orderType}
          setOrderType={setOrderType}
          isPosMode={true}
          preselectedTable={preselectedTable}
          existingOrder={existingOrder}
          onOrderCompleted={onOrderCompleted}
        />
      </div>
    </div>
  );
};

export default ManualOrderPanel;
